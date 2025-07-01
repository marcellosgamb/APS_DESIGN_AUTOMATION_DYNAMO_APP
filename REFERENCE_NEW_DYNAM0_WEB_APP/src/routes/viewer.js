const express = require('express');
const { getHeaders, urnify, translateObject, getManifest, listObjects } = require('../services/aps.js');
const { DA_CONFIG } = require('../config.js');

let router = express.Router();

// GET /api/models - List all models in the bucket (reference sample path)
router.get('/', async (req, res) => {
    try {
        const objects = await listObjects(DA_CONFIG.BUCKET_NAME);
        // Filter for RVT files and create URNs
        const models = objects
            .filter(obj => obj.objectKey.toLowerCase().endsWith('.rvt'))
            .map(obj => ({
                name: obj.objectKey,
                urn: urnify(obj.objectId),
                objectId: obj.objectId
            }));
        
        res.json(models);
    } catch (err) {
        console.error('Error listing models:', err);
        res.status(500).json({ 
            error: 'Failed to list models',
            details: err.response?.data || err.message 
        });
    }
});

// GET /api/models/:urn/status - Get translation status (reference sample path)
router.get('/:urn/status', async (req, res) => {
    try {
        const manifest = await getManifest(req.params.urn);
        if (manifest) {
            let messages = [];
            if (manifest.derivatives) {
                for (const derivative of manifest.derivatives) {
                    messages = messages.concat(derivative.messages || []);
                    if (derivative.children) {
                        for (const child of derivative.children) {
                            messages = messages.concat(child.messages || []);
                        }
                    }
                }
            }
            res.json({ 
                status: manifest.status, 
                progress: manifest.progress, 
                messages 
            });
        } else {
            res.json({ status: 'n/a' });
        }
    } catch (err) {
        console.error('Error getting model status:', err);
        res.status(500).json({ 
            error: 'Failed to get model status',
            details: err.response?.data || err.message 
        });
    }
});

// POST /api/viewer/models/:urn/translate - Start translation
router.post('/models/:urn/translate', async (req, res) => {
    try {
        const result = await translateObject(req.params.urn, req.body.rootFilename);
        res.json(result);
    } catch (err) {
        console.error('Error translating model:', err);
        res.status(500).json({ 
            error: 'Failed to translate model',
            details: err.response?.data || err.message 
        });
    }
});

// GET /api/viewer/token - Get access token for viewer
router.get('/token', async (req, res) => {
    try {
        const headers = await getHeaders();
        // Extract the token from the Authorization header
        const token = headers.Authorization.replace('Bearer ', '');
        res.json({ 
            access_token: token,
            expires_in: 3600 
        });
    } catch (err) {
        console.error('Error getting viewer token:', err);
        res.status(500).json({ 
            error: 'Failed to get access token',
            details: err.message 
        });
    }
});

module.exports = router; 