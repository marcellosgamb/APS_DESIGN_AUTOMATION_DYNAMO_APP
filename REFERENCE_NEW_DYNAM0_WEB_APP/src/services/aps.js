const axios = require('axios');
const {
    APS_CLIENT_ID,
    APS_CLIENT_SECRET
} = require('../config');

const AUTH_URL = 'https://developer.api.autodesk.com/authentication/v2/token';
const MODEL_DERIVATIVE_URL = 'https://developer.api.autodesk.com/modelderivative/v2';
let tokenCache = null;

/**
 * Gets a 2-legged authentication token from APS.
 * Caches the token for reuse.
 */
async function getToken() {
    if (tokenCache && tokenCache.expires_at > Date.now()) {
        return tokenCache;
    }

    const response = await axios.post(
        AUTH_URL,
        new URLSearchParams({
            grant_type: 'client_credentials',
            scope: 'bucket:create bucket:read bucket:delete data:read data:write code:all'
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${APS_CLIENT_ID}:${APS_CLIENT_SECRET}`).toString('base64')}`
            }
        }
    );

    tokenCache = {
        access_token: response.data.access_token,
        expires_at: Date.now() + response.data.expires_in * 1000
    };
    return tokenCache;
}

/**
 * Gets the standard headers for making APS API calls.
 * @returns {Promise<{'Authorization': string}>}
 */
async function getHeaders() {
    const token = await getToken();
    return {
        'Authorization': `Bearer ${token.access_token}`
    };
}

/**
 * Converts an Object ID to a Base64-encoded URN
 * @param {string} objectId - The Object ID from OSS
 * @returns {string} Base64-encoded URN
 */
function urnify(objectId) {
    return Buffer.from(objectId).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Translates a model for viewing in the Autodesk Viewer
 * @param {string} urn - Base64-encoded URN of the object
 * @param {string} [rootFilename] - Root filename for ZIP files
 * @returns {Promise<Object>} Translation result
 */
async function translateObject(urn, rootFilename) {
    const headers = await getHeaders();
    headers['Content-Type'] = 'application/json';
    
    const body = {
        input: {
            urn: urn
        },
        output: {
            formats: [{
                type: 'svf2',
                views: ['2d', '3d']
            }]
        }
    };
    
    if (rootFilename) {
        body.input.rootFilename = rootFilename;
    }
    
    const response = await axios.post(`${MODEL_DERIVATIVE_URL}/designdata/job`, body, { headers });
    return response.data;
}

/**
 * Gets the translation status/manifest for a model
 * @param {string} urn - Base64-encoded URN of the object
 * @returns {Promise<Object>} Manifest data
 */
async function getManifest(urn) {
    try {
        const headers = await getHeaders();
        const response = await axios.get(`${MODEL_DERIVATIVE_URL}/designdata/${urn}/manifest`, { headers });
        return response.data;
    } catch (err) {
        if (err.response && err.response.status === 404) {
            return null;
        }
        throw err;
    }
}

/**
 * Lists objects in the OSS bucket
 * @param {string} bucketName - Name of the bucket
 * @returns {Promise<Array>} Array of objects
 */
async function listObjects(bucketName) {
    const headers = await getHeaders();
    const response = await axios.get(`https://developer.api.autodesk.com/oss/v2/buckets/${bucketName}/objects`, { headers });
    return response.data.items || [];
}

module.exports = {
    getToken,
    getHeaders,
    urnify,
    translateObject,
    getManifest,
    listObjects
}; 