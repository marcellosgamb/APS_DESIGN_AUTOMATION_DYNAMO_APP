// 0.3_smart_bucket_cleanup.js - SMART BUCKET CLEANUP FOR CHANGED CLIENT CREDENTIALS

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

// HELPER FUNCTION: Generate new bucket name with current credentials
function generateNewBucketName(baseName) {
    const timestamp = Date.now();
    const clientIdSuffix = APS_CLIENT_ID.substring(0, 8);
    return `${baseName}_${clientIdSuffix}_${timestamp}`.toLowerCase();
}

// HELPER FUNCTION: Test bucket access and ownership
async function testBucketOwnership(tokenHeader, bucketName) {
    const results = {
        exists: false,
        canRead: false,
        canWrite: false,
        canDelete: false,
        objects: []
    };
    
    try {
        // Test if bucket exists and we can read
        const listResponse = await axios.get(`https://developer.api.autodesk.com/oss/v2/buckets/${bucketName}/objects`, { headers: tokenHeader });
        results.exists = true;
        results.canRead = true;
        results.objects = listResponse.data.items || [];
        console.log(`✓ Can read bucket "${bucketName}" - found ${results.objects.length} objects`);
        
        // Test if we can write (upload a small test file)
        try {
            const testObject = {
                bucketKey: bucketName,
                objectName: 'test_write_permission.txt',
                'Content-Length': 14
            };
            
            const testContent = 'write test ok';
            await axios.put(`https://developer.api.autodesk.com/oss/v2/buckets/${bucketName}/objects/test_write_permission.txt`, testContent, { headers: tokenHeader });
            results.canWrite = true;
            console.log(`✓ Can write to bucket "${bucketName}"`);
            
            // Clean up test file immediately
            try {
                await axios.delete(`https://developer.api.autodesk.com/oss/v2/buckets/${bucketName}/objects/test_write_permission.txt`, { headers: tokenHeader });
                console.log(`✓ Test file cleaned up`);
            } catch (cleanupError) {
                console.log(`Warning: Could not clean up test file:`, cleanupError.message);
            }
            
        } catch (writeError) {
            console.log(`✗ Cannot write to bucket "${bucketName}":`, writeError.message);
        }
        
        // Test if we can delete the bucket (only if empty)
        if (results.objects.length === 0) {
            try {
                // Don't actually delete, just check the error response
                await axios.delete(`https://developer.api.autodesk.com/oss/v2/buckets/${bucketName}_test_permissions_only_ignore`, { headers: tokenHeader });
            } catch (deleteTestError) {
                if (deleteTestError.response && deleteTestError.response.status === 404) {
                    // 404 means we have delete permissions (bucket just doesn't exist)
                    results.canDelete = true;
                    console.log(`✓ Have delete permissions for buckets`);
                } else if (deleteTestError.response && (deleteTestError.response.status === 403 || deleteTestError.response.status === 401)) {
                    console.log(`✗ No delete permissions for buckets created by other apps`);
                } else {
                    results.canDelete = true; // Assume we can delete if other error
                    console.log(`✓ Likely have delete permissions`);
                }
            }
        }
        
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.log(`✗ Bucket "${bucketName}" does not exist`);
        } else if (error.response && (error.response.status === 403 || error.response.status === 401)) {
            console.log(`✗ No access to bucket "${bucketName}" - created by different app`);
        } else {
            console.log(`✗ Error accessing bucket "${bucketName}":`, error.message);
        }
    }
    
    return results;
}

