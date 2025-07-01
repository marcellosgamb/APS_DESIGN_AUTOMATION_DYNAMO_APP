// debug_activities.js - Debug utility to list activities and diagnose workitem issues
require('dotenv').config();
const axios = require('axios');

// Load environment variables
const APS_CLIENT_ID = process.env.APS_CLIENT_ID;
const APS_CLIENT_SECRET = process.env.APS_CLIENT_SECRET;
const APS_NICKNAME = process.env.APS_NICKNAME;
const APS_ACTIVITY_NAME = process.env.APS_ACTIVITY_NAME;

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

async function debugActivities() {
    console.log('🔍 DEBUG: Activities Analysis');
    console.log('==========================================');
    
    try {
        const headers = await getHeaders();
        
        // List all activities
        console.log('\n📋 Listing all activities...');
        const activitiesResponse = await axios.get('https://developer.api.autodesk.com/da/us-east/v3/activities', { headers });
        const activities = activitiesResponse.data.data;
        
        console.log(`\n📊 Found ${activities.length} activities:`);
        activities.forEach(activity => {
            console.log(`   • ${activity}`);
        });
        
        // Check the specific activity we're trying to use
        const expectedActivityId = `${APS_NICKNAME}.${APS_ACTIVITY_NAME}+default`;
        console.log(`\n🎯 Expected activity ID: "${expectedActivityId}"`);
        
        const activityExists = activities.includes(expectedActivityId);
        console.log(`✅ Activity exists: ${activityExists}`);
        
        if (!activityExists) {
            console.log('\n❌ PROBLEM FOUND: The activity does not exist!');
            console.log('💡 SOLUTIONS:');
            console.log('   1. Make sure you ran "Create Activity" step first');
            console.log('   2. Check your environment variables:');
            console.log(`      APS_NICKNAME="${APS_NICKNAME}"`);
            console.log(`      APS_ACTIVITY_NAME="${APS_ACTIVITY_NAME}"`);
            console.log('   3. Look for activities with similar names in the list above');
        } else {
            console.log('\n✅ Activity exists - workitem should work!');
        }
        
        // Check for similar activities
        const similarActivities = activities.filter(act => 
            act.includes(APS_NICKNAME) || 
            act.includes(APS_ACTIVITY_NAME) || 
            act.toLowerCase().includes('activity')
        );
        
        if (similarActivities.length > 0) {
            console.log('\n🔍 Similar activities found:');
            similarActivities.forEach(activity => {
                console.log(`   • ${activity}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error debugging activities:', error.message);
        if (error.response) {
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Run the debug
debugActivities(); 