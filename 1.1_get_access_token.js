// 1.1_get_access_token.js - EVERYTHING FOR GET ACCESS TOKEN IN ONE FILE

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
const getAccessTokenHandler = async (req, res) => {
    console.log('Starting operation: Get Access Token');
    
    try {
        // Step 1: Get authentication token 
        console.log('Step 1: Getting authentication token');
        const token = await getAutodeskToken();
        
        console.log('Operation completed successfully');
        
        // Step 2: Send success response back to browser with token details
        res.status(200).json({ 
            success: true,
            operation: 'Get Access Token',
            message: 'Access token retrieved successfully',
            details: {
                access_token: token.substring(0, 50) + '...[truncated for security]',
                token_length: token.length,
                expires_in: '3600 seconds (1 hour)',
                scope: 'bucket:create bucket:read bucket:delete data:read data:write code:all',
                token_type: 'Bearer'
            },
            educational_note: 'This token is used for all subsequent API calls in the Authorization header',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.log('Operation failed:', error.message);
        
        res.status(500).json({
            success: false,
            operation: 'Get Access Token',
            error: 'Failed to get access token',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

// Export the handler for use in server.js
module.exports = getAccessTokenHandler;

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
    app.post('/get-access-token', getAccessTokenHandler);
    
    // Start the educational server for Get Access Token
    app.listen(PORT, () => {
        console.log(`🟡 EDUCATIONAL SERVER: Get Access Token`);
        console.log(`📡 Running on: http://localhost:${PORT}`);
        console.log(`🎯 Endpoint: POST /get-access-token`);
        console.log(`📚 This server demonstrates how to authenticate with Autodesk APS`);
        console.log(`🔍 Study this file to learn the complete authentication workflow!\n`);
    });
} 