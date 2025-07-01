const express = require('express');
const axios = require('axios');
const { getHeaders } = require('../services/aps.js');
const { DA_BASE_URL, DA_CONFIG } = require('../config.js');

let router = express.Router();

// GET /api/aps/activity - Get existing Activities
router.get('/', async (req, res) => {
    try {
        const headers = await getHeaders();
        const response = await axios.get(`${DA_BASE_URL}/activities`, { headers });
        
        // Filter to only show Activities that belong to this nickname
        const myActivities = response.data.data.filter(id => id.startsWith(`${DA_CONFIG.NICKNAME}.`));
        const cleanNames = myActivities.map(id => id.replace(`${DA_CONFIG.NICKNAME}.`, ''));
        
        res.status(200).json({ activities: cleanNames });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/aps/activity - Create/update Activity
router.post('/', async (req, res) => {
    const { socketId } = req.body;
    const io = req.app.get('io');
    
    try {
        const headers = await getHeaders();
        const qualifiedActivityId = `${DA_CONFIG.NICKNAME}.${DA_CONFIG.ACTIVITY_NAME}`;
        
        io.to(socketId).emit('status', { message: '--- Step: CREATE ACTIVITY ---' });
        
        // 1. Create the Activity (or new version if it exists)
        io.to(socketId).emit('status', { message: `Creating Activity: ${qualifiedActivityId}` });
        
        const activityData = {
            id: DA_CONFIG.ACTIVITY_NAME,
            commandLine: [`$(engine.path)\\\\revitcoreconsole.exe /i "$(args[rvtFile].path)" /al "$(appbundles[${DA_CONFIG.APP_BUNDLE_NAME}].path)"`],
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
            engine: DA_CONFIG.ENGINE,
            appbundles: [`${DA_CONFIG.NICKNAME}.${DA_CONFIG.APP_BUNDLE_NAME}+${DA_CONFIG.ACTIVITY_ALIAS}`],
            description: `Activity for Dynamo Revit, version ${new Date().toISOString()}`
        };
        
        const newActivity = await axios.post(`${DA_BASE_URL}/activities`, activityData, { headers });
        io.to(socketId).emit('status', { message: `Activity created (version ${newActivity.data.version}).` });
        
        // 2. Create/update alias
        io.to(socketId).emit('status', { message: `Creating alias '${DA_CONFIG.ACTIVITY_ALIAS}' for version ${newActivity.data.version}...` });
        
        try {
            // Try to create the alias
            const aliasResponse = await axios.post(
                `${DA_BASE_URL}/activities/${DA_CONFIG.ACTIVITY_NAME}/aliases`,
                { id: DA_CONFIG.ACTIVITY_ALIAS, version: newActivity.data.version },
                { headers }
            );
            io.to(socketId).emit('status', { message: `Activity alias '${DA_CONFIG.ACTIVITY_ALIAS}' created.` });
        } catch (aliasErr) {
            if (aliasErr.response && aliasErr.response.status === 409) {
                // Alias already exists, update it
                io.to(socketId).emit('status', { message: `Alias exists, updating to version ${newActivity.data.version}...` });
                await axios.patch(
                    `${DA_BASE_URL}/activities/${DA_CONFIG.ACTIVITY_NAME}/aliases/${DA_CONFIG.ACTIVITY_ALIAS}`,
                    { version: newActivity.data.version },
                    { headers }
                );
                io.to(socketId).emit('status', { message: `Activity alias '${DA_CONFIG.ACTIVITY_ALIAS}' updated.` });
            } else {
                throw aliasErr;
            }
        }

        io.to(socketId).emit('status', { message: 'Activity setup complete.' });
        res.status(200).json({ 
            message: 'Activity created successfully',
            version: newActivity.data.version,
            alias: DA_CONFIG.ACTIVITY_ALIAS
        });

    } catch (err) {
        const message = err.response ? JSON.stringify(err.response.data, null, 2) : err.message;
        io.to(socketId).emit('status', { message: `--- ERROR ---<br/>${message}` });
        res.status(err.response?.status || 500).json({
            error: 'Failed to create Activity.',
            details: err.response?.data || message
        });
    }
});

module.exports = router; 