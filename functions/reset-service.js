const crypto = require('crypto');
const nodemailer = require('nodemailer');
const {getAuth} = require('firebase-admin/auth');
const {getFirestore, FieldValue, Timestamp} = require('firebase-admin/firestore');

const RESET_TTL_MS = 5 * 60 * 1000;
const RESET_COLLECTION = 'passwordResets';

function hash(value){return crypto.createHash('sha256').update(String(value)).digest('hex')}
function randomOtp(){return String(crypto.randomInt(100000,1000000))}
function safeEmail(value){return String(value||'').trim().toLowerCase().slice(0,320)}
function frontendBase(){return String(process.env.RESET_FRONTEND_URL||'https://www.jmbhost.qzz.io').replace(/\/$/,'')}

function mailer(){
  const host=process.env.SMTP_HOST;
  const port=Number(process.env.SMTP_PORT||465);
  const user=process.env.SMTP_USER;
  const pass=process.env.SMTP_PASS;
  if(!host||!user||!pass) throw new Error('SMTP is not configured');
  return nodemailer.createTransport({host,port,secure:port===465,auth:{user,pass}});
}

async function sendResetEmail({to,otp,token}){
  const verifyUrl=`${frontendBase()}/pages/reset-password.html?token=${encodeURIComponent(token)}`;
  const from=process.env.RESET_FROM_EMAIL||process.env.SMTP_USER;
  const text=[
    'JMBHUB password reset',
    '',
    `Your verification code is: ${otp}`,
    'This code expires in 5 minutes.',
    '',
    `Verify now: ${verifyUrl}`,
    '',
    'If you did not request this, you can safely ignore this email.'
  ].join('\n');
  const html=`<!doctype html><html><body style="margin:0;background:#0b0d18;color:#eef0ff;font-family:Arial,sans-serif;padding:28px"><div style="max-width:560px;margin:auto;background:#171a2b;border:1px solid #343955;border-radius:20px;padding:30px"><h1 style="margin:0 0 8px">JMBHUB</h1><p style="color:#aeb4cf">Password reset verification</p><p>Your verification code is:</p><div style="font-size:34px;letter-spacing:8px;font-weight:700;background:#0e1020;border-radius:14px;padding:16px;text-align:center">${otp}</div><p style="color:#aeb4cf">This code and verification link expire in <b>5 minutes</b>.</p><p><a href="${verifyUrl}" style="display:inline-block;background:#7457ff;color:#fff;text-decoration:none;padding:14px 22px;border-radius:12px;font-weight:700">Verify now</a></p><p style="font-size:13px;color:#858ba8">If you did not request a password reset, ignore this email.</p></div></body></html>`;
  await mailer().sendMail({from,to,subject:'JMBHUB password reset code',text,html});
}

async function createReset(email){
  const auth=getAuth();
  let user;
  try{user=await auth.getUserByEmail(email)}catch(e){return false}
  const otp=randomOtp();
  const token=crypto.randomBytes(32).toString('hex');
  const now=Date.now();
  const expires=Timestamp.fromMillis(now+RESET_TTL_MS);
  const db=getFirestore();
  const ref=db.collection(RESET_COLLECTION).doc(user.uid);
  await ref.set({uid:user.uid,email,otpHash:hash(otp),tokenHash:hash(token),expiresAt:expires,attempts:0,createdAt:FieldValue.serverTimestamp()});
  try{
    await sendResetEmail({to:email,otp,token});
  }catch(e){await ref.delete().catch(()=>{});throw e}
  return true;
}

async function getValid(ref){
  const snap=await ref.get();
  if(!snap.exists)return {ok:false,reason:'expired'};
  const d=snap.data();
  if(!d.expiresAt?.toMillis || d.expiresAt.toMillis()<=Date.now()){await ref.delete().catch(()=>{});return {ok:false,reason:'expired'}}
  return {ok:true,d};
}

async function verify({token,otp}){
  const cleanToken=String(token||'').trim();
  if(!cleanToken||cleanToken.length>200)return {ok:false,reason:'invalid'};
  const db=getFirestore();
  const users=await db.collection(RESET_COLLECTION).where('tokenHash','==',hash(cleanToken)).limit(1).get();
  if(users.empty)return {ok:false,reason:'invalid'};
  const ref=users.docs[0].ref;
  const current=await getValid(ref); if(!current.ok)return current;
  if(otp!=null && hash(String(otp).replace(/\D/g,''))!==current.d.otpHash){
    const attempts=Number(current.d.attempts||0)+1;
    if(attempts>=5)await ref.delete();else await ref.update({attempts});
    return {ok:false,reason:'code'};
  }
  return {ok:true,uid:current.d.uid,email:current.d.email,expiresAt:current.d.expiresAt};
}

module.exports={createReset,verify,RESET_TTL_MS,RESET_COLLECTION,hash};
