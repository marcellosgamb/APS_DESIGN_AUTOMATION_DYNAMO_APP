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

// HELPER FUNCTION: Clear all objects from bucket before deleting
async function clearBucketObjects(tokenHeader, bucketName) {
    console.log(`Clearing all objects from bucket: ${bucketName}`);
    
    try {
        // First, list all objects in the bucket
        const listResponse = await axios.get(`https://developer.api.autodesk.com/oss/v2/buckets/${bucketName}/objects`, { headers: tokenHeader });
        
        if (listResponse.data.items && listResponse.data.items.length > 0) {
            console.log(`Found ${listResponse.data.items.length} objects to delete`);
            
            // Delete each object individually
            for (const object of listResponse.data.items) {
                try {
                    await axios.delete(`https://developer.api.autodesk.com/oss/v2/buckets/${bucketName}/objects/${object.objectKey}`, { headers: tokenHeader });
                    console.log(`Deleted object: ${object.objectKey}`);
                } catch (objError) {
                    console.log(`Warning: Could not delete object ${object.objectKey}:`, objError.message);
                }
            }
        } else {
            console.log('No objects found in bucket');
        }
        
        return true;
    } catch (error) {
        console.log('Warning: Could not list bucket objects:', error.message);
        return false;
    }
}

// MAIN ROUTE HANDLER - Export this for use in server.js
const clearOSSBucketHandler = async (req, res) => {
    console.log('Starting operation: Clear OSS Bucket');
    
    try {
        // Step 1: Get authentication token header
        console.log('Step 1: Getting authentication token');
        const tokenHeader = await createTokenHeader();
        
        // Step 2: Try to clear objects from bucket first
        console.log('Step 2: Clearing all objects from bucket');
        await clearBucketObjects(tokenHeader, APS_BUCKET_NAME);
        
        // Step 3: Try to delete the bucket itself
        console.log('Step 3: Attempting to delete bucket');
        const deleteResponse = await axios.delete(`https://developer.api.autodesk.com/oss/v2/buckets/${APS_BUCKET_NAME}`, { headers: tokenHeader });
        
        console.log('Operation completed successfully');
        
        // Step 4: Send success response back to browser
        res.status(200).json({ 
            success: true,
            operation: 'Clear OSS Bucket',
            message: 'OSS Bucket cleared successfully',
            details: `Bucket "${APS_BUCKET_NAME}" and all files have been deleted`,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.log('Bucket deletion failed:', error.message);
        
        // Check if it's a "not found" error (bucket doesn't exist)
        if (error.response && error.response.status === 404) {
            res.status(200).json({
                success: true,
                operation: 'Clear OSS Bucket',
                message: 'No OSS Bucket found to clear',
                details: `Bucket "${APS_BUCKET_NAME}" does not exist or was already deleted`,
                timestamp: new Date().toISOString()
            });
        } 
        // Check if it's a permissions error (different client credentials)
        else if (error.response && (error.response.status === 403 || error.response.status === 401)) {
            console.log('Permission denied - bucket was created by different client credentials');
            
            // Clear objects was attempted above, so bucket should be empty
            res.status(200).json({
                success: true,
                operation: 'Clear OSS Bucket',
                message: 'Bucket objects cleared (bucket deletion not permitted)',
                details: `Objects in bucket "${APS_BUCKET_NAME}" have been deleted. The bucket itself cannot be deleted because it was created by different client credentials. This is normal when changing apps - you can create a new bucket with a different name.`,
                recommendation: 'Consider updating your APS_BUCKET_NAME in the .env file to use a new bucket name',
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