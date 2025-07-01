const express = require('express');
const axios = require('axios');
const { getHeaders } = require('../services/aps.js');
const { DA_BASE_URL, DA_CONFIG } = require('../config.js');

let router = express.Router();

// GET /api/aps/nickname - Get the current nickname
router.get('/', async (req, res) => {
    try {
        const headers = await getHeaders();
        const response = await axios.get(`${DA_BASE_URL}/forgeapps/me`, { headers });
        res.status(200).json(response.data);
    } catch (err) {
        if (err.response && err.response.status === 404) {
            // Nickname not being set is a valid state, not an error.
            res.status(404).json({ nickname: 'Not found' });
        } else {
            // Other errors are actual problems.
            res.status(500).json({ error: err.message });
        }
    }
});

// POST /api/aps/nickname - Create/update the nickname
router.post('/', async (req, res, next) => {
    const { socketId } = req.body;
    const io = req.app.get('io');
    const headers = await getHeaders();

    try {
        io.to(socketId).emit('status', { message: '--- Step: ENSURE NICKNAME ---' });

        // 1. Ensure nickname is set
        io.to(socketId).emit('status', { message: 'Setting APS Nickname...' });
        const patchResponse = await axios.patch(`${DA_BASE_URL}/forgeapps/me`, { nickname: DA_CONFIG.NICKNAME }, { headers });
        io.to(socketId).emit('status', { message: `Nickname set successfully.` });

        res.status(200).json(patchResponse.data);
    } catch (err) {
        const message = err.response ? JSON.stringify(err.response.data, null, 2) : err.message;
        io.to(socketId).emit('status', { message: `--- ERROR ---<br/>${message}` });
        // Send a failure response to the client
        res.status(err.response?.status || 500).json({
            error: 'Failed to set nickname.',
            details: err.response?.data || message
        });
    }
});

module.exports = router; 