const express = require('express');
const axios = require('axios');
const { getHeaders } = require('../services/aps.js');
const { DA_BASE_URL } = require('../config.js');

const router = express.Router();

router.delete('/', async (req, res) => {
    const { socketId } = req.body;
    const io = req.app.get('io');

    try {
        const headers = await getHeaders();

        io.to(socketId).emit('status', { message: '--- Step: CLEAR ACCOUNT (NICKNAME/APPBUNDLES/ACTIVITIES) ---' });

        io.to(socketId).emit('status', { message: `Deleting Forge App...` });
        const deleteResponse = await axios.delete(`${DA_BASE_URL}/forgeapps/me`, { headers });
        io.to(socketId).emit('status', { message: 'Forge App deleted.' });
        res.status(200).json({ message: 'Account cleared successfully' });

    } catch (err) {
        const message = err.response ? JSON.stringify(err.response.data, null, 2) : err.message;
        io.to(socketId).emit('status', { message: `--- ERROR ---<br/>${message}` });
        res.status(err.response?.status || 500).json({
            error: 'Failed to clear account.',
            details: err.response?.data || message
        });
    }
});

module.exports = router; 