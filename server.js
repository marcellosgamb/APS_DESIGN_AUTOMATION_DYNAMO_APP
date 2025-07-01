require('dotenv').config();
const express = require('express');
const path = require('path');
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Import all the individual x.x.js handlers
const clearDAResourcesHandler = require('./0.1_clear_da_resources.js');
const clearOSSBucketHandler = require('./0.2_clear_oss_bucket.js');
const getAccessTokenHandler = require('./1.1_get_access_token.js');
const getNicknameHandler = require('./1.2_get_nickname.js');
const setNicknameHandler = require('./1.3_set_nickname.js');
const uploadAppBundleHandler = require('./1.5_upload_appbundle.js');
const createActivityHandler = require('./1.6_create_activity.js');
const createOSSBucketHandler = require('./1.7_create_oss_bucket.js');
const uploadRevitFileHandler = require('./2.1_upload_revit_file.js');
const uploadDynamoFileHandler = require('./2.2_upload_dynamo_file.js');
const convertDynamoToJSONHandler = require('./2.3_convert_dynamo_to_json.js');
const uploadJSONFileHandler = require('./2.4_upload_json_file.js');
const uploadPythonDependenciesHandler = require('./2.5_upload_python_dependencies.js');
const uploadPackagesHandler = require('./2.6_upload_packages.js');
const runWorkitemHandler = require('./3.1_run_workitem.js');
const downloadResultJSONHandler = require('./4.1_download_result_json.js');
const downloadResultRVTHandler = require('./4.2_download_result_rvt.js');

