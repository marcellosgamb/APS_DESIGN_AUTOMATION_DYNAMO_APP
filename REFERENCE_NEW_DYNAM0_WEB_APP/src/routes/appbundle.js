const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');
const FormData = require('form-data');
const { getHeaders } = require('../services/aps.js');
const { DA_BASE_URL, DA_CONFIG } = require('../config.js');

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

let router = express.Router();

// GET /api/aps/appbundle - Get existing AppBundles
router.get('/', async (req, res) => {
    try {
        const headers = await getHeaders();
        const response = await axios.get(`${DA_BASE_URL}/appbundles`, { headers });
        
        // Filter to only show AppBundles that belong to this nickname
        const myAppBundles = response.data.data.filter(id => id.startsWith(`${DA_CONFIG.NICKNAME}.`));
        const cleanNames = myAppBundles.map(id => id.replace(`${DA_CONFIG.NICKNAME}.`, ''));
        
        res.status(200).json({ appbundles: cleanNames });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/aps/appbundle - Create/update AppBundle
router.post('/', upload.single('appBundleFile'), async (req, res) => {
    const { socketId } = req.body;
    const io = req.app.get('io');
    
    try {
        const headers = await getHeaders();
        const qualifiedAppBundleId = `${DA_CONFIG.NICKNAME}.${DA_CONFIG.APP_BUNDLE_NAME}`;
        
        io.to(socketId).emit('status', { message: '--- Step: CREATE APPBUNDLE ---' });
        
        // 1. Create the AppBundle (or new version if it exists)
        io.to(socketId).emit('status', { message: `Creating AppBundle: ${qualifiedAppBundleId}` });
        const appBundleData = {
            id: DA_CONFIG.APP_BUNDLE_NAME,
            engine: DA_CONFIG.ENGINE,
            description: `AppBundle for Dynamo Revit, version ${new Date().toISOString()}`
        };
        
        const newAppBundle = await axios.post(`${DA_BASE_URL}/appbundles`, appBundleData, { headers });
        io.to(socketId).emit('status', { message: `AppBundle created (version ${newAppBundle.data.version}). Uploading content...` });

        // 2. Upload the zip file
        const formData = new FormData();
        for (const key in newAppBundle.data.uploadParameters.formData) {
            formData.append(key, newAppBundle.data.uploadParameters.formData[key]);
        }
        
        // Require uploaded file
        if (!req.file) {
            throw new Error('No AppBundle file uploaded. Please select a file first.');
        }
        
        const bundlePath = req.file.path;
        io.to(socketId).emit('status', { message: `Using uploaded file: ${req.file.originalname}` });
        
        if (!fs.existsSync(bundlePath)) {
            throw new Error(`Bundle file not found: ${bundlePath}`);
        }
        
        formData.append('file', fs.createReadStream(bundlePath));
        
        await axios.post(newAppBundle.data.uploadParameters.endpointURL, formData, { 
            headers: formData.getHeaders() 
        });
        io.to(socketId).emit('status', { message: `AppBundle content uploaded.` });
        
        // 3. Create/update alias
        io.to(socketId).emit('status', { message: `Creating alias '${DA_CONFIG.ACTIVITY_ALIAS}' for version ${newAppBundle.data.version}...` });
        
        try {
            // Try to create the alias
            const aliasResponse = await axios.post(
                `${DA_BASE_URL}/appbundles/${DA_CONFIG.APP_BUNDLE_NAME}/aliases`,
                { id: DA_CONFIG.ACTIVITY_ALIAS, version: newAppBundle.data.version },
                { headers }
            );
            io.to(socketId).emit('status', { message: `AppBundle alias '${DA_CONFIG.ACTIVITY_ALIAS}' created.` });
        } catch (aliasErr) {
            if (aliasErr.response && aliasErr.response.status === 409) {
                // Alias already exists, update it
                io.to(socketId).emit('status', { message: `Alias exists, updating to version ${newAppBundle.data.version}...` });
                await axios.patch(
                    `${DA_BASE_URL}/appbundles/${DA_CONFIG.APP_BUNDLE_NAME}/aliases/${DA_CONFIG.ACTIVITY_ALIAS}`,
                    { version: newAppBundle.data.version },
                    { headers }
                );
                io.to(socketId).emit('status', { message: `AppBundle alias '${DA_CONFIG.ACTIVITY_ALIAS}' updated.` });
            } else {
                throw aliasErr;
            }
        }

        io.to(socketId).emit('status', { message: 'AppBundle setup complete.' });
        res.status(200).json({ 
            message: 'AppBundle created successfully',
            version: newAppBundle.data.version,
            alias: DA_CONFIG.ACTIVITY_ALIAS
        });

    } catch (err) {
        const message = err.response ? JSON.stringify(err.response.data, null, 2) : err.message;
        io.to(socketId).emit('status', { message: `--- ERROR ---<br/>${message}` });
        res.status(err.response?.status || 500).json({
            error: 'Failed to create AppBundle.',
            details: err.response?.data || message
        });
    } finally {
        // Clean up uploaded file
        if (req.file && req.file.path) {
            try { await fs.remove(req.file.path); } catch (e) {}
        }
    }
});

module.exports = router; 