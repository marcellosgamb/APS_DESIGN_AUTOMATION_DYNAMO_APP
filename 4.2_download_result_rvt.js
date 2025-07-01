// 4.2_download_result_rvt.js - COMPLETE SELF-CONTAINED SERVER
// Educational Purpose: Learn how to download result.rvt files from APS Object Storage Service

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
// .env file should contain: PORT=XXXX (set your desired port)
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
const downloadResultRVTHandler = async (req, res) => {
    console.log('Starting operation: Download Result RVT');
    
    try {
        // Step 1: Get authentication token header
        console.log('Step 1: Getting authentication token');
        const tokenHeader = await createTokenHeader();
        
        // Step 2: Generate signed download URL for result.rvt
        const fileName = 'result.rvt';
        console.log(`Step 2: Generating signed download URL for: ${fileName}`);
        
        const signedUrlResponse = await axios.get(
            `https://developer.api.autodesk.com/oss/v2/buckets/${APS_BUCKET_NAME}/objects/${fileName}/signeds3download?minutesExpiration=60`,
            { headers: tokenHeader }
        );
        
        const downloadUrl = signedUrlResponse.data.url;
        console.log('Step 3: Signed download URL generated successfully');
        
        // Step 4: Get file details
        console.log('Step 4: Getting file details');
        const fileDetailsResponse = await axios.head(
            `https://developer.api.autodesk.com/oss/v2/buckets/${APS_BUCKET_NAME}/objects/${fileName}`,
            { headers: tokenHeader }
        );
        
        const fileSize = fileDetailsResponse.headers['content-length'];
        const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);
        
        console.log('Operation completed successfully');
        
        // Step 5: Send response with download URL and file info
        res.status(200).json({ 
            success: true,
            operation: 'Download Result RVT',
            message: 'Download URL generated successfully',
            details: {
                file_name: fileName,
                download_url: downloadUrl,
                expires_in_minutes: 60,
                bucket_name: APS_BUCKET_NAME,
                file_size_bytes: parseInt(fileSize),
                file_size_mb: fileSizeMB
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.log('Operation failed:', error.message);
        
        if (error.response && error.response.status === 404) {
            res.status(404).json({
                success: false,
                operation: 'Download Result RVT',
                error: 'Result file not found',
                details: 'The result.rvt file does not exist. Please run a workitem first.',
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({
                success: false,
                operation: 'Download Result RVT',
                error: 'Failed to generate download URL',
                details: error.response?.data || error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
};

// Export the handler for use in server.js
module.exports = downloadResultRVTHandler;

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
    app.get('/download-result-rvt', downloadResultRVTHandler);
    
    // Start the educational server for Download Result RVT
    app.listen(PORT, () => {
        console.log(`🏗️ EDUCATIONAL SERVER: Download Result RVT`);
        console.log(`📡 Running on: http://localhost:${PORT}`);
        console.log(`🎯 Endpoint: GET /download-result-rvt`);
        console.log(`📚 This server demonstrates how to download result.rvt files`);
        console.log(`🔍 Study this file to learn the complete workflow!\n`);
    });
} 