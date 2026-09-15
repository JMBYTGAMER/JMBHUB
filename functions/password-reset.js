const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {defineSecret}=require('firebase-functions/params');
const {getAuth}=require('firebase-admin/auth');
const {getFirestore,Timestamp}=require('firebase-admin/firestore');
const {randomBytes,randomInt,createHash}=require('crypto');
const nodemailer=require('nodemailer');

const SMTP_HOST=defineSecret('SMTP_HOST');
const SMTP_PORT=defineSecret('SMTP_PORT');
const SMTP_USER=defineSecret('SMTP_USER');
const SMTP_PASS=defineSecret('SMTP_PASS');
const RESET_FROM_EMAIL=defineSecret('RESET_FROM_EMAIL');
const RESET_FRONTEND_URL=defineSecret('RESET_FRONTEND_URL');

const db=()=>getFirestore();
const sha=value=>createHash('sha256').update(String(value)).digest('hex');
const cleanEmail=value=>String(value||'').trim().toLowerCase();
const frontend=()=>String(RESET_FRONTEND_URL.value()||'https://www.jmbhost.qzz.io').replace(/\/$/,'');

function mailer(){
  return nodemailer.createTransport({
    host:SMTP_HOST.value(),
    port:Number(SMTP_PORT.value()||587),
    secure:Number(SMTP_PORT.value()||587)===465,
    auth:{user:SMTP_USER.value(),pass:SMTP_PASS.value()}
  });
}

function emailHtml({name,otp,link}){
  const safeName=String(name||'there').replace(/[<>]/g,'');
  return `<!doctype html><html><body style="margin:0;background:#080b15;color:#eef2ff;font-family:Arial,sans-serif"><div style="max-width:560px;margin:0 auto;padding:28px 18px"><div style="background:#121827;border:1px solid #29334d;border-radius:22px;padding:28px"><div style="font-size:14px;letter-spacing:4px;color:#9b8cff;font-weight:800">JMB HUB</div><h1 style="margin:18px 0 8px;font-size:28px">Reset your password</h1><p style="color:#aeb8d2;line-height:1.6">Hi ${safeName}, we received a request to reset your JMBHUB password.</p><div style="margin:22px 0;padding:18px;border-radius:16px;background:#1a2234;text-align:center"><div style="font-size:12px;color:#8e9ab8;letter-spacing:1px">YOUR 6-DIGIT CODE</div><div style="font-size:34px;letter-spacing:8px;font-weight:900;margin-top:8px">${otp}</div></div><p style="color:#aeb8d2;line-height:1.6">Or use the button below. The code and verification link expire in <b style="color:#fff">5 minutes</b>.</p><p style="text-align:center;margin:26px 0"><a href="${link}" style="display:inline-block;background:#7857ff;color:#fff;text-decoration:none;font-weight:800;padding:14px 24px;border-radius:12px">Verify now</a></p><p style="font-size:12px;color:#6f7b98;line-height:1.6">If you did not request this, you can safely ignore this email. Never share this code with anyone.</p></div></div></body></html>`;
}

exports.requestPasswordReset=onCall({region:'us-central1',secrets:[SMTP_HOST,SMTP_PORT,SMTP_USER,SMTP_PASS,RESET_FROM_EMAIL,RESET_FRONTEND_URL]},async request=>{
  const email=cleanEmail(request.data?.email);
  const requestId=randomBytes(16).toString('hex');
  if(!email||email.length>320)return {requestId,expiresIn:300};

  let user=null;
  try{user=await getAuth().getUserByEmail(email)}catch(error){
    if(error?.code!=='auth/user-not-found')console.warn('[JMBHUB] Password reset lookup failed:',error?.code||error);
  }

  // Always return the same public response so account existence is not exposed.
  if(!user)return {requestId,expiresIn:300};

  const token=randomBytes(32).toString('base64url');
  const otp=String(randomInt(100000,1000000));
  const expiresAt=Timestamp.fromMillis(Date.now()+5*60*1000);
  const ref=db().collection('passwordResetRequests').doc(requestId);
  await ref.set({uid:user.uid,email,tokenHash:sha(token),otpHash:sha(`${requestId}:${otp}`),createdAt:Timestamp.now(),expiresAt,attempts:0,used:false});

  const link=`${frontend()}/pages/reset-password.html?request=${encodeURIComponent(requestId)}&token=${encodeURIComponent(token)}`;
  try{
    await mailer().sendMail({
      from:RESET_FROM_EMAIL.value(),
      to:email,
      subject:'JMBHUB password reset — 5 minute code',
      html:emailHtml({name:user.displayName||email.split('@')[0],otp,link})
    });
  }catch(error){
    await ref.delete().catch(()=>{});
    console.error('[JMBHUB] Password reset email failed:',error);
    throw new HttpsError('internal','We could not send the reset email right now.');
  }
  return {requestId,expiresIn:300};
});

exports.verifyPasswordReset=onCall({region:'us-central1'},async request=>{
  const requestId=String(request.data?.requestId||'').trim();
  const token=String(request.data?.token||'').trim();
  if(!/^[a-f0-9]{32}$/.test(requestId))return {valid:false};
  const snap=await db().collection('passwordResetRequests').doc(requestId).get();
  if(!snap.exists)return {valid:false};
  const data=snap.data();
  const remaining=Math.max(0,Math.ceil((data.expiresAt.toMillis()-Date.now())/1000));
  if(data.used||remaining<=0){if(remaining<=0)await snap.ref.delete().catch(()=>{});return {valid:false};}
  if(!token){return {valid:true,requiresOtp:true,email:data.email,expiresIn:remaining};}
  if(token.length<30||sha(token)!==data.tokenHash)return {valid:false};
  return {valid:true,requiresOtp:false,email:data.email,expiresIn:remaining};
});

exports.completePasswordReset=onCall({region:'us-central1'},async request=>{
  const requestId=String(request.data?.requestId||'').trim();
  const token=String(request.data?.token||'').trim();
  const otp=String(request.data?.otp||'').replace(/\D/g,'').slice(0,6);
  const newPassword=String(request.data?.newPassword||'');
  if(!/^[a-f0-9]{32}$/.test(requestId))throw new HttpsError('invalid-argument','That reset request is invalid.');
  if(newPassword.length<8)throw new HttpsError('invalid-argument','Use at least 8 characters for your new password.');

  const ref=db().collection('passwordResetRequests').doc(requestId);
  const snap=await ref.get();
  if(!snap.exists)throw new HttpsError('failed-precondition','This reset request has expired. Please request a new one.');
  const data=snap.data();
  const remaining=data.expiresAt.toMillis()-Date.now();
  if(data.used||remaining<=0){await ref.delete().catch(()=>{});throw new HttpsError('failed-precondition','This reset request has expired. Please request a new one.');}
  if(Number(data.attempts||0)>=5)throw new HttpsError('resource-exhausted','Too many verification attempts. Request a new code.');

  const tokenOk=token.length>=30&&sha(token)===data.tokenHash;
  const otpOk=/^\d{6}$/.test(otp)&&sha(`${requestId}:${otp}`)===data.otpHash;
  if(!tokenOk&&!otpOk){await ref.update({attempts:Number(data.attempts||0)+1});throw new HttpsError('permission-denied','The verification code or link is not valid.');}

  try{await getAuth().updateUser(data.uid,{password:newPassword});await getAuth().revokeRefreshTokens(data.uid);}
  catch(error){console.error('[JMBHUB] Password update failed:',error);throw new HttpsError('internal','We could not update the password. Please try again.');}
  await ref.delete();
  return {ok:true,email:data.email};
});
