const express = require('express');
const axios = require('axios');
const { getHeaders } = require('../services/aps.js');
const { DA_CONFIG } = require('../config.js');

let router = express.Router();

// GET /api/aps/bucket - Get bucket details
router.get('/', async (req, res) => {
    try {
        const headers = await getHeaders();
        const response = await axios.get(`https://developer.api.autodesk.com/oss/v2/buckets/${DA_CONFIG.BUCKET_NAME}/details`, { headers });
        res.status(200).json(response.data);
    } catch (err) {
        if (err.response && err.response.status === 404) {
            res.status(404).json({ message: 'Bucket not found' });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

// POST /api/aps/bucket - Create bucket
router.post('/', async (req, res) => {
    const { socketId } = req.body;
    const io = req.app.get('io');
    
    try {
        const headers = await getHeaders();
        
        io.to(socketId).emit('status', { message: '--- Step: CREATE BUCKET ---' });
        
        // Check if bucket already exists
        io.to(socketId).emit('status', { message: `Checking if bucket '${DA_CONFIG.BUCKET_NAME}' exists...` });
        
        try {
            const existingBucket = await axios.get(`https://developer.api.autodesk.com/oss/v2/buckets/${DA_CONFIG.BUCKET_NAME}/details`, { headers });
            io.to(socketId).emit('status', { message: `Bucket '${DA_CONFIG.BUCKET_NAME}' already exists.` });
            res.status(200).json({ 
                message: 'Bucket already exists',
                bucket: existingBucket.data
            });
            return;
        } catch (checkErr) {
            if (checkErr.response && checkErr.response.status === 404) {
                // Bucket doesn't exist, create it
                io.to(socketId).emit('status', { message: `Bucket not found, creating '${DA_CONFIG.BUCKET_NAME}'...` });
            } else {
                throw checkErr;
            }
        }
        
        // Create the bucket
        const bucketData = {
            bucketKey: DA_CONFIG.BUCKET_NAME,
            policyKey: "transient"
        };
        
        const newBucket = await axios.post('https://developer.api.autodesk.com/oss/v2/buckets', bucketData, { headers });
        io.to(socketId).emit('status', { message: `Bucket '${DA_CONFIG.BUCKET_NAME}' created successfully.` });
        
        res.status(200).json({ 
            message: 'Bucket created successfully',
            bucket: newBucket.data
        });

    } catch (err) {
        const message = err.response ? JSON.stringify(err.response.data, null, 2) : err.message;
        io.to(socketId).emit('status', { message: `--- ERROR ---<br/>${message}` });
        res.status(err.response?.status || 500).json({
            error: 'Failed to create bucket.',
            details: err.response?.data || message
        });
    }
});

// DELETE /api/aps/bucket - Delete the OSS bucket
router.delete('/', async (req, res, next) => {
    const { socketId } = req.body;
    const io = req.app.get('io');

    try {
        const headers = await getHeaders();

        io.to(socketId).emit('status', { message: '--- Step: DELETE BUCKET ---' });
        io.to(socketId).emit('status', { message: `Deleting bucket: ${DA_CONFIG.BUCKET_NAME}...` });

        const deleteResponse = await axios.delete(`https://developer.api.autodesk.com/oss/v2/buckets/${DA_CONFIG.BUCKET_NAME}`, { headers });
        
        io.to(socketId).emit('status', { message: 'Bucket deleted.' });
        res.status(200).json(deleteResponse.data);
    } catch (err) {
        if (err.response && err.response.status === 404) {
            io.to(socketId).emit('status', { message: 'Bucket not found, skipping delete.' });
            res.status(404).json({ message: 'Bucket not found.' });
            return;
        }
        const message = err.response ? JSON.stringify(err.response.data, null, 2) : err.message;
        io.to(socketId).emit('status', { message: `--- ERROR ---<br/>${message}` });
        next(err);
    }
});

module.exports = router; 