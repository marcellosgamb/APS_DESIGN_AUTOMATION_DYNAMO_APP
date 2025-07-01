// unified-upload-handler.js - Unified file upload handler matching reference implementation
// Handles all file uploads (python, rvt, dynamo, packages) with Socket.IO real-time updates

require('dotenv').config();
const axios = require('axios');
const fs = require('fs-extra');

// CONFIGURATION
const APS_CLIENT_ID = process.env.APS_CLIENT_ID;
const APS_CLIENT_SECRET = process.env.APS_CLIENT_SECRET;
const APS_BUCKET_NAME = process.env.APS_BUCKET_NAME;

// File name constants matching reference implementation
const PYTHON_FILE = 'pythonDependencies.zip';
const PACKAGES_FILE = 'packages.zip';
const RUN_REQ_FILE = 'run.json';
const DYN_FILE = 'run.dyn';
const RESULT_FILE = 'result.json';
const RVT_RESULT_FILE = 'result.rvt';

// Token management functions
async function getAutodeskToken() {
    const tokenRequestBody = new URLSearchParams({
        'grant_type': 'client_credentials',
        'scope': 'bucket:create bucket:read bucket:delete data:read data:write code:all'
    });
    
    const base64Credentials = Buffer.from(`${APS_CLIENT_ID}:${APS_CLIENT_SECRET}`).toString('base64');
    const tokenHeaders = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${base64Credentials}`
    };
    
    const response = await axios.post('https://developer.api.autodesk.com/authentication/v2/token', tokenRequestBody, { headers: tokenHeaders });
    return response.data.access_token;
}

async function getHeaders() {
    const token = await getAutodeskToken();
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// Helper function to create URN
function urnify(objectId) {
    return Buffer.from(objectId).toString('base64').replace(/=/g, '');
}

// Helper function to start model translation
async function translateObject(urn) {
    const headers = await getHeaders();
    
    const translationRequest = {
        input: {
            urn: urn
        },
        output: {
            formats: [
                {
                    type: "svf2",
                    views: ["2d", "3d"]
                }
            ]
        }
    };
    
    await axios.post('https://developer.api.autodesk.com/modelderivative/v2/designdata/job', translationRequest, { headers });
}

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

// Main upload handler
const unifiedUploadHandler = async (req, res) => {
    const { socketId, fileType } = req.body;
    const io = req.app.get('io');
    
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    
    if (!fileType) {
        return res.status(400).json({ error: 'fileType is required' });
    }

    if (!socketId) {
        return res.status(400).json({ error: 'socketId is required for real-time updates' });
    }

    try {
        const headers = await getHeaders();
        const fileName = req.file.originalname;
        const filePath = req.file.path;
        
        io.to(socketId).emit('status', { message: `--- Step: UPLOAD ${fileType.toUpperCase()} FILE ---` });
        
        let objectName;
        let contentType;
        
        // Map file types to object names and content types (matching reference)
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
        
        io.to(socketId).emit('status', { message: `Uploading ${objectName} to bucket '${APS_BUCKET_NAME}'...` });
        
        const uploadResult = await uploadFileWithSignedUrl(
            headers, 
            APS_BUCKET_NAME, 
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
};

module.exports = unifiedUploadHandler; 