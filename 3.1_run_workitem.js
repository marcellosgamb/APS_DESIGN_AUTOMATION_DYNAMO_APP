// 3.1_run_workitem.js - COMPLETE SELF-CONTAINED SERVER
// Educational Purpose: Learn how to create and execute workitems in APS Design Automation
// Based on REFERENCE implementation for guaranteed compatibility

require('dotenv').config();
const express = require('express');
const axios = require('axios');

// CONFIGURATION - Get your app credentials from .env file
// .env file should contain: APS_CLIENT_ID="your_client_id_here"
const APS_CLIENT_ID = process.env.APS_CLIENT_ID;
// .env file should contain: APS_CLIENT_SECRET="your_client_secret_here" 
const APS_CLIENT_SECRET = process.env.APS_CLIENT_SECRET;
// .env file should contain: APS_BUCKET_NAME="your_bucket_name_here"
const APS_BUCKET_NAME = process.env.APS_BUCKET_NAME;
// .env file should contain: APS_NICKNAME="your_nickname_here"
const APS_NICKNAME = process.env.APS_NICKNAME;
// .env file should contain: APS_ACTIVITY_NAME="your_activity_name_here"
const APS_ACTIVITY_NAME = process.env.APS_ACTIVITY_NAME;
// .env file should contain: PORT=XXXX (set your desired port)
const PORT = process.env.PORT;

// Constants matching reference implementation
const RUN_REQ_FILE = 'run.json';
const PYTHON_FILE = 'pythonDependencies.zip';
const PACKAGES_FILE = 'packages.zip';
const RESULT_FILE = 'result.json';
const RVT_RESULT_FILE = 'result.rvt';
const ACTIVITY_ALIAS = 'default';

// START TOKEN MANAGEMENT SECTION
async function getAutodeskToken() {
    console.log('Getting authentication token from Autodesk...');
    
    const tokenRequestBody = new URLSearchParams({
        'grant_type': 'client_credentials',
        'scope': 'bucket:create bucket:read bucket:delete data:read data:write code:all'
    });
    
    const base64Credentials = Buffer.from(`${APS_CLIENT_ID}:${APS_CLIENT_SECRET}`).toString('base64');
    const tokenHeaders = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${base64Credentials}`
    };
    
    try {
        const response = await axios.post('https://developer.api.autodesk.com/authentication/v2/token', tokenRequestBody, { headers: tokenHeaders });
        console.log('Token received successfully');
        return response.data.access_token;
    } catch (error) {
        console.log('Failed to get token:', error.message);
        throw new Error('Could not get authentication token from Autodesk');
    }
}

async function getHeaders() {
    const token = await getAutodeskToken();
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}
// END TOKEN MANAGEMENT SECTION

// Helper function to check if a file exists in the bucket (matching reference)
async function checkFileExists(headers, bucketName, objectName) {
    try {
        await axios.head(`https://developer.api.autodesk.com/oss/v2/buckets/${bucketName}/objects/${objectName}`, { headers });
        return true;
    } catch (err) {
        return false;
    }
}

