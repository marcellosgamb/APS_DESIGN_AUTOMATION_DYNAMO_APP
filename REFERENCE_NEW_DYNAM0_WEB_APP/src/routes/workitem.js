const express = require('express');
const axios = require('axios');
const { getHeaders } = require('../services/aps.js');
const { DA_BASE_URL, DA_CONFIG, RUN_REQ_FILE, PYTHON_FILE, PACKAGES_FILE, RESULT_FILE, RVT_RESULT_FILE } = require('../config.js');

let router = express.Router();

// Helper function to check if a file exists in the bucket
async function checkFileExists(headers, bucketName, objectName) {
    try {
        await axios.head(`https://developer.api.autodesk.com/oss/v2/buckets/${bucketName}/objects/${objectName}`, { headers });
        return true;
    } catch (err) {
        return false;
    }
}

// POST /api/aps/workitem - Create and execute a workitem
router.post('/', async (req, res) => {
    const { socketId, rvtFileName, hasPackages } = req.body;
    const io = req.app.get('io');
    
    try {
        if (!rvtFileName) {
            return res.status(400).json({ error: 'rvtFileName is required' });
        }
        
        // Validate that the RVT file is named run.rvt
        if (rvtFileName !== 'run.rvt') {
            return res.status(400).json({ 
                error: 'RVT file must be named "run.rvt". Please rename your file and upload again.' 
            });
        }

        const headers = await getHeaders();
        
        // Check if packages.zip exists in the bucket
        const packagesExists = await checkFileExists(headers, DA_CONFIG.BUCKET_NAME, PACKAGES_FILE);
        io.to(socketId).emit('status', { message: `Packages file exists: ${packagesExists}` });
        
        io.to(socketId).emit('status', { message: '--- Step: CREATE WORKITEM ---' });
        io.to(socketId).emit('status', { message: `Creating workitem for file '${rvtFileName}'...` });
        
        // Create the workitem
        const workitemData = {
            activityId: `${DA_CONFIG.NICKNAME}.${DA_CONFIG.ACTIVITY_NAME}+${DA_CONFIG.ACTIVITY_ALIAS}`,
            arguments: {
                rvtFile: {
                    url: `urn:adsk.objects:os.object:${DA_CONFIG.BUCKET_NAME}/${rvtFileName}`,
                    verb: "get",
                    headers: {
                        Authorization: headers.Authorization
                    }
                },
                runRequest: {
                    url: `urn:adsk.objects:os.object:${DA_CONFIG.BUCKET_NAME}/${RUN_REQ_FILE}`,
                    verb: "get",
                    headers: {
                        Authorization: headers.Authorization
                    }
                },
                pythonLibs: {
                    url: `urn:adsk.objects:os.object:${DA_CONFIG.BUCKET_NAME}/${PYTHON_FILE}`,
                    verb: "get",
                    headers: {
                        Authorization: headers.Authorization
                    }
                },
                dynResult: {
                    url: `urn:adsk.objects:os.object:${DA_CONFIG.BUCKET_NAME}/${RESULT_FILE}`,
                    verb: "put",
                    headers: {
                        Authorization: headers.Authorization
                    }
                },
                rvtResult: {
                    url: `urn:adsk.objects:os.object:${DA_CONFIG.BUCKET_NAME}/${RVT_RESULT_FILE}`,
                    verb: "put",
                    headers: {
                        Authorization: headers.Authorization
                    }
                }
            }
        };

        // Only add packages if the file exists in the bucket
        if (packagesExists) {
            workitemData.arguments.packages = {
                url: `urn:adsk.objects:os.object:${DA_CONFIG.BUCKET_NAME}/${PACKAGES_FILE}`,
                verb: "get",
                headers: {
                    Authorization: headers.Authorization
                }
            };
            io.to(socketId).emit('status', { message: `Including ${PACKAGES_FILE} in workitem arguments.` });
        } else {
            io.to(socketId).emit('status', { message: `Skipping ${PACKAGES_FILE} - file not found in bucket.` });
        }
        
        const workitemResponse = await axios.post(`${DA_BASE_URL}/workitems`, workitemData, { headers });
        const workitemId = workitemResponse.data.id;
        
        io.to(socketId).emit('status', { message: `Workitem created with ID: ${workitemId}` });
        io.to(socketId).emit('status', { message: 'Workitem is being processed...' });
        
        // Poll for workitem status
        let status = 'pending';
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes with 5-second intervals
        
        while (status === 'pending' || status === 'inprogress') {
            if (attempts >= maxAttempts) {
                throw new Error('Workitem timed out after 5 minutes');
            }
            
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
            
            const statusResponse = await axios.get(`${DA_BASE_URL}/workitems/${workitemId}`, { headers });
            status = statusResponse.data.status;
            
            io.to(socketId).emit('status', { message: `Workitem status: ${status}` });
            attempts++;
        }
        
        if (status === 'success') {
            io.to(socketId).emit('status', { message: 'Workitem completed successfully!' });
            io.to(socketId).emit('status', { message: `Result file available as: ${RESULT_FILE}` });
            
            res.status(200).json({ 
                message: 'Workitem completed successfully',
                workitemId: workitemId,
                status: status,
                resultFile: RESULT_FILE
            });
        } else {
            const errorMessage = `Workitem failed with status: ${status}`;
            io.to(socketId).emit('status', { message: `--- ERROR ---<br/>${errorMessage}` });
            
            res.status(500).json({
                error: errorMessage,
                workitemId: workitemId,
                status: status
            });
        }

    } catch (err) {
        const message = err.response ? JSON.stringify(err.response.data, null, 2) : err.message;
        io.to(socketId).emit('status', { message: `--- ERROR ---<br/>${message}` });
        res.status(err.response?.status || 500).json({
            error: 'Failed to create/execute workitem.',
            details: err.response?.data || message
        });
    }
});

// GET /api/aps/workitem/:id - Get workitem status
router.get('/:id', async (req, res) => {
    try {
        const headers = await getHeaders();
        const workitemId = req.params.id;
        const response = await axios.get(`${DA_BASE_URL}/workitems/${workitemId}`, { headers });
        res.status(200).json(response.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router; 