// 2.5_upload_json_file.js - COMPLETE SELF-CONTAINED SERVER
// Educational Purpose: Learn how to upload JSON files programmatically to APS Object Storage Service

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');



// CONFIGURATION - Get your app credentials from .env file
const APS_CLIENT_ID = process.env.APS_CLIENT_ID;
const APS_CLIENT_SECRET = process.env.APS_CLIENT_SECRET;
const APS_BUCKET_NAME = process.env.APS_BUCKET_NAME;
const PORT = process.env.PORT;

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

async function createTokenHeader() {
    const token = await getAutodeskToken();
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}
// END TOKEN MANAGEMENT SECTION

// MAIN ROUTE HANDLER - Export this for use in server.js
const uploadJSONFileHandler = async (req, res) => {
    console.log('Starting operation: Upload JSON File');
    
    try {
        // Step 1: Create sample JSON data for demonstration
        console.log('Step 1: Creating sample JSON data');
        
        const sampleJsonData = {
            WorkflowName: "Dynamo Design Automation Sample",
            Description: "Sample JSON data for educational purposes",
            Parameters: {
                inputRevitFile: "run.rvt",
                inputDynamoFile: "run.dyn",
                outputFile: "result.rvt"
            },
            Settings: {
                engineVersion: "Autodesk.Revit+2026",
                timeout: 3600,
                logLevel: "verbose"
            },
            CreatedDate: new Date().toISOString(),
            CreatedBy: "Educational Example"
        };
        
        // Step 2: Get authentication token header
        console.log('Step 2: Getting authentication token');
        const tokenHeader = await createTokenHeader();
        
        // Step 3: Convert JSON to string for upload
        console.log('Step 3: Converting JSON to string');
        const jsonString = JSON.stringify(sampleJsonData, null, 2);
        const jsonBuffer = Buffer.from(jsonString, 'utf8');
        
        // Step 4: Upload to OSS bucket using signed URL (modern approach)
        const fileName = 'run.json'; // Design Automation expects this name
        console.log(`Step 4: Getting signed upload URL for: ${fileName}`);
        
        // Step 4a: Get signed upload URL
        const signedUrlResponse = await axios.get(
            `https://developer.api.autodesk.com/oss/v2/buckets/${APS_BUCKET_NAME}/objects/${fileName}/signeds3upload`,
            { headers: tokenHeader }
        );
        
        const uploadData = signedUrlResponse.data;
        console.log(`Step 4b: Uploading JSON to signed URL`);
        
        // Step 4b: Upload JSON to signed URL
        await axios.put(uploadData.urls[0], jsonBuffer, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`Step 4c: Completing upload`);
        
        // Step 4c: Complete the upload
        const response = await axios.post(
            `https://developer.api.autodesk.com/oss/v2/buckets/${APS_BUCKET_NAME}/objects/${fileName}/signeds3upload`,
            { uploadKey: uploadData.uploadKey },
            { headers: tokenHeader }
        );
        
        console.log('Operation completed successfully');
        
        // Step 5: Send success response
        res.status(200).json({ 
            success: true,
            operation: 'Upload JSON File',
            message: 'JSON file uploaded successfully',
            details: {
                uploaded_filename: fileName,
                bucket_name: APS_BUCKET_NAME,
                file_size: jsonBuffer.length,
                json_data: sampleJsonData,
                oss_response: response.data
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.log('Operation failed:', error.message);
        
        res.status(500).json({
            success: false,
            operation: 'Upload JSON File',
            error: 'Failed to upload JSON file',
            details: error.response?.data || error.message,
            timestamp: new Date().toISOString()
        });
    }
};

// Export the handler for use in server.js
module.exports = uploadJSONFileHandler;

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
    app.post('/upload-json-file', uploadJSONFileHandler);
    
    // Start the educational server for Upload JSON File
    app.listen(PORT, () => {
        console.log(`📄 EDUCATIONAL SERVER: Upload JSON File`);
        console.log(`📡 Running on: http://localhost:${PORT}`);
        console.log(`🎯 Endpoint: POST /upload-json-file`);
        console.log(`📚 This server demonstrates how to upload JSON data programmatically`);
        console.log(`🔍 Study this file to learn the complete workflow!\n`);
    });
} 