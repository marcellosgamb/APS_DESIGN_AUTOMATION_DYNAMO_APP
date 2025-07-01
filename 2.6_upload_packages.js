// 2.6_upload_packages.js - COMPLETE SELF-CONTAINED SERVER FOR DYNAMO PACKAGES
// Educational Purpose: Learn how to upload Dynamo packages (.zip) to APS Object Storage Service (OSS)

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const multer = require('multer');

// CONFIGURATION - Get your app credentials from .env file
// .env file should contain: APS_CLIENT_ID="your_client_id_here"
const APS_CLIENT_ID = process.env.APS_CLIENT_ID;
// .env file should contain: APS_CLIENT_SECRET="your_client_secret_here" 
const APS_CLIENT_SECRET = process.env.APS_CLIENT_SECRET;
// .env file should contain: APS_BUCKET_NAME="your_bucket_name_here"
const APS_BUCKET_NAME = process.env.APS_BUCKET_NAME;
// .env file should contain: PORT=XXXX (set your desired port)
const PORT = process.env.PORT;

// START TOKEN MANAGEMENT SECTION
// This section handles Autodesk authentication - it's identical in all files for educational purposes
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
        'Content-Type': 'application/octet-stream'
    };
}
// END TOKEN MANAGEMENT SECTION

// MAIN ROUTE HANDLER - Export this for use in server.js
const uploadPackagesHandler = async (req, res) => {
    console.log('Starting operation: Upload Dynamo Packages');
    
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                operation: 'Upload Dynamo Packages',
                error: 'No file uploaded',
                details: 'Please select a Dynamo packages (.zip) file',
                timestamp: new Date().toISOString()
            });
        }
        
        console.log(`File received: ${req.file.originalname} (${(req.file.size / 1024).toFixed(2)} KB)`);
        
        // Step 1: Get authentication token header
        console.log('Step 1: Getting authentication token');
        const tokenHeader = await createTokenHeader();
        
        // Step 2: Read the uploaded file
        console.log('Step 2: Reading uploaded file');
        const fileContent = fs.readFileSync(req.file.path);
        
        // Step 3: Get signed upload URL for packages.zip
        console.log('Step 3: Getting signed upload URL for: packages.zip');
        const signedUrlResponse = await axios.get(
            `https://developer.api.autodesk.com/oss/v2/buckets/${APS_BUCKET_NAME}/objects/packages.zip/signeds3upload`,
            { headers: { 'Authorization': tokenHeader.Authorization } }
        );
        
        const uploadKey = signedUrlResponse.data.uploadKey;
        const uploadUrl = signedUrlResponse.data.urls[0];
        
        // Step 3b: Upload file to signed URL
        console.log('Step 3b: Uploading file to signed URL');
        await axios.put(uploadUrl, fileContent, {
            headers: { 'Content-Type': 'application/zip' }
        });
        
        // Step 3c: Complete the upload
        console.log('Step 3c: Completing upload');
        await axios.post(
            `https://developer.api.autodesk.com/oss/v2/buckets/${APS_BUCKET_NAME}/objects/packages.zip/signeds3upload`,
            { uploadKey: uploadKey },
            { headers: { 
                'Authorization': tokenHeader.Authorization,
                'Content-Type': 'application/json'
            }}
        );
        
        // Step 4: Clean up temporary file
        console.log('Step 4: Cleaning up temporary file');
        fs.unlinkSync(req.file.path);
        
        console.log('Operation completed successfully');
        
        // Step 5: Send success response
        res.status(200).json({ 
            success: true,
            operation: 'Upload Dynamo Packages',
            message: 'Dynamo packages uploaded successfully to APS Object Storage',
            details: {
                original_filename: req.file.originalname,
                file_size_kb: (req.file.size / 1024).toFixed(2),
                bucket_name: APS_BUCKET_NAME,
                object_name: 'packages.zip',
                upload_method: 'Signed URL (modern approach)',
                note: 'Dynamo packages are optional - only needed if your script uses custom packages'
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.log('Operation failed:', error.message);
        
        // Clean up temporary file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
            success: false,
            operation: 'Upload Dynamo Packages',
            error: 'Failed to upload Dynamo packages to APS Object Storage',
            details: error.response?.data || error.message,
            timestamp: new Date().toISOString()
        });
    }
};

// Export the handler for use in server.js
module.exports = uploadPackagesHandler;

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
    
    // Configure multer for file uploads
    const upload = multer({ dest: 'uploads/' });
    
    // Set up the route
    app.post('/upload-packages', upload.single('packagesFile'), uploadPackagesHandler);
    
    // Start the educational server for Upload Dynamo Packages
    app.listen(PORT, () => {
        console.log(`📦 EDUCATIONAL SERVER: Upload Dynamo Packages`);
        console.log(`📡 Running on: http://localhost:${PORT}`);
        console.log(`🎯 Endpoint: POST /upload-packages`);
        console.log(`📚 This server demonstrates how to upload optional Dynamo packages`);
        console.log(`🔍 Study this file to learn the complete workflow!\n`);
    });
} 