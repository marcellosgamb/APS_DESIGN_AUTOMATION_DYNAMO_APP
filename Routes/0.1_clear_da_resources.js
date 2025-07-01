// 0.1_clear_da_resources.js - EVERYTHING FOR CLEAR DA RESOURCES IN ONE FILE

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const axios = require('axios');

// CONFIGURATION - Get your app credentials from .env file
const APS_CLIENT_ID = process.env.APS_CLIENT_ID;
const APS_CLIENT_SECRET = process.env.APS_CLIENT_SECRET;
const PORT = process.env.PORT;

// START TOKEN MANAGEMENT SECTION
async function getAutodeskToken() {
    console.log('Getting new token from Autodesk...');
    
    const tokenRequestBody = new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'bucket:create bucket:read bucket:delete data:read data:write code:all'
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
const clearDAResourcesHandler = async (req, res) => {
    console.log('Starting operation: Clear DA Resources');
    
    try {
        // Step 1: Get authentication token header
        console.log('Step 1: Getting authentication token');
        const tokenHeader = await createTokenHeader();
        
        // Step 2: Make API call to Autodesk
        console.log('Step 2: Making API call to Autodesk');
        const deleteResponse = await axios.delete('https://developer.api.autodesk.com/da/us-east/v3/forgeapps/me', { headers: tokenHeader });
        
        console.log('Operation completed successfully');
        
        // Step 3: Send success response back to browser
        res.status(200).json({ 
            success: true,
            operation: 'Clear DA Resources',
            message: 'DA Resources cleared successfully',
            details: 'All nicknames, AppBundles, and Activities have been deleted',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.log('Operation failed:', error.message);
        
        // Check if it's a "not found" error (nothing to delete)
        if (error.response && error.response.status === 404) {
            res.status(200).json({
                success: true,
                operation: 'Clear DA Resources',
                message: 'No DA Resources found to clear',
                details: 'Your account has no Design Automation resources to delete',
                timestamp: new Date().toISOString()
            });
        } else {
            // Some other error occurred
            res.status(500).json({
                success: false,
                operation: 'Clear DA Resources',
                error: 'Failed to clear DA Resources',
                details: error.response?.data || error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
};

// Export the handler for use in server.js
module.exports = clearDAResourcesHandler;

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
    app.delete('/clear-da-resources', clearDAResourcesHandler);
    
    // Start the educational server
    app.listen(PORT, () => {
        console.log(`🔴 EDUCATIONAL SERVER: Clear DA Resources`);
        console.log(`📡 Running on: http://localhost:${PORT}`);
        console.log(`🎯 Endpoint: DELETE /clear-da-resources`);
        console.log(`📚 This server demonstrates how to clear Design Automation resources`);
        console.log(`🔍 Study this file to learn the complete workflow!\n`);
    });
} 