const express = require('express');
const { getToken } = require('../services/aps.js');

let router = express.Router();

router.get('/token', async (req, res, next) => {
    try {
        const token = await getToken();
        res.json({
            access_token: token.access_token,
            expires_in: 3600
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router; 