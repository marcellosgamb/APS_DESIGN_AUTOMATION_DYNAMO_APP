const express = require('express');
const axios = require('axios');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const { getHeaders, urnify, translateObject } = require('../services/aps.js');
const { DA_CONFIG, OSS_BASE_URL, PYTHON_FILE, PACKAGES_FILE, RUN_REQ_FILE, DYN_FILE, RESULT_FILE, RVT_RESULT_FILE } = require('../config.js');

let router = express.Router();

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Helper function to upload file using signed URL
async function uploadFileWithSignedUrl(headers, bucketName, objectName, filePath, contentType, io, socketId) {
    // Step 1: Get signed upload URL
    const signedUrlResponse = await axios.get(
        `https://developer.api.autodesk.com/oss/v2/buckets/${bucketName}/objects/${objectName}/signeds3upload`,
        { headers }
    );
    
    const uploadData = signedUrlResponse.data;
    
    // Step 2: Upload file to signed URL
    const fileBuffer = await fs.readFile(filePath);
    await axios.put(uploadData.urls[0], fileBuffer, {
        headers: {
            'Content-Type': contentType
        }
    });
    
    // Step 3: Complete the upload
    const completeResponse = await axios.post(
        `https://developer.api.autodesk.com/oss/v2/buckets/${bucketName}/objects/${objectName}/signeds3upload`,
        { uploadKey: uploadData.uploadKey },
        { headers }
    );
    
    io.to(socketId).emit('status', { message: `${objectName} uploaded successfully.` });
    
    // Return the object information
    return {
        objectId: completeResponse.data.objectId,
        objectKey: completeResponse.data.objectKey,
        urn: urnify(completeResponse.data.objectId)
    };
}

// Helper function to upload JSON content using signed URL
async function uploadJsonWithSignedUrl(headers, bucketName, objectName, jsonContent, io, socketId) {
    // Step 1: Get signed upload URL
    const signedUrlResponse = await axios.get(
        `https://developer.api.autodesk.com/oss/v2/buckets/${bucketName}/objects/${objectName}/signeds3upload`,
        { headers }
    );
    
    const uploadData = signedUrlResponse.data;
    
    // Step 2: Upload JSON to signed URL
    await axios.put(uploadData.urls[0], jsonContent, {
        headers: {
            'Content-Type': 'application/json'
        }
    });
    
    // Step 3: Complete the upload
    await axios.post(
        `https://developer.api.autodesk.com/oss/v2/buckets/${bucketName}/objects/${objectName}/signeds3upload`,
        { uploadKey: uploadData.uploadKey },
        { headers }
    );
    
    io.to(socketId).emit('status', { message: `${objectName} uploaded successfully.` });
}

