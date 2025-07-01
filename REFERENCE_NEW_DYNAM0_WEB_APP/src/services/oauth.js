const ForgeAPI = require('forge-apis');
const {
    APS_CLIENT_ID,
    APS_CLIENT_SECRET
} = require('../config');

// Tokens are cached in memory
let cache = {
    client: null,
    token: null
};

// Singleton getter for the client
async function getClient() {
    if (!cache.client) {
        cache.client = new ForgeAPI.AuthClientTwoLegged(
            APS_CLIENT_ID,
            APS_CLIENT_SECRET,
            ['bucket:read', 'bucket:create', 'data:read', 'data:write', 'data:create', 'code:all'],
            true
        );
    }
    if (!cache.token || cache.token.expires_at < Date.now()) {
        cache.token = await cache.client.authenticate();
    }
    return cache.client;
}

module.exports = {
    getClient
}; 