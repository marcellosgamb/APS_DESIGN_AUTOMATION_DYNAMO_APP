const express = require('express');
const { getHeaders } = require('../services/aps.js');

const router = express.Router();

router.post('/', async (req, res) => {
    const { socketId } = req.body;
    const io = req.app.get('io');

    try {
        io.to(socketId).emit('status', { message: '--- Step: GET ACCESS TOKEN ---' });
        // getHeaders handles fetching and caching the token. We just need to call it.
        const headers = await getHeaders();
        io.to(socketId).emit('status', { message: '2-legged access token obtained and cached on server.' });
        res.status(200).json({ message: 'Token obtained successfully' });
    } catch (err) {
        const message = err.response ? JSON.stringify(err.response.data, null, 2) : err.message;
        io.to(socketId).emit('status', { message: `--- ERROR ---<br/>${message}` });
        res.status(err.response?.status || 500).json({
            error: 'Failed to get token.',
            details: err.response?.data || message
        });
    }
});

module.exports = router; 