// POST /api/aps/upload/single - Upload individual files using signed URLs
router.post('/single', upload.single('file'), async (req, res) => {
    const { socketId, fileType } = req.body;
    const io = req.app.get('io');
    
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    
    if (!fileType) {
        return res.status(400).json({ error: 'fileType is required' });
    }

    try {
        const headers = await getHeaders();
        const fileName = req.file.originalname;
        const filePath = req.file.path;
        
        io.to(socketId).emit('status', { message: `--- Step: UPLOAD ${fileType.toUpperCase()} FILE ---` });
        
        let objectName;
        let contentType;
        
        // Map file types to object names and content types
        switch (fileType) {
            case 'python':
                objectName = PYTHON_FILE;
                contentType = 'application/zip';
                break;
            case 'rvt':
                objectName = fileName;  // Use original filename - user must rename to run.rvt
                contentType = 'application/octet-stream';
                break;
            case 'dynamo':
                // Validate that the Dynamo file is named run.dyn
                if (fileName !== DYN_FILE) {
                    throw new Error(`Dynamo file must be named "${DYN_FILE}". Please rename your file and upload again.`);
                }
                objectName = fileName;
                contentType = 'application/octet-stream';
                break;
            case 'json':
                objectName = RUN_REQ_FILE;
                contentType = 'application/json';
                break;
            case 'packages':
                objectName = PACKAGES_FILE;
                contentType = 'application/zip';
                break;
            default:
                throw new Error(`Unknown file type: ${fileType}`);
        }
        
        io.to(socketId).emit('status', { message: `Uploading ${objectName} to bucket '${DA_CONFIG.BUCKET_NAME}'...` });
        
        const uploadResult = await uploadFileWithSignedUrl(
            headers, 
            DA_CONFIG.BUCKET_NAME, 
            objectName, 
            filePath, 
            contentType,
            io,
            socketId
        );
        
        const response = { 
            message: `${fileType} file uploaded successfully`,
            fileName: objectName,
            fileType: fileType
        };
        
        // For RVT files, include URN for viewer and start translation
        if (fileType === 'rvt') {
            response.objectId = uploadResult.objectId;
            response.urn = uploadResult.urn;
            
            // Start translation immediately like the reference sample
            io.to(socketId).emit('status', { message: `Starting model translation for viewer...` });
            try {
                await translateObject(uploadResult.urn);
                io.to(socketId).emit('status', { message: `Model translation started successfully.` });
            } catch (translateErr) {
                io.to(socketId).emit('status', { message: `Warning: Could not start translation: ${translateErr.message}` });
            }
        }
        
        res.status(200).json(response);

    } catch (err) {
        const message = err.response ? JSON.stringify(err.response.data, null, 2) : err.message;
        io.to(socketId).emit('status', { message: `--- ERROR ---<br/>${message}` });
        res.status(err.response?.status || 500).json({
            error: `Failed to upload ${fileType} file.`,
            details: err.response?.data || message
        });
    } finally {
        // Clean up temporary file
        if (req.file && req.file.path) {
            try { await fs.remove(req.file.path); } catch (e) {}
        }
    }
});

// POST /api/aps/convert/dyn-to-json-preview - Convert Dynamo file to JSON and show content (no upload)
router.post('/dyn-to-json-preview', upload.single('dynFile'), async (req, res) => {
    const { socketId } = req.body;
    const io = req.app.get('io');
    
    if (!req.file) {
        return res.status(400).json({ error: 'No Dynamo file uploaded' });
    }

    // Validate that the Dynamo file is named run.dyn
    if (req.file.originalname !== DYN_FILE) {
        return res.status(400).json({ 
            error: `Dynamo file must be named "${DYN_FILE}". Please rename your file and upload again.` 
        });
    }

    try {
        io.to(socketId).emit('status', { message: '--- Step: CONVERT DYNAMO TO JSON ---' });
        io.to(socketId).emit('status', { message: `Reading Dynamo file: ${req.file.originalname}` });
        
        // Read the Dynamo file content
        const dynContent = await fs.readFile(req.file.path, 'utf8');
        
        // Parse the Dynamo file to ensure it's valid JSON
        let dynData;
        try {
            dynData = JSON.parse(dynContent);
        } catch (parseErr) {
            throw new Error('Invalid Dynamo file format. File must be valid JSON.');
        }
        
        // Create the run.json structure expected by Dynamo Player
        const runJson = {
            "target": {
                "type": "JsonGraphTarget",
                "contents": dynContent
            },
            "inputs": []
        };
        
        const jsonContent = JSON.stringify(runJson, null, 2);
        
        io.to(socketId).emit('status', { message: 'Dynamo file converted to JSON format successfully.' });
        io.to(socketId).emit('status', { message: 'JSON content is ready for upload.' });
        
        res.status(200).json({ 
            message: 'Dynamo file converted to JSON successfully',
            originalFile: req.file.originalname,
            jsonContent: jsonContent
        });

    } catch (err) {
        const message = err.response ? JSON.stringify(err.response.data, null, 2) : err.message;
        io.to(socketId).emit('status', { message: `--- ERROR ---<br/>${message}` });
        res.status(err.response?.status || 500).json({
            error: 'Failed to convert Dynamo to JSON.',
            details: err.response?.data || message
        });
    } finally {
        // Clean up temporary file
        if (req.file && req.file.path) {
            try { await fs.remove(req.file.path); } catch (e) {}
        }
    }
});