function initializeServer(io) {
    // Create Express app
    const app = express();

    // Store io instance for use in routes
    app.set('io', io);

    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

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

    // Serve static files (HTML)
    app.use(express.static('.'));

    // Set up all the unified routes with API paths to match reference
    app.delete('/api/aps/account', clearDAResourcesHandler);
    app.delete('/api/aps/bucket', clearOSSBucketHandler);
    app.post('/api/aps/token', getAccessTokenHandler);
    app.get('/api/aps/nickname', getNicknameHandler);
    app.post('/api/aps/nickname', setNicknameHandler);
    app.post('/api/aps/appbundle', upload.single('appBundleFile'), uploadAppBundleHandler);
    app.post('/api/aps/activity', createActivityHandler);
    app.post('/api/aps/bucket', createOSSBucketHandler);
    // Note: /api/aps/upload/single route is handled by individual upload handlers above
    app.post('/api/aps/upload/revit', upload.single('rvtFile'), uploadRevitFileHandler);
    app.post('/api/aps/upload/dynamo', upload.single('dynFile'), uploadDynamoFileHandler);
    app.post('/api/aps/convert/dyn-to-json', upload.single('dynFile'), convertDynamoToJSONHandler);
    app.post('/api/aps/upload/dyn-to-json-preview', upload.single('dynFile'), convertDynamoToJSONHandler);
    app.post('/api/aps/upload/json', uploadJSONFileHandler);
    // JSON content upload route (inline to match reference)
    app.post('/api/aps/upload/json-content', async (req, res) => {
        const { socketId, jsonContent } = req.body;
        const io = req.app.get('io');
        
        if (!jsonContent) {
            return res.status(400).json({ error: 'No JSON content provided' });
        }

        try {
            const axios = require('axios');
            
            // Get auth token
            async function getAutodeskToken() {
                const tokenRequestBody = new URLSearchParams({
                    'grant_type': 'client_credentials',
                    'scope': 'bucket:create bucket:read bucket:delete data:read data:write code:all'
                });
                
                const base64Credentials = Buffer.from(`${process.env.APS_CLIENT_ID}:${process.env.APS_CLIENT_SECRET}`).toString('base64');
                const tokenHeaders = {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${base64Credentials}`
                };
                
                const response = await axios.post('https://developer.api.autodesk.com/authentication/v2/token', tokenRequestBody, { headers: tokenHeaders });
                return response.data.access_token;
            }
            
            const token = await getAutodeskToken();
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
            
            const bucketName = process.env.APS_BUCKET_NAME;
            
            if (io && socketId) {
                io.to(socketId).emit('status', { message: '--- Step: UPLOAD JSON CONTENT ---' });
                io.to(socketId).emit('status', { message: 'Uploading run.json to bucket...' });
            }
            
            // Upload JSON content directly to bucket
            await axios.put(
                `https://developer.api.autodesk.com/oss/v2/buckets/${bucketName}/objects/run.json`,
                jsonContent,
                { headers: { ...headers, 'Content-Type': 'application/json' } }
            );
            
            if (io && socketId) {
                io.to(socketId).emit('status', { message: 'run.json uploaded successfully.' });
            }
            
            res.status(200).json({ 
                message: 'JSON content uploaded successfully as run.json',
                fileName: 'run.json'
            });

        } catch (err) {
            const message = err.response ? JSON.stringify(err.response.data, null, 2) : err.message;
            if (io && socketId) {
                io.to(socketId).emit('status', { message: `--- ERROR ---` });
                io.to(socketId).emit('status', { message: message });
            }
            res.status(err.response?.status || 500).json({
                error: 'Failed to upload JSON content.',
                details: err.response?.data || message
            });
        }
    });
    app.post('/api/aps/upload/python', upload.single('pythonFile'), uploadPythonDependenciesHandler);
    app.post('/api/aps/upload/packages', upload.single('packagesFile'), uploadPackagesHandler);
    app.post('/api/aps/workitem', runWorkitemHandler);
    app.get('/api/aps/download/result-json', downloadResultJSONHandler);
    app.get('/api/aps/download/result-rvt', downloadResultRVTHandler);

    // Keep legacy routes for backward compatibility
    app.delete('/clear-da-resources', clearDAResourcesHandler);
    app.delete('/clear-oss-bucket', clearOSSBucketHandler);
    app.post('/get-access-token', getAccessTokenHandler);
    app.get('/get-nickname', getNicknameHandler);
    app.post('/set-nickname', setNicknameHandler);
    app.post('/upload-appbundle', upload.single('appBundleFile'), uploadAppBundleHandler);
    app.post('/create-activity', createActivityHandler);
    app.post('/create-oss-bucket', createOSSBucketHandler);
    app.post('/upload-revit-file', upload.single('rvtFile'), uploadRevitFileHandler);
    app.post('/upload-dynamo-file', upload.single('dynFile'), uploadDynamoFileHandler);
    app.post('/convert-dynamo-to-json', convertDynamoToJSONHandler);
    app.post('/upload-json-file', uploadJSONFileHandler);
    app.post('/upload-python-dependencies', upload.single('pythonFile'), uploadPythonDependenciesHandler);
    app.post('/upload-packages', upload.single('packagesFile'), uploadPackagesHandler);
    app.post('/run-workitem', runWorkitemHandler);
    app.get('/download-result-json', downloadResultJSONHandler);
    app.get('/download-result-rvt', downloadResultRVTHandler);

// Source code viewing route
app.get('/view-source/:filename', (req, res) => {
    const filename = req.params.filename;
    const allowedFiles = [
        '0.1_clear_da_resources.js', '0.2_clear_oss_bucket.js',
        '1.1_get_access_token.js', '1.2_get_nickname.js', '1.3_set_nickname.js',
        '1.5_upload_appbundle.js', '1.6_create_activity.js', '1.7_create_oss_bucket.js',
        '2.1_upload_revit_file.js', '2.2_upload_dynamo_file.js', '2.3_convert_dynamo_to_json.js',
        '2.4_upload_json_file.js', '2.5_upload_python_dependencies.js', '2.6_upload_packages.js',
        '3.1_run_workitem.js', '4.1_download_result_json.js', '4.2_download_result_rvt.js'
    ];
    
    if (!allowedFiles.includes(filename)) {
        return res.status(404).send('File not found');
    }
    
    const fs = require('fs');
    const filePath = path.join(__dirname, filename);
    
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        res.type('text/plain').send(fileContent);
    } catch (error) {
        res.status(404).send('File not found');
    }
});

    // Error handling
    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(err.status || 500).json({
            message: err.message,
            error: err
        });
    });

    return app;
}

module.exports = initializeServer;