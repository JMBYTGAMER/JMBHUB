const {onRequest}=require('firebase-functions/v2/https');
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {defineSecret}=require('firebase-functions/params');
const {initializeApp}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
const {discordOAuthHandler}=require('./discord-oauth');
const {createReset,verify,RESET_TTL_MS,RESET_COLLECTION}=require('./reset-service');
initializeApp();
const DISCORD_CLIENT_ID=defineSecret('DISCORD_CLIENT_ID');
const DISCORD_CLIENT_SECRET=defineSecret('DISCORD_CLIENT_SECRET');
const DISCORD_REDIRECT_URI=defineSecret('DISCORD_REDIRECT_URI');
const DISCORD_STATE_SECRET=defineSecret('DISCORD_STATE_SECRET');
const JMB_FRONTEND_URL=defineSecret('JMB_FRONTEND_URL');
const SMTP_HOST=defineSecret('SMTP_HOST');
const SMTP_PORT=defineSecret('SMTP_PORT');
const SMTP_USER=defineSecret('SMTP_USER');
const SMTP_PASS=defineSecret('SMTP_PASS');
const RESET_FROM_EMAIL=defineSecret('RESET_FROM_EMAIL');
const RESET_FRONTEND_URL=defineSecret('RESET_FRONTEND_URL');
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

exports.requestPasswordReset=onCall({region:'us-central1',secrets:[SMTP_HOST,SMTP_PORT,SMTP_USER,SMTP_PASS,RESET_FROM_EMAIL,RESET_FRONTEND_URL]},async request=>{
  const email=String(request.data?.email||'').trim().toLowerCase();
  if(!email||email.length>320)throw new HttpsError('invalid-argument','Enter a valid email address.');
  try{await createReset(email)}catch(error){console.error('[JMBHUB] Password reset email failed:',error);throw new HttpsError('internal','We could not send the reset email right now. Please try again later.');}
  return {ok:true,message:'If an account exists for that email, a verification email has been sent.'};
});
exports.verifyPasswordReset=onCall({region:'us-central1'},async request=>{
  const token=String(request.data?.token||'').trim();
  const otp=String(request.data?.otp||'').replace(/\D/g,'');
  if(!token)throw new HttpsError('invalid-argument','This reset link is invalid.');
  const result=await verify({token,otp:otp||null});
  if(!result.ok){
    if(result.reason==='code')throw new HttpsError('permission-denied','That verification code is incorrect or has expired.');
    throw new HttpsError('permission-denied','This reset link has expired or is no longer valid.');
  }
  return {ok:true,email:result.email,expiresAt:result.expiresAt.toMillis()};
});
exports.completePasswordReset=onCall({region:'us-central1'},async request=>{
  const token=String(request.data?.token||'').trim();
  const password=String(request.data?.password||'');
  if(password.length<8||password.length>128)throw new HttpsError('invalid-argument','Password must be 8–128 characters.');
  const result=await verify({token});
  if(!result.ok)throw new HttpsError('permission-denied','This reset link has expired or is no longer valid.');
  await getAuth().updateUser(result.uid,{password});
  await getFirestore().collection(RESET_COLLECTION).doc(result.uid).delete().catch(()=>{});
  return {ok:true};
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
