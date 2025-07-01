// 1.5_upload_appbundle.js - COMPLETE SELF-CONTAINED SERVER
// Educational Purpose: Learn how to upload AppBundle ZIP files to APS Design Automation

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const multer = require('multer');
const FormData = require('form-data');



// CONFIGURATION - Get your app credentials from .env file
// .env file should contain: APS_CLIENT_ID="your_client_id_here"
const APS_CLIENT_ID = process.env.APS_CLIENT_ID;
// .env file should contain: APS_CLIENT_SECRET="your_client_secret_here" 
const APS_CLIENT_SECRET = process.env.APS_CLIENT_SECRET;
// .env file should contain: APS_NICKNAME="your_nickname_here"
const APS_NICKNAME = process.env.APS_NICKNAME;
// .env file should contain: APS_BUNDLE_APP_NAME="your_appbundle_name_here"
const APS_BUNDLE_APP_NAME = process.env.APS_BUNDLE_APP_NAME;
// .env file should contain: PORT=XXXX (set your desired port)
const PORT = process.env.PORT;

// START TOKEN MANAGEMENT SECTION
// This section handles Autodesk authentication - it's identical in all files for educational purposes
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
const uploadAppBundleHandler = async (req, res) => {
    console.log('Starting operation: Upload AppBundle');
    
    const { socketId } = req.body;
    const io = req.app.get('io');
    
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                operation: 'Upload AppBundle',
                error: 'No file uploaded',
                details: 'Please select an AppBundle (.zip) file to upload',
                timestamp: new Date().toISOString()
            });
        }
        
        console.log(`File received: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`);
        
        if (socketId && io) {
            io.to(socketId).emit('status', { message: '--- Step: CREATE APPBUNDLE ---' });
            io.to(socketId).emit('status', { message: `File received: ${req.file.originalname}` });
        }
        
        // Step 1: Get authentication token header
        console.log('Step 1: Getting authentication token');
        if (socketId && io) {
            io.to(socketId).emit('status', { message: 'Getting authentication token...' });
        }
        const tokenHeader = await createTokenHeader();
        
        // Step 2: Create AppBundle name (using environment constants)
        console.log(`Step 2: Creating AppBundle: ${APS_NICKNAME}.${APS_BUNDLE_APP_NAME}+default`);
        if (socketId && io) {
            io.to(socketId).emit('status', { message: `Creating AppBundle: ${APS_NICKNAME}.${APS_BUNDLE_APP_NAME}+default` });
        }
        
        // Step 3: Create AppBundle definition
        const appBundleDefinition = {
            id: APS_BUNDLE_APP_NAME,
            engine: "Autodesk.Revit+2026",
            description: "AppBundle for running Dynamo scripts on Revit models"
        };
        
        console.log('Step 3: Creating AppBundle resource (with upload parameters)');
        if (socketId && io) {
            io.to(socketId).emit('status', { message: 'Creating AppBundle resource...' });
        }
        const createResponse = await axios.post(
            'https://developer.api.autodesk.com/da/us-east/v3/appbundles',
            appBundleDefinition,
            { headers: tokenHeader }
        );
        
        console.log('Step 4: Extracting upload parameters from AppBundle creation response');
        if (socketId && io) {
            io.to(socketId).emit('status', { message: `AppBundle created (version ${createResponse.data.version}). Uploading content...` });
        }
        const uploadUrl = createResponse.data.uploadParameters.endpointURL;
        const formData = createResponse.data.uploadParameters.formData;
        
        // Step 5: Upload the ZIP file
        console.log('Step 5: Uploading ZIP to APS');
        if (socketId && io) {
            io.to(socketId).emit('status', { message: 'Uploading ZIP file to APS...' });
        }
        const uploadFormData = new FormData();
        
        // Add all the form data parameters first
        Object.keys(formData).forEach(key => {
            uploadFormData.append(key, formData[key]);
        });
        
        // Add the file
        uploadFormData.append('file', fs.createReadStream(req.file.path));
        
        await axios.post(uploadUrl, uploadFormData, {
            headers: uploadFormData.getHeaders()
        });
        
        // Step 6: Create alias for the AppBundle
        console.log('Step 6: Creating alias for AppBundle');
        if (socketId && io) {
            io.to(socketId).emit('status', { message: `Creating alias 'default' for version ${createResponse.data.version}...` });
        }
        try {
            const aliasData = {
                id: "default",
                version: createResponse.data.version
            };
            
            await axios.post(
                `https://developer.api.autodesk.com/da/us-east/v3/appbundles/${APS_BUNDLE_APP_NAME}/aliases`,
                aliasData,
                { headers: tokenHeader }
            );
            if (socketId && io) {
                io.to(socketId).emit('status', { message: `AppBundle alias 'default' created.` });
            }
        } catch (aliasError) {
            // If alias already exists, update it
            if (aliasError.response && aliasError.response.status === 409) {
                console.log('Alias exists, updating...');
                if (socketId && io) {
                    io.to(socketId).emit('status', { message: `Alias exists, updating to version ${createResponse.data.version}...` });
                }
                await axios.patch(
                    `https://developer.api.autodesk.com/da/us-east/v3/appbundles/${APS_BUNDLE_APP_NAME}/aliases/default`,
                    { version: createResponse.data.version },
                    { headers: tokenHeader }
                );
                if (socketId && io) {
                    io.to(socketId).emit('status', { message: `AppBundle alias 'default' updated.` });
                }
            } else {
                throw aliasError;
            }
        }
        
        // Step 7: Clean up temporary file
        console.log('Step 7: Cleaning up temporary file');
        fs.unlinkSync(req.file.path);
        
        console.log('Operation completed successfully');
        if (socketId && io) {
            io.to(socketId).emit('status', { message: 'AppBundle setup complete.' });
        }
        
        // Step 8: Send success response
        res.status(200).json({ 
            success: true,
            operation: 'Upload AppBundle',
            message: 'AppBundle uploaded successfully',
            details: {
                appbundle_name: `${APS_NICKNAME}.${APS_BUNDLE_APP_NAME}+default`,
                engine: "Autodesk.Revit+2026",
                version: createResponse.data.version,
                original_filename: req.file.originalname,
                file_size_mb: (req.file.size / 1024 / 1024).toFixed(2)
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.log('Operation failed:', error.message);
        
        const { socketId } = req.body;
        const io = req.app.get('io');
        
        // Clean up temporary file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        const message = error.response ? JSON.stringify(error.response.data, null, 2) : error.message;
        if (socketId && io) {
            io.to(socketId).emit('status', { message: `--- ERROR ---<br/>${message}` });
        }
        
        // Handle specific AppBundle creation errors
        if (error.response && error.response.status === 409) {
            res.status(200).json({
                success: true,
                operation: 'Upload AppBundle',
                message: 'AppBundle already exists, updated successfully',
                details: 'The AppBundle was already created, so it was updated with the new ZIP file',
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({
                success: false,
                operation: 'Upload AppBundle',
                error: 'Failed to upload AppBundle',
                details: error.response?.data || error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
};

// Export the handler for use in server.js
module.exports = uploadAppBundleHandler;

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
    
    // Configure multer for file uploads
    const upload = multer({ dest: 'uploads/' });
    
    // Set up the route
    app.post('/upload-appbundle', upload.single('appBundleFile'), uploadAppBundleHandler);
    
    // Start the educational server for Upload AppBundle
    app.listen(PORT, () => {
        console.log(`🟣 EDUCATIONAL SERVER: Upload AppBundle`);
        console.log(`📡 Running on: http://localhost:${PORT}`);
        console.log(`🎯 Endpoint: POST /upload-appbundle`);
        console.log(`📚 This server demonstrates how to upload and create AppBundle packages`);
        console.log(`🔍 Study this file to learn the complete workflow!\n`);
    });
} 