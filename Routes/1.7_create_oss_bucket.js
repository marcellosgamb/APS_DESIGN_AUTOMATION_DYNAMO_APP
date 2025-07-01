// 1.7_create_oss_bucket.js - EVERYTHING FOR CREATE OSS BUCKET IN ONE FILE

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const axios = require('axios');

// CONFIGURATION - Get your app credentials from .env file
// .env file should contain: APS_CLIENT_ID="your_client_id_here"
const APS_CLIENT_ID = process.env.APS_CLIENT_ID;
// .env file should contain: APS_CLIENT_SECRET="your_client_secret_here" 
const APS_CLIENT_SECRET = process.env.APS_CLIENT_SECRET;
// .env file should contain: PORT=XXXX (set your desired port)
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
const createOSSBucketHandler = async (req, res) => {
    console.log('Starting operation: Create OSS Bucket');
    
    try {
        // Step 1: Get authentication token header
        console.log('Step 1: Getting authentication token');
        const tokenHeader = await createTokenHeader();
        
        // Step 2: Create bucket configuration
        const bucketConfig = {
            bucketKey: APS_BUCKET_NAME,
            policyKey: "transient"
        };
        
        console.log(`Step 2: Creating bucket: ${APS_BUCKET_NAME}`);
        
        // Step 3: Make API call to Autodesk
        console.log('Step 3: Making API call to Autodesk');
        const response = await axios.post('https://developer.api.autodesk.com/oss/v2/buckets', bucketConfig, { headers: tokenHeader });
        
        console.log('Operation completed successfully');
        
        // Step 4: Send success response back to browser
        res.status(200).json({ 
            success: true,
            operation: 'Create OSS Bucket',
            message: 'OSS Bucket created successfully',
            details: response.data,
            educational_note: 'This bucket stores your files (RVT, JSON, etc.) for Design Automation processing',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.log('Operation failed:', error.message);
        
        // Check if bucket already exists
        if (error.response && error.response.status === 409) {
            res.status(200).json({
                success: true,
                operation: 'Create OSS Bucket',
                message: 'OSS Bucket already exists',
                details: `Bucket "${APS_BUCKET_NAME}" is already created and ready to use`,
                educational_note: 'Error 409 (Conflict) means the bucket already exists - this is normal and safe',
                timestamp: new Date().toISOString()
            });
        } else {
            // Some other error occurred
            res.status(500).json({
                success: false,
                operation: 'Create OSS Bucket',
                error: 'Failed to create OSS Bucket',
                details: error.response?.data || error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
};

// Export the handler for use in server.js
module.exports = createOSSBucketHandler;

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
    app.post('/create-oss-bucket', createOSSBucketHandler);
    
    // Start the server
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
        console.log('Ready to process Create OSS Bucket requests');
    });
} 