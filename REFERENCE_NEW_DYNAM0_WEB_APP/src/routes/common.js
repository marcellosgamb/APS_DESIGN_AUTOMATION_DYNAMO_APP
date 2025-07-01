const {
    APS_CLIENT_ID,
    APS_CLIENT_SECRET
} = require('../config');

let token;

async function getToken() {
    if (token && token.expires_at > Date.now()) {
        return token;
    }

    console.log('Fetching new 2-legged token...');
    const response = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: APS_CLIENT_ID,
            client_secret: APS_CLIENT_SECRET,
            grant_type: 'client_credentials',
            scope: 'code:all bucket:create bucket:read bucket:delete data:read data:write'
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get token: ${error}`);
    }

    const credentials = await response.json();
    token = {
        access_token: credentials.access_token,
        expires_at: Date.now() + credentials.expires_in * 1000
    };
    console.log('Token fetched successfully.');
    return token;
}

module.exports = {
    getToken
}; 