// 0.2_clear_oss_bucket.js - EVERYTHING FOR CLEAR OSS BUCKET IN ONE FILE

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const axios = require('axios');

// CONFIGURATION - Get your app credentials from .env file
// .env file should contain: APS_CLIENT_ID="your_client_id_here"
const APS_CLIENT_ID = process.env.APS_CLIENT_ID;
// .env file should contain: APS_CLIENT_SECRET="your_client_secret_here" 
const APS_CLIENT_SECRET = process.env.APS_CLIENT_SECRET;
// Educational server runs on its own dedicated port (passed via environment)
const PORT = process.env.PORT;
// .env file should contain: APS_BUCKET_NAME="your_bucket_name_here"
const APS_BUCKET_NAME = process.env.APS_BUCKET_NAME;

// START TOKEN MANAGEMENT SECTION
async function getAutodeskToken() {
    console.log('Getting new token from Autodesk...');
    
    // Create the request body for token request
    const tokenRequestBody = new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'bucket:create bucket:read bucket:delete data:read data:write code:all'
    });
    
    // Create authentication header using your app credentials from .env file
    // input is the client id and secret added together and then encoded in base64 format 
    // confusing i know, but it's how autodesk wants it
    const base64Credentials = Buffer.from(`${APS_CLIENT_ID}:${APS_CLIENT_SECRET}`).toString('base64');
    
    const tokenHeaders = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${base64Credentials}`
    };
    
    try {
        // Ask Autodesk for an access token
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
    
    // Return headers object with the Bearer token
    const tokenHeader = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    return tokenHeader;
}
// END TOKEN MANAGEMENT SECTION

// MAIN ROUTE HANDLER - Export this for use in server.js
const clearOSSBucketHandler = async (req, res) => {
    console.log('Starting operation: Clear OSS Bucket');
    
    try {
        // Step 1: Get authentication token header
        console.log('Step 1: Getting authentication token');
        const tokenHeader = await createTokenHeader();
        
        // Step 2: Make API call to Autodesk
        console.log('Step 2: Making API call to Autodesk');
        const deleteResponse = await axios.delete(`https://developer.api.autodesk.com/oss/v2/buckets/${APS_BUCKET_NAME}`, { headers: tokenHeader });
        
        console.log('Operation completed successfully');
        
        // Step 3: Send success response back to browser
        res.status(200).json({ 
            success: true,
            operation: 'Clear OSS Bucket',
            message: 'OSS Bucket cleared successfully',
            details: `Bucket "${APS_BUCKET_NAME}" and all files have been deleted`,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.log('Operation failed:', error.message);
        
        // Check if it's a "not found" error (bucket doesn't exist)
        if (error.response && error.response.status === 404) {
            res.status(200).json({
                success: true,
                operation: 'Clear OSS Bucket',
                message: 'No OSS Bucket found to clear',
                details: `Bucket "${APS_BUCKET_NAME}" does not exist or was already deleted`,
                timestamp: new Date().toISOString()
            });
        } else {
            // Some other error occurred
            res.status(500).json({
                success: false,
                operation: 'Clear OSS Bucket',
                error: 'Failed to clear OSS Bucket',
                details: error.response?.data || error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
};

// Export the handler for use in server.js
module.exports = clearOSSBucketHandler;

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
    app.delete('/clear-oss-bucket', clearOSSBucketHandler);
    
    // Start the educational server for Clear OSS Bucket
    app.listen(PORT, () => {
        console.log(`🟠 EDUCATIONAL SERVER: Clear OSS Bucket`);
        console.log(`📡 Running on: http://localhost:${PORT}`);
        console.log(`🎯 Endpoint: DELETE /clear-oss-bucket`);
        console.log(`📚 This server demonstrates how to delete Object Storage Service buckets`);
        console.log(`🔍 Study this file to learn the complete workflow!\n`);
    });
} 