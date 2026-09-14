const {onRequest}=require('firebase-functions/v2/https');
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {defineSecret}=require('firebase-functions/params');
const {initializeApp}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
const {discordOAuthHandler}=require('./discord-oauth');
initializeApp();
const DISCORD_CLIENT_ID=defineSecret('DISCORD_CLIENT_ID');
const DISCORD_CLIENT_SECRET=defineSecret('DISCORD_CLIENT_SECRET');
const DISCORD_REDIRECT_URI=defineSecret('DISCORD_REDIRECT_URI');
const DISCORD_STATE_SECRET=defineSecret('DISCORD_STATE_SECRET');
const JMB_FRONTEND_URL=defineSecret('JMB_FRONTEND_URL');
exports.discordOAuth=onRequest({region:'us-central1',cors:false,secrets:[DISCORD_CLIENT_ID,DISCORD_CLIENT_SECRET,DISCORD_REDIRECT_URI,DISCORD_STATE_SECRET,JMB_FRONTEND_URL]},discordOAuthHandler);

function isOwner(request){return request.auth?.token?.email?.toLowerCase()==='jobinmathewbiju@gmail.com'}
function isStaff(request){return !!request.auth&&(isOwner(request)||request.auth.token.admin===true)}
exports.sendGlobalChat=onCall({region:'us-central1'},async request=>{
  if(!request.auth)throw new HttpsError('unauthenticated','Please sign in to use Global Chat.');
  const text=String(request.data?.text||'').replace(/[<>]/g,'').trim();
  if(text.length<1||text.length>500)throw new HttpsError('invalid-argument','Messages must be 1–500 characters.');
  const role=isOwner(request)?'Owner':request.auth.token.admin===true?'Admin':'Member';
  const displayName=String(request.auth.token.name||request.auth.token.email?.split('@')[0]||'JMB User').slice(0,60);
  const ref=await getFirestore().collection('globalChat').add({uid:request.auth.uid,displayName,text,role,createdAt:FieldValue.serverTimestamp()});
  return {id:ref.id};
});
exports.setAdminRole=onCall({region:'us-central1'},async request=>{
  if(!isOwner(request))throw new HttpsError('permission-denied','Only the owner can manage staff.');
  const email=String(request.data?.email||'').trim().toLowerCase();
  const admin=request.data?.admin===true;
  if(!email||email.length>320)throw new HttpsError('invalid-argument','Enter a valid account email.');
  if(email==='jobinmathewbiju@gmail.com')throw new HttpsError('failed-precondition','The owner account is always the owner.');
  let target;try{target=await getAuth().getUserByEmail(email)}catch{throw new HttpsError('not-found','No JMBHUB account was found with that email.')}
  const claims={...(target.customClaims||{})};
  if(admin)claims.admin=true;else delete claims.admin;
  await getAuth().setCustomUserClaims(target.uid,claims);
  return {email,admin};
});
