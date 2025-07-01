// fix_activity.js - Utility to delete incorrectly created activity and recreate it properly
require('dotenv').config();
const axios = require('axios');

// Load environment variables
const APS_CLIENT_ID = process.env.APS_CLIENT_ID;
const APS_CLIENT_SECRET = process.env.APS_CLIENT_SECRET;
const APS_NICKNAME = process.env.APS_NICKNAME;
const APS_ACTIVITY_NAME = process.env.APS_ACTIVITY_NAME;
const APS_BUNDLE_APP_NAME = process.env.APS_BUNDLE_APP_NAME;

async function getAutodeskToken() {
    const tokenRequestBody = new URLSearchParams({
        'grant_type': 'client_credentials',
        'scope': 'bucket:create bucket:read bucket:delete data:read data:write code:all'
    });
    
    const base64Credentials = Buffer.from(`${APS_CLIENT_ID}:${APS_CLIENT_SECRET}`).toString('base64');
    const tokenHeaders = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${base64Credentials}`
    };
    
    try {
        const response = await axios.post('https://developer.api.autodesk.com/authentication/v2/token', tokenRequestBody, { headers: tokenHeaders });
        return response.data.access_token;
    } catch (error) {
        throw new Error('Could not get authentication token from Autodesk');
    }
}

async function getHeaders() {
    const token = await getAutodeskToken();
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

async function fixActivity() {
    console.log('🔧 FIXING ACTIVITY: Delete incorrect activity and recreate with proper alias');
    console.log('=================================================================');
    
    try {
        const headers = await getHeaders();
        
        const wrongActivityId = `${APS_NICKNAME}.${APS_ACTIVITY_NAME}+$LATEST`;
        const correctActivityId = `${APS_NICKNAME}.${APS_ACTIVITY_NAME}+default`;
        
        console.log(`\n🗑️  Step 1: Deleting incorrect activity: ${wrongActivityId}`);
        
        try {
            // Delete the activity with wrong alias
            await axios.delete(`https://developer.api.autodesk.com/da/us-east/v3/activities/${wrongActivityId}`, { headers });
            console.log('✅ Incorrect activity deleted successfully');
        } catch (deleteError) {
            console.log(`⚠️  Could not delete activity (might not exist): ${deleteError.message}`);
        }
        
        console.log(`\n🏗️  Step 2: Creating correct activity: ${correctActivityId}`);
        
        // Create activity definition (matching the working reference structure)
        const activityDefinition = {
            id: APS_ACTIVITY_NAME,
            commandLine: [`$(engine.path)\\\\revitcoreconsole.exe /i "$(args[rvtFile].path)" /al "$(appbundles[${APS_BUNDLE_APP_NAME}].path)"`],
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
            engine: "Autodesk.Revit+2026",
            appbundles: [`${APS_NICKNAME}.${APS_BUNDLE_APP_NAME}+default`],
            description: "Activity for running Dynamo scripts on Revit models"
        };
        
        // Create the activity
        const response = await axios.post(`https://developer.api.autodesk.com/da/us-east/v3/activities`, activityDefinition, { headers });
        console.log('✅ Activity created successfully');
        
        console.log(`\n🎯 Step 3: Creating default alias for activity version ${response.data.version}`);
        
        // Create the default alias
        const aliasData = {
            id: 'default',
            version: response.data.version
        };
        
        try {
            await axios.post(`https://developer.api.autodesk.com/da/us-east/v3/activities/${APS_ACTIVITY_NAME}/aliases`, aliasData, { headers });
            console.log('✅ Default alias created successfully');
        } catch (aliasError) {
            console.log(`⚠️  Alias might already exist: ${aliasError.message}`);
        }
        
        console.log(`\n🔍 Step 4: Verifying the fix...`);
        
        // List activities to verify
        const activitiesResponse = await axios.get('https://developer.api.autodesk.com/da/us-east/v3/activities', { headers });
        const activities = activitiesResponse.data.data;
        
        const correctActivityExists = activities.includes(correctActivityId);
        const wrongActivityExists = activities.includes(wrongActivityId);
        
        console.log(`✅ Correct activity exists (${correctActivityId}): ${correctActivityExists}`);
        console.log(`❌ Wrong activity exists (${wrongActivityId}): ${wrongActivityExists}`);
        
        if (correctActivityExists && !wrongActivityExists) {
            console.log('\n🎉 SUCCESS: Activity has been fixed! You can now run workitems.');
        } else {
            console.log('\n⚠️  WARNING: Activity fix may not be complete. Check the activity manually.');
        }
        
    } catch (error) {
        console.error('❌ Error fixing activity:', error.message);
        if (error.response) {
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Run the fix
fixActivity(); 