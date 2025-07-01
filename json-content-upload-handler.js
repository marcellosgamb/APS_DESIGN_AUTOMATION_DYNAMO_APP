// json-content-upload-handler.js - Handler for uploading JSON content to bucket
// Matches reference implementation for uploading converted Dynamo JSON

require('dotenv').config();
const axios = require('axios');

// CONFIGURATION
const APS_CLIENT_ID = process.env.APS_CLIENT_ID;
const APS_CLIENT_SECRET = process.env.APS_CLIENT_SECRET;
const APS_BUCKET_NAME = process.env.APS_BUCKET_NAME;

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
    
    if (io && socketId) {
        io.to(socketId).emit('status', { message: `${objectName} uploaded successfully.` });
    }
}

// Main JSON content upload handler
const jsonContentUploadHandler = async (req, res) => {
    const { socketId, jsonContent } = req.body;
    const io = req.app.get('io');
    
    if (!jsonContent) {
        return res.status(400).json({ error: 'No JSON content provided' });
    }

    if (!socketId) {
        return res.status(400).json({ error: 'socketId is required for real-time updates' });
    }

    try {
        const headers = await getHeaders();
        
        if (io) {
            io.to(socketId).emit('status', { message: '--- Step: UPLOAD JSON CONTENT ---' });
            io.to(socketId).emit('status', { message: 'Uploading run.json to bucket...' });
        }
        
        // Upload run.json using signed URL
        await uploadJsonWithSignedUrl(
            headers,
            APS_BUCKET_NAME,
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
        if (io && socketId) {
            io.to(socketId).emit('status', { message: `--- ERROR ---<br/>${message}` });
        }
        res.status(err.response?.status || 500).json({
            error: 'Failed to upload JSON content.',
            details: err.response?.data || message
        });
    }
};

module.exports = jsonContentUploadHandler; 