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
        const headers = await createTokenHeader();
        
        // Step 2: Generate signed download URL for result.rvt (exactly like reference)
        const RVT_RESULT_FILE = 'result.rvt';
        console.log(`Step 2: Generating signed download URL for: ${RVT_RESULT_FILE}`);
        
        const response = await axios.get(
            `https://developer.api.autodesk.com/oss/v2/buckets/${APS_BUCKET_NAME}/objects/${RVT_RESULT_FILE}/signeds3download`,
            { headers }
        );
        
        console.log('✅ Signed download URL generated successfully');
        console.log('Operation completed successfully');
        
        // Step 3: Send response (matching reference implementation exactly)
        res.status(200).json({
            message: 'Download URL generated successfully',
            downloadUrl: response.data.url,
            fileName: RVT_RESULT_FILE
        });
        
    } catch (err) {
        console.log('Operation failed:', err.message);
        console.log('Error details:', err.response?.data);
        
        res.status(err.response?.status || 500).json({
            error: `Failed to generate download URL for result.rvt`,
            details: err.response?.data || err.message
        });
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