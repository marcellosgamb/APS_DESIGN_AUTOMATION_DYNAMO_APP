// 1.6_create_activity.js - EVERYTHING FOR CREATE ACTIVITY IN ONE FILE

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const axios = require('axios');

// CONFIGURATION - Get your app credentials from .env file
// .env file should contain: APS_CLIENT_ID="your_client_id_here"
const APS_CLIENT_ID = process.env.APS_CLIENT_ID;
// .env file should contain: APS_CLIENT_SECRET="your_client_secret_here" 
const APS_CLIENT_SECRET = process.env.APS_CLIENT_SECRET;
// .env file should contain: APS_NICKNAME="your_nickname_here"
const APS_NICKNAME = process.env.APS_NICKNAME;
// .env file should contain: APS_ACTIVITY_NAME="your_activity_name_here"
const APS_ACTIVITY_NAME = process.env.APS_ACTIVITY_NAME;
// .env file should contain: APS_BUNDLE_APP_NAME="your_appbundle_name_here"
const APS_BUNDLE_APP_NAME = process.env.APS_BUNDLE_APP_NAME;
// .env file should contain: PORT=XXXX (set your desired port)
const PORT = process.env.PORT;

// Constants matching reference implementation
const ACTIVITY_ALIAS = 'default';
const ENGINE = 'Autodesk.Revit+2026';

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