// MAIN ROUTE HANDLER - Export this for use in server.js
const smartBucketCleanupHandler = async (req, res) => {
    console.log('Starting operation: Smart Bucket Cleanup');
    
    try {
        // Step 1: Get authentication token header
        console.log('Step 1: Getting authentication token');
        const tokenHeader = await createTokenHeader();
        
        // Step 2: Test current bucket access
        console.log(`Step 2: Testing access to current bucket: ${APS_BUCKET_NAME}`);
        const bucketTest = await testBucketOwnership(tokenHeader, APS_BUCKET_NAME);
        
        let cleanupResults = {
            bucket_name: APS_BUCKET_NAME,
            access_test: bucketTest,
            objects_deleted: 0,
            bucket_deleted: false,
            new_bucket_suggested: null,
            action_required: null
        };
        
        if (bucketTest.exists && bucketTest.canRead) {
            // Step 3: Delete all objects we can delete
            if (bucketTest.objects.length > 0) {
                console.log(`Step 3: Deleting ${bucketTest.objects.length} objects from bucket`);
                
                for (const object of bucketTest.objects) {
                    try {
                        await axios.delete(`https://developer.api.autodesk.com/oss/v2/buckets/${APS_BUCKET_NAME}/objects/${object.objectKey}`, { headers: tokenHeader });
                        cleanupResults.objects_deleted++;
                        console.log(`Deleted object: ${object.objectKey}`);
                    } catch (objError) {
                        console.log(`Warning: Could not delete object ${object.objectKey}:`, objError.message);
                    }
                }
            }
            
            // Step 4: Try to delete bucket if we can
            if (bucketTest.canDelete || cleanupResults.objects_deleted === bucketTest.objects.length) {
                try {
                    await axios.delete(`https://developer.api.autodesk.com/oss/v2/buckets/${APS_BUCKET_NAME}`, { headers: tokenHeader });
                    cleanupResults.bucket_deleted = true;
                    console.log(`✓ Bucket "${APS_BUCKET_NAME}" deleted successfully`);
                } catch (deleteError) {
                    console.log(`✗ Could not delete bucket "${APS_BUCKET_NAME}":`, deleteError.message);
                    
                    // Suggest new bucket name
                    cleanupResults.new_bucket_suggested = generateNewBucketName(APS_BUCKET_NAME.split('_')[0]);
                    cleanupResults.action_required = 'UPDATE_ENV_FILE';
                }
            } else {
                // Suggest new bucket name since we can't delete this one
                cleanupResults.new_bucket_suggested = generateNewBucketName(APS_BUCKET_NAME.split('_')[0]);
                cleanupResults.action_required = 'UPDATE_ENV_FILE';
            }
        } else {
            // Bucket doesn't exist or we can't access it
            cleanupResults.new_bucket_suggested = generateNewBucketName(APS_BUCKET_NAME.split('_')[0]);
            cleanupResults.action_required = 'UPDATE_ENV_FILE';
        }
        
        // Step 5: Send comprehensive response
        const response = {
            success: true,
            operation: 'Smart Bucket Cleanup',
            message: 'Bucket cleanup analysis completed',
            results: cleanupResults,
            timestamp: new Date().toISOString()
        };
        
        if (cleanupResults.action_required === 'UPDATE_ENV_FILE') {
            response.recommendation = `Update your env.txt file with: APS_BUCKET_NAME="${cleanupResults.new_bucket_suggested}"`;
            response.explanation = 'The current bucket was created by different client credentials. Using a new bucket name will avoid permission conflicts.';
        }
        
        if (cleanupResults.bucket_deleted) {
            response.message = 'Bucket successfully cleaned up and deleted';
        } else if (cleanupResults.objects_deleted > 0) {
            response.message = `Bucket objects cleared (${cleanupResults.objects_deleted} files deleted)`;
        }
        
        res.status(200).json(response);
        
    } catch (error) {
        console.log('Operation failed:', error.message);
        
        res.status(500).json({
            success: false,
            operation: 'Smart Bucket Cleanup',
            error: 'Failed to perform smart bucket cleanup',
            details: error.response?.data || error.message,
            recommendation: 'Try manually updating your bucket name in the env.txt file',
            timestamp: new Date().toISOString()
        });
    }
};

// Export the handler for use in server.js
module.exports = smartBucketCleanupHandler;

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
    app.post('/smart-bucket-cleanup', smartBucketCleanupHandler);
    
    // Start the educational server for Smart Bucket Cleanup
    app.listen(PORT, () => {
        console.log(`🟣 EDUCATIONAL SERVER: Smart Bucket Cleanup`);
        console.log(`📡 Running on: http://localhost:${PORT}`);
        console.log(`🎯 Endpoint: POST /smart-bucket-cleanup`);
        console.log(`📚 This server demonstrates intelligent bucket management when credentials change`);
        console.log(`🔍 Study this file to learn advanced bucket ownership handling!\n`);
    });
}