// MAIN ROUTE HANDLER - Export this for use in server.js
const runWorkitemHandler = async (req, res) => {
    console.log('Starting operation: Run Workitem');
    
    // DEBUG: Log environment variables
    console.log('DEBUG Environment Variables:');
    console.log(`APS_NICKNAME: "${APS_NICKNAME}"`);
    console.log(`APS_ACTIVITY_NAME: "${APS_ACTIVITY_NAME}"`);
    console.log(`APS_BUCKET_NAME: "${APS_BUCKET_NAME}"`);
    
    try {
        // Step 1: Get authentication headers
        console.log('Step 1: Getting authentication token');
        const headers = await getHeaders();
        
        // Step 2: Check if packages.zip exists in the bucket (matching reference)
        console.log('Step 2: Checking for optional packages in bucket');
        const packagesExists = await checkFileExists(headers, APS_BUCKET_NAME, PACKAGES_FILE);
        console.log(`Packages file exists: ${packagesExists}`);
        
        // Step 3: Create workitem (exactly matching reference structure)
        console.log('Step 3: Creating workitem');
        const activityId = `${APS_NICKNAME}.${APS_ACTIVITY_NAME}+${ACTIVITY_ALIAS}`;
        console.log(`DEBUG: Constructed activityId: "${activityId}"`);
        
        const workitemData = {
            activityId: activityId,
            arguments: {
                rvtFile: {
                    url: `urn:adsk.objects:os.object:${APS_BUCKET_NAME}/run.rvt`,
                    verb: "get",
                    headers: {
                        Authorization: headers.Authorization
                    }
                },
                runRequest: {
                    url: `urn:adsk.objects:os.object:${APS_BUCKET_NAME}/${RUN_REQ_FILE}`,
                    verb: "get",
                    headers: {
                        Authorization: headers.Authorization
                    }
                },
                pythonLibs: {
                    url: `urn:adsk.objects:os.object:${APS_BUCKET_NAME}/${PYTHON_FILE}`,
                    verb: "get",
                    headers: {
                        Authorization: headers.Authorization
                    }
                },
                dynResult: {
                    url: `urn:adsk.objects:os.object:${APS_BUCKET_NAME}/${RESULT_FILE}`,
                    verb: "put",
                    headers: {
                        Authorization: headers.Authorization
                    }
                },
                rvtResult: {
                    url: `urn:adsk.objects:os.object:${APS_BUCKET_NAME}/${RVT_RESULT_FILE}`,
                    verb: "put",
                    headers: {
                        Authorization: headers.Authorization
                    }
                }
            }
        };

        // Only add packages if the file exists in the bucket (exactly matching reference)
        if (packagesExists) {
            workitemData.arguments.packages = {
                url: `urn:adsk.objects:os.object:${APS_BUCKET_NAME}/${PACKAGES_FILE}`,
                verb: "get",
                headers: {
                    Authorization: headers.Authorization
                }
            };
            console.log(`Including ${PACKAGES_FILE} in workitem arguments`);
        } else {
            console.log(`Skipping ${PACKAGES_FILE} - file not found in bucket`);
        }
        
        console.log(`Creating workitem with activity: ${activityId}`);
        const workitemResponse = await axios.post('https://developer.api.autodesk.com/da/us-east/v3/workitems', workitemData, { headers });
        const workitemId = workitemResponse.data.id;
        
        console.log(`Workitem created with ID: ${workitemId}`);
        console.log('Workitem is being processed...');
        
        // Step 4: Poll for workitem status (matching reference timing)
        console.log('Step 4: Polling workitem status');
        let status = 'pending';
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes with 5-second intervals
        
        while (status === 'pending' || status === 'inprogress') {
            if (attempts >= maxAttempts) {
                throw new Error('Workitem timed out after 5 minutes');
            }
            
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
            
            const statusResponse = await axios.get(`https://developer.api.autodesk.com/da/us-east/v3/workitems/${workitemId}`, { headers });
            status = statusResponse.data.status;
            
            console.log(`Workitem status: ${status}`);
            attempts++;
        }
        
        console.log('Operation completed');
        
        // Step 5: Send response based on final status (matching reference format)
        if (status === 'success') {
            console.log('Workitem completed successfully!');
            console.log(`Result file available as: ${RESULT_FILE}`);
            
            res.status(200).json({ 
                success: true,
                operation: 'Run Workitem',
                message: 'Workitem completed successfully',
                details: {
                    workitemId: workitemId,
                    status: status,
                    resultFile: RESULT_FILE,
                    activity_id: activityId,
                    bucket_name: APS_BUCKET_NAME
                },
                timestamp: new Date().toISOString()
            });
        } else {
            const errorMessage = `Workitem failed with status: ${status}`;
            console.log(`--- ERROR --- ${errorMessage}`);
            
            res.status(500).json({
                success: false,
                operation: 'Run Workitem',
                error: errorMessage,
                details: {
                    workitemId: workitemId,
                    status: status,
                    activity_id: activityId
                },
                timestamp: new Date().toISOString()
            });
        }
        
    } catch (error) {
        const message = error.response ? JSON.stringify(error.response.data, null, 2) : error.message;
        console.log('Operation failed:', message);
        
        res.status(error.response?.status || 500).json({
            success: false,
            operation: 'Run Workitem',
            error: 'Failed to create/execute workitem',
            details: error.response?.data || message,
            timestamp: new Date().toISOString()
        });
    }
};

// Export the handler for use in server.js
module.exports = runWorkitemHandler;

// EDUCATIONAL: If this file is run directly (not imported), start standalone server
if (require.main === module) {
    const app = express();
    
    // Parse JSON requests
    app.use(express.json());
    
    // Enable CORS for frontend calls
    app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        if (req.method === 'OPTIONS') {
            return res.sendStatus(200);
        }
        next();
    });
    
    // Set up the route
    app.post('/run-workitem', runWorkitemHandler);
    
    // Start the educational server for Run Workitem
    app.listen(PORT, () => {
        console.log(`🚀 EDUCATIONAL SERVER: Run Workitem`);
        console.log(`📡 Running on: http://localhost:${PORT}`);
        console.log(`🎯 Endpoint: POST /run-workitem`);
        console.log(`📚 This server demonstrates how to execute Design Automation workitems`);
        console.log(`🔍 Study this file to learn the complete workflow!\n`);
    });
} 