// MAIN ROUTE HANDLER - Export this for use in server.js WITH SOCKET.IO SUPPORT
const createActivityHandler = async (req, res) => {
    const { socketId } = req.body;
    const io = req.app.get('io');
    
    console.log('Starting operation: Create Activity');
    
    // Send initial status to browser log
    if (io && socketId) {
        io.to(socketId).emit('status', { message: '--- Step: CREATE ACTIVITY ---' });
    }
    
    try {
        // Step 1: Get authentication token header
        console.log('Step 1: Getting authentication token');
        if (io && socketId) {
            io.to(socketId).emit('status', { message: 'Getting authentication token...' });
        }
        const headers = await createTokenHeader();
        if (io && socketId) {
            io.to(socketId).emit('status', { message: '✅ Authentication token obtained' });
        }
        
        // Step 2: Create activity definition (exactly matching reference structure)
        const qualifiedActivityId = `${APS_NICKNAME}.${APS_ACTIVITY_NAME}`;
        console.log(`Step 2: Creating activity: ${qualifiedActivityId}`);
        if (io && socketId) {
            io.to(socketId).emit('status', { message: `Creating Activity: ${qualifiedActivityId}` });
        }
        
        const activityData = {
            id: APS_ACTIVITY_NAME,
            commandLine: [`$(engine.path)\\\\revitcoreconsole.exe /i "$(args[rvtFile].path)" /al "$(appbundles[${APS_BUNDLE_APP_NAME}].path)"`],
            parameters: {
                rvtFile: {
                    zip: false,
                    ondemand: false,
                    verb: "get",
                    description: "Input Revit model",
                    required: true,
                    localName: "$(rvtFile)"
                },
                runRequest: {
                    zip: false,
                    ondemand: false,
                    verb: "get",
                    description: "Input Revit model",
                    required: false,
                    localName: "run.json"
                },
                pythonLibs: {
                    zip: true,
                    ondemand: false,
                    verb: "get",
                    description: "Python libs",
                    required: false,
                    localName: "pythonDependencies"
                },
                dynResult: {
                    zip: false,
                    ondemand: false,
                    verb: "put",
                    description: "Results",
                    required: false,
                    localName: "result.json"
                },
                packages: {
                    zip: true,
                    ondemand: false,
                    verb: "get",
                    description: "Dynamo packages",
                    required: false,
                    localName: "packages"
                },
                rvtResult: {
                    zip: false,
                    ondemand: false,
                    verb: "put",
                    description: "Results",
                    required: false,
                    localName: "result.rvt"
                }
            },
            engine: ENGINE,
            appbundles: [`${APS_NICKNAME}.${APS_BUNDLE_APP_NAME}+${ACTIVITY_ALIAS}`],
            description: `Activity for Dynamo Revit, version ${new Date().toISOString()}`
        };
        
        // Step 3: Create the activity
        console.log('Step 3: Making API call to create activity');
        if (io && socketId) {
            io.to(socketId).emit('status', { message: 'Creating activity...' });
        }
        
        const newActivity = await axios.post(`https://developer.api.autodesk.com/da/us-east/v3/activities`, activityData, { headers });
        console.log(`Activity created (version ${newActivity.data.version})`);
        if (io && socketId) {
            io.to(socketId).emit('status', { message: `Activity created (version ${newActivity.data.version}).` });
        }
        
        // Step 4: Create/update alias (exactly matching reference logic)
        console.log(`Step 4: Creating alias '${ACTIVITY_ALIAS}' for version ${newActivity.data.version}`);
        if (io && socketId) {
            io.to(socketId).emit('status', { message: `Creating alias '${ACTIVITY_ALIAS}' for version ${newActivity.data.version}...` });
        }
        
        try {
            // Try to create the alias
            await axios.post(
                `https://developer.api.autodesk.com/da/us-east/v3/activities/${APS_ACTIVITY_NAME}/aliases`,
                { id: ACTIVITY_ALIAS, version: newActivity.data.version },
                { headers }
            );
            console.log(`Activity alias '${ACTIVITY_ALIAS}' created`);
            if (io && socketId) {
                io.to(socketId).emit('status', { message: `Activity alias '${ACTIVITY_ALIAS}' created.` });
            }
        } catch (aliasErr) {
            if (aliasErr.response && aliasErr.response.status === 409) {
                // Alias already exists, update it (exactly matching reference)
                console.log(`Alias exists, updating to version ${newActivity.data.version}`);
                if (io && socketId) {
                    io.to(socketId).emit('status', { message: `Alias exists, updating to version ${newActivity.data.version}...` });
                }
                await axios.patch(
                    `https://developer.api.autodesk.com/da/us-east/v3/activities/${APS_ACTIVITY_NAME}/aliases/${ACTIVITY_ALIAS}`,
                    { version: newActivity.data.version },
                    { headers }
                );
                console.log(`Activity alias '${ACTIVITY_ALIAS}' updated`);
                if (io && socketId) {
                    io.to(socketId).emit('status', { message: `Activity alias '${ACTIVITY_ALIAS}' updated.` });
                }
            } else {
                throw aliasErr;
            }
        }
        
        console.log('Operation completed successfully');
        if (io && socketId) {
            io.to(socketId).emit('status', { message: 'Activity setup complete.' });
        }
        
        // Step 5: Send success response back to browser (matching reference format)
        res.status(200).json({ 
            success: true,
            operation: 'Create Activity',
            message: 'Activity created successfully',
            details: {
                version: newActivity.data.version,
                alias: ACTIVITY_ALIAS,
                qualifiedId: `${qualifiedActivityId}+${ACTIVITY_ALIAS}`
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        const message = error.response ? JSON.stringify(error.response.data, null, 2) : error.message;
        console.log('Operation failed:', message);
        
        // Show detailed error in browser log
        if (io && socketId) {
            io.to(socketId).emit('status', { message: `--- ERROR ---` });
            io.to(socketId).emit('status', { message: `Operation failed: ${error.message}` });
            if (error.response && error.response.data) {
                const errorDetails = JSON.stringify(error.response.data, null, 2);
                io.to(socketId).emit('status', { message: `Error details: ${errorDetails}` });
            }
        }
        
        res.status(error.response?.status || 500).json({
            success: false,
            operation: 'Create Activity',
            error: 'Failed to create activity',
            details: error.response?.data || message,
            timestamp: new Date().toISOString()
        });
    }
};

// Export the handler for use in server.js
module.exports = createActivityHandler;

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
    app.post('/create-activity', createActivityHandler);
    
    // Start the server
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
        console.log('Ready to process Create Activity requests');
    });
} 