// POST /api/aps/upload/json-content - Upload JSON content directly
router.post('/json-content', async (req, res) => {
    const { socketId, jsonContent } = req.body;
    const io = req.app.get('io');
    
    if (!jsonContent) {
        return res.status(400).json({ error: 'No JSON content provided' });
    }

    try {
        const headers = await getHeaders();
        
        io.to(socketId).emit('status', { message: '--- Step: UPLOAD JSON CONTENT ---' });
        io.to(socketId).emit('status', { message: 'Uploading run.json to bucket...' });
        
        // Upload run.json using signed URL
        await uploadJsonWithSignedUrl(
            headers,
            DA_CONFIG.BUCKET_NAME,
            'run.json',
            jsonContent,
            io,
            socketId
        );
        
        res.status(200).json({ 
            message: 'JSON content uploaded successfully as run.json',
            fileName: 'run.json'
        });

    } catch (err) {
        const message = err.response ? JSON.stringify(err.response.data, null, 2) : err.message;
        io.to(socketId).emit('status', { message: `--- ERROR ---<br/>${message}` });
        res.status(err.response?.status || 500).json({
            error: 'Failed to upload JSON content.',
            details: err.response?.data || message
        });
    }
});

// POST /api/aps/convert/dyn-to-json - Convert Dynamo file to JSON and upload (LEGACY - keeping for backward compatibility)
router.post('/convert/dyn-to-json', upload.single('dynFile'), async (req, res) => {
    const { socketId } = req.body;
    const io = req.app.get('io');
    
    if (!req.file) {
        return res.status(400).json({ error: 'No Dynamo file uploaded' });
    }

    // Validate that the Dynamo file is named run.dyn
    if (req.file.originalname !== DYN_FILE) {
        return res.status(400).json({ 
            error: `Dynamo file must be named "${DYN_FILE}". Please rename your file and upload again.` 
        });
    }

    try {
        const headers = await getHeaders();
        
        io.to(socketId).emit('status', { message: '--- Step: CONVERT DYNAMO TO JSON ---' });
        io.to(socketId).emit('status', { message: `Reading Dynamo file: ${req.file.originalname}` });
        
        // Read the Dynamo file content
        const dynContent = await fs.readFile(req.file.path, 'utf8');
        
        // Parse the Dynamo file to ensure it's valid JSON
        let dynData;
        try {
            dynData = JSON.parse(dynContent);
        } catch (parseErr) {
            throw new Error('Invalid Dynamo file format. File must be valid JSON.');
        }
        
        // Create the run.json structure expected by Dynamo Player
        const runJson = {
            "script": dynContent
        };
        
        io.to(socketId).emit('status', { message: 'Converting to run.json format...' });
        io.to(socketId).emit('status', { message: 'Uploading run.json to bucket...' });
        
        // Upload run.json using signed URL
        await uploadJsonWithSignedUrl(
            headers,
            DA_CONFIG.BUCKET_NAME,
            RUN_REQ_FILE,
            JSON.stringify(runJson),
            io,
            socketId
        );
        
        res.status(200).json({ 
            message: 'Dynamo file converted to JSON and uploaded successfully',
            fileName: RUN_REQ_FILE,
            originalFile: req.file.originalname
        });

    } catch (err) {
        const message = err.response ? JSON.stringify(err.response.data, null, 2) : err.message;
        io.to(socketId).emit('status', { message: `--- ERROR ---<br/>${message}` });
        res.status(err.response?.status || 500).json({
            error: 'Failed to convert Dynamo to JSON.',
            details: err.response?.data || message
        });
    } finally {
        // Clean up temporary file
        if (req.file && req.file.path) {
            try { await fs.remove(req.file.path); } catch (e) {}
        }
    }
});

