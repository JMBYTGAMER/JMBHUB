const crypto = require('crypto');
const {getAuth} = require('firebase-admin/auth');

function b64(v){return Buffer.from(v).toString('base64url')}
function signState(payload, secret){return b64(payload)+'.'+crypto.createHmac('sha256',secret).update(payload).digest('base64url')}
function verifyState(value, secret){try{const [payload,sig]=String(value).split('.');if(!payload||!sig)return null;const expected=crypto.createHmac('sha256',secret).update(payload).digest('base64url');if(!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;const data=JSON.parse(Buffer.from(payload,'base64url').toString());if(Date.now()-data.iat>10*60*1000)return null;return data}catch{return null}}

async function discordOAuthHandler(req,res){
  const clientId=process.env.DISCORD_CLIENT_ID;
  const clientSecret=process.env.DISCORD_CLIENT_SECRET;
  const redirectUri=process.env.DISCORD_REDIRECT_URI;
  const stateSecret=process.env.DISCORD_STATE_SECRET;
  const frontend=process.env.JMB_FRONTEND_URL;
  if(!clientId||!clientSecret||!redirectUri||!stateSecret||!frontend)return res.status(503).send('Sign-in is temporarily unavailable.');

  if(!req.query.code){
    const payload=JSON.stringify({iat:Date.now(),n:crypto.randomBytes(18).toString('hex')});
    const state=signState(payload,stateSecret);
    res.setHeader('Set-Cookie',`jmb_discord_state=${state}; Max-Age=600; Path=/; HttpOnly; Secure; SameSite=Lax`);
    const params=new URLSearchParams({client_id:clientId,response_type:'code',redirect_uri:redirectUri,scope:'identify email',state,prompt:'consent'});
    return res.redirect(`https://discord.com/oauth2/authorize?${params}`);
  }

  const cookies=Object.fromEntries(String(req.headers.cookie||'').split(';').filter(Boolean).map(x=>{const i=x.indexOf('=');return [x.slice(0,i).trim(),decodeURIComponent(x.slice(i+1))]}));
  if(!verifyState(req.query.state,stateSecret)||cookies.jmb_discord_state!==req.query.state)return res.status(400).send('Sign-in could not be verified. Please try again.');

  try{
    const tokenBody=new URLSearchParams({client_id:clientId,client_secret:clientSecret,grant_type:'authorization_code',code:String(req.query.code),redirect_uri:redirectUri});
    const tokenRes=await fetch('https://discord.com/api/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:tokenBody});
    if(!tokenRes.ok)throw new Error('token');
    const oauth=await tokenRes.json();
    const userRes=await fetch('https://discord.com/api/users/@me',{headers:{Authorization:`Bearer ${oauth.access_token}`}});
    if(!userRes.ok)throw new Error('user');
    const du=await userRes.json();
    const uid=`discord:${du.id}`;
    const customToken=await getAuth().createCustomToken(uid,{provider:'discord',discordId:String(du.id)});
    res.setHeader('Set-Cookie','jmb_discord_state=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax');
    return res.redirect(`${frontend}#jmb_token=${encodeURIComponent(customToken)}`);
  }catch(e){return res.status(502).send('Sign-in could not be completed. Please try again.');}
}
module.exports={discordOAuthHandler};
