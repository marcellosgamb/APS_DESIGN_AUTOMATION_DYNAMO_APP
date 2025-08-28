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

// HELPER FUNCTION: Generate alternative bucket name if needed
function generateAlternativeBucketName(baseName) {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${baseName}_${timestamp}_${randomSuffix}`;
}

// HELPER FUNCTION: Test if we can access a bucket (list objects)
async function canAccessBucket(tokenHeader, bucketName) {
    try {
        await axios.get(`https://developer.api.autodesk.com/oss/v2/buckets/${bucketName}/objects`, { headers: tokenHeader });
        return true;
    } catch (error) {
        return false;
    }
}

// MAIN ROUTE HANDLER - Export this for use in server.js
const createOSSBucketHandler = async (req, res) => {
    console.log('Starting operation: Create OSS Bucket');
    
    try {
        // Step 1: Get authentication token header
        console.log('Step 1: Getting authentication token');
        const tokenHeader = await createTokenHeader();
        
        // Step 2: Check if we can access the existing bucket
        console.log(`Step 2: Checking access to bucket: ${APS_BUCKET_NAME}`);
        const canAccess = await canAccessBucket(tokenHeader, APS_BUCKET_NAME);
        
        if (canAccess) {
            console.log('Bucket exists and is accessible');
            res.status(200).json({
                success: true,
                operation: 'Create OSS Bucket',
                message: 'OSS Bucket is ready',
                details: `Bucket "${APS_BUCKET_NAME}" exists and is accessible with current credentials`,
                educational_note: 'Bucket already exists and you have proper access rights',
                timestamp: new Date().toISOString()
            });
            return;
        }
        
        // Step 3: Try to create the bucket
        const bucketConfig = {
            bucketKey: APS_BUCKET_NAME,
            policyKey: "transient"
        };
        
        console.log(`Step 3: Creating bucket: ${APS_BUCKET_NAME}`);
        
        try {
            const response = await axios.post('https://developer.api.autodesk.com/oss/v2/buckets', bucketConfig, { headers: tokenHeader });
            
            console.log('Operation completed successfully');
            
            res.status(200).json({ 
                success: true,
                operation: 'Create OSS Bucket',
                message: 'OSS Bucket created successfully',
                details: response.data,
                educational_note: 'This bucket stores your files (RVT, JSON, etc.) for Design Automation processing',
                timestamp: new Date().toISOString()
            });
            
        } catch (createError) {
            // Handle bucket creation conflicts
            if (createError.response && createError.response.status === 409) {
                console.log('Bucket name already taken by another app');
                
                // Generate an alternative bucket name
                const alternativeName = generateAlternativeBucketName(APS_BUCKET_NAME);
                console.log(`Attempting to create alternative bucket: ${alternativeName}`);
                
                const alternativeConfig = {
                    bucketKey: alternativeName,
                    policyKey: "transient"
                };
                
                try {
                    const altResponse = await axios.post('https://developer.api.autodesk.com/oss/v2/buckets', alternativeConfig, { headers: tokenHeader });
                    
                    res.status(200).json({
                        success: true,
                        operation: 'Create OSS Bucket',
                        message: 'Alternative OSS Bucket created successfully',
                        details: altResponse.data,
                        original_bucket_name: APS_BUCKET_NAME,
                        new_bucket_name: alternativeName,
                        educational_note: `Original bucket name "${APS_BUCKET_NAME}" was taken by another app. Created "${alternativeName}" instead.`,
                        recommendation: `Update your .env file: APS_BUCKET_NAME="${alternativeName}"`,
                        timestamp: new Date().toISOString()
                    });
                    
                } catch (altError) {
                    throw altError;
                }
                
            } else {
                throw createError;
            }
        }
        
    } catch (error) {
        console.log('Operation failed:', error.message);
        
        res.status(500).json({
            success: false,
            operation: 'Create OSS Bucket',
            error: 'Failed to create OSS Bucket',
            details: error.response?.data || error.message,
            troubleshooting: 'If you changed client credentials, try using a different bucket name in your .env file',
            timestamp: new Date().toISOString()
        });
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