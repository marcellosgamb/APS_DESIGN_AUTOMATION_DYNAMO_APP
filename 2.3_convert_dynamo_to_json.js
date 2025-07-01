// 2.4_convert_dynamo_to_json.js - COMPLETE SELF-CONTAINED SERVER
// Educational Purpose: Learn how to convert Dynamo (.dyn) files to JSON format

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const multer = require('multer');



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
const convertDynamoToJSONHandler = async (req, res) => {
    console.log('Starting operation: Convert Dynamo to JSON');
    
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                operation: 'Convert Dynamo to JSON',
                error: 'No file uploaded',
                details: 'Please select a Dynamo (.dyn) file to convert',
                timestamp: new Date().toISOString()
            });
        }
        
        console.log(`File received: ${req.file.originalname} (${req.file.size} bytes)`);
        
        // Step 1: Read the uploaded file
        console.log('Step 1: Reading uploaded Dynamo file');
        const dynContent = fs.readFileSync(req.file.path, 'utf8');
        
        // Step 2: Parse Dynamo file as JSON
        console.log('Step 2: Parsing Dynamo file as JSON');
        let dynData;
        try {
            dynData = JSON.parse(dynContent);
        } catch (parseErr) {
            console.log('File is not valid JSON:', parseErr.message);
            return res.status(400).json({
                success: false,
                operation: 'Convert Dynamo to JSON',
                error: 'Invalid Dynamo file format',
                details: 'The uploaded file is not a valid Dynamo (.dyn) JSON file',
                timestamp: new Date().toISOString()
            });
        }
        
        // Step 3: Validate it's a proper Dynamo file
        console.log('Step 3: Validating Dynamo file structure');
        if (!dynData.Uuid || !dynData.Nodes) {
            return res.status(400).json({
                success: false,
                operation: 'Convert Dynamo to JSON',
                error: 'Invalid Dynamo file structure',
                details: 'The file does not contain the required Dynamo properties (Uuid, Nodes)',
                timestamp: new Date().toISOString()
            });
        }
        
        // Step 4: Create the run.json structure expected by Dynamo Player (matching reference)
        console.log('Step 4: Creating run.json structure');
        const runJson = {
            "target": {
                "type": "JsonGraphTarget",
                "contents": dynContent
            },
            "inputs": []
        };
        
        const jsonContent = JSON.stringify(runJson, null, 2);
        
        // Step 5: Clean up temporary file
        console.log('Step 5: Cleaning up temporary file');
        fs.unlinkSync(req.file.path);
        
        console.log('Operation completed successfully');
        
        // Step 6: Send success response with JSON content for frontend display (matching reference)
        res.status(200).json({ 
            success: true,
            operation: 'Convert Dynamo to JSON',
            message: 'Dynamo file converted to JSON successfully',
            jsonContent: jsonContent,  // This is what the frontend expects (matching reference)
            originalFile: req.file.originalname,
            details: {
                dynamo_properties: {
                    uuid: dynData.Uuid,
                    name: dynData.Name || 'Unnamed Graph',
                    description: dynData.Description || 'No description',
                    is_custom_node: dynData.IsCustomNode,
                    nodes_count: dynData.Nodes ? dynData.Nodes.length : 0,
                    connectors_count: dynData.Connectors ? dynData.Connectors.length : 0,
                    view_scale: dynData.View ? dynData.View.Zoom : 'N/A'
                }
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.log('Operation failed:', error.message);
        
        // Clean up temporary file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
            success: false,
            operation: 'Convert Dynamo to JSON',
            error: 'Failed to convert Dynamo file to JSON',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

// Export the handler for use in server.js
module.exports = convertDynamoToJSONHandler;

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
    app.post('/convert-dynamo-to-json', upload.single('dynamoFile'), convertDynamoToJSONHandler);
    
    // Start the educational server for Convert Dynamo to JSON
    app.listen(PORT, () => {
        console.log(`🔄 EDUCATIONAL SERVER: Convert Dynamo to JSON`);
        console.log(`📡 Running on: http://localhost:${PORT}`);
        console.log(`🎯 Endpoint: POST /convert-dynamo-to-json`);
        console.log(`📚 This server demonstrates how to process and validate Dynamo files`);
        console.log(`🔍 Study this file to learn the complete workflow!\n`);
    });
} 