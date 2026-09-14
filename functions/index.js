const {onRequest}=require('firebase-functions/v2/https');
const {defineSecret}=require('firebase-functions/params');
const {initializeApp}=require('firebase-admin/app');
const {discordOAuthHandler}=require('./discord-oauth');

initializeApp();
const DISCORD_CLIENT_ID=defineSecret('DISCORD_CLIENT_ID');
const DISCORD_CLIENT_SECRET=defineSecret('DISCORD_CLIENT_SECRET');
const DISCORD_REDIRECT_URI=defineSecret('DISCORD_REDIRECT_URI');
const DISCORD_STATE_SECRET=defineSecret('DISCORD_STATE_SECRET');
const JMB_FRONTEND_URL=defineSecret('JMB_FRONTEND_URL');

exports.discordOAuth=onRequest({region:'us-central1',cors:false,secrets:[DISCORD_CLIENT_ID,DISCORD_CLIENT_SECRET,DISCORD_REDIRECT_URI,DISCORD_STATE_SECRET,JMB_FRONTEND_URL]},discordOAuthHandler);