// POST /api/aps/upload - Upload files to bucket using signed URLs (LEGACY - keeping for backward compatibility)
router.post('/', upload.fields([{ name: 'rvtFile' }, { name: 'dynFile' }]), async (req, res) => {
    const { socketId } = req.body;
    const io = req.app.get('io');
    const { rvtFile, dynFile } = req.files;
    
    if (!rvtFile || !dynFile) {
        return res.status(400).json({ error: 'Missing input files. Both RVT and DYN files are required.' });
    }

    const rvtFileName = rvtFile[0].originalname;
    
    try {
        const headers = await getHeaders();
        
        io.to(socketId).emit('status', { message: '--- Step: UPLOAD FILES ---' });
        
        // 1. Upload the RVT file using signed URL
        io.to(socketId).emit('status', { message: `Uploading ${rvtFileName} to bucket '${DA_CONFIG.BUCKET_NAME}'...` });
        await uploadFileWithSignedUrl(
            headers, 
            DA_CONFIG.BUCKET_NAME, 
            rvtFileName, 
            rvtFile[0].path, 
            'application/octet-stream',
            io,
            socketId
        );
        
        // 2. Upload the Dynamo file as-is (no automatic conversion)
        io.to(socketId).emit('status', { message: `Uploading Dynamo file: ${dynFile[0].originalname}...` });
        await uploadFileWithSignedUrl(
            headers, 
            DA_CONFIG.BUCKET_NAME, 
            dynFile[0].originalname, 
            dynFile[0].path, 
            'application/octet-stream',
            io,
            socketId
        );
        
        // 3. Upload pythonDependencies.zip if it exists
        const pythonDepsPath = path.resolve(__dirname, '..', '..', PYTHON_FILE);
        if (fs.existsSync(pythonDepsPath)) {
            io.to(socketId).emit('status', { message: `Uploading ${PYTHON_FILE}...` });
            await uploadFileWithSignedUrl(
                headers,
                DA_CONFIG.BUCKET_NAME,
                PYTHON_FILE,
                pythonDepsPath,
                'application/zip',
                io,
                socketId
            );
        } else {
            io.to(socketId).emit('status', { message: `Warning: ${PYTHON_FILE} not found. This may cause issues with Python nodes in Dynamo.` });
        }
        
        io.to(socketId).emit('status', { message: 'All input files uploaded successfully.' });
        
        res.status(200).json({ 
            message: 'Files uploaded successfully',
            rvtFileName: rvtFileName,
            dynFileName: dynFile[0].originalname,
            pythonDepsUploaded: fs.existsSync(pythonDepsPath)
        });

    } catch (err) {
        const message = err.response ? JSON.stringify(err.response.data, null, 2) : err.message;
        io.to(socketId).emit('status', { message: `--- ERROR ---<br/>${message}` });
        res.status(err.response?.status || 500).json({
            error: 'Failed to upload files.',
            details: err.response?.data || message
        });
    } finally {
        // Clean up temporary files
        if (rvtFile && rvtFile.length > 0) {
            try { await fs.remove(rvtFile[0].path); } catch (e) {}
        }
        if (dynFile && dynFile.length > 0) {
            try { await fs.remove(dynFile[0].path); } catch (e) {}
        }
    }
});

// GET /api/aps/upload - Get objects in bucket
router.get('/', async (req, res) => {
    try {
        const headers = await getHeaders();
        const response = await axios.get(`https://developer.api.autodesk.com/oss/v2/buckets/${DA_CONFIG.BUCKET_NAME}/objects`, { headers });
        res.status(200).json(response.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/aps/download/result-json - Download result.json file
router.get('/download/result-json', async (req, res) => {
    try {
        const headers = await getHeaders();
        
        // Generate signed download URL for result.json
        const response = await axios.get(
            `${OSS_BASE_URL}/buckets/${DA_CONFIG.BUCKET_NAME}/objects/${RESULT_FILE}/signeds3download`,
            { headers }
        );
        
        res.status(200).json({
            message: 'Download URL generated successfully',
            downloadUrl: response.data.url,
            fileName: RESULT_FILE
        });
        
    } catch (err) {
        res.status(err.response?.status || 500).json({
            error: `Failed to generate download URL for ${RESULT_FILE}`,
            details: err.response?.data || err.message
        });
    }
});

// GET /api/aps/download/result-rvt - Download result.rvt file
router.get('/download/result-rvt', async (req, res) => {
    try {
        const headers = await getHeaders();
        
        // Generate signed download URL for result.rvt
        const response = await axios.get(
            `${OSS_BASE_URL}/buckets/${DA_CONFIG.BUCKET_NAME}/objects/${RVT_RESULT_FILE}/signeds3download`,
            { headers }
        );
        
        res.status(200).json({
            message: 'Download URL generated successfully',
            downloadUrl: response.data.url,
            fileName: RVT_RESULT_FILE
        });
        
    } catch (err) {
        res.status(err.response?.status || 500).json({
            error: `Failed to generate download URL for ${RVT_RESULT_FILE}`,
            details: err.response?.data || err.message
        });
    }
});

module.exports = router; 