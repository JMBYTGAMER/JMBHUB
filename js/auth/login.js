import {auth,backendReady} from '../core/firebase.js';
import {APP_CONFIG} from '../config/app-config.js';
import {$,toast} from '../core/ui.js';
import {GoogleAuthProvider,signInWithPopup,signInWithEmailAndPassword,createUserWithEmailAndPassword,sendPasswordResetEmail,onAuthStateChanged,setPersistence,browserLocalPersistence,browserSessionPersistence} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';

const modeBtn=$('#modeBtn'),modeText=$('#modeText'),submit=$('#submitBtn'),submitText=$('#submitText'),error=$('#authError'),email=$('#email'),password=$('#password'),confirm=$('#confirmPassword'),confirmWrap=$('#confirmWrap'),forgot=$('#forgotBtn'),remember=$('#remember');
let signup=false;
const nextPage=new URLSearchParams(location.search).get('next');
const allowedNext=new Set(['dashboard.html','games.html','jmb-area.html','minecraft.html','ai.html','support.html','profile.html','admin.html','coins.html','ads.html','among-us.html','geometry-dash.html','arcade-plus.html','dev-toolbox.html','security-lab.html','seo.html']);
function afterAuth(){location.href=allowedNext.has(nextPage)?nextPage:'dashboard.html'}

$('#year').textContent=new Date().getFullYear();
function showError(message){error.textContent=message;error.classList.remove('hide')}
function clearError(){error.classList.add('hide');error.textContent=''}
function friendly(e){
  const code=e?.code||'';
  const map={
    'auth/invalid-credential':'That email or password is incorrect.',
    'auth/invalid-email':'Please enter a valid email address.',
    'auth/user-not-found':'That email or password is incorrect.',
    'auth/wrong-password':'That email or password is incorrect.',
    'auth/email-already-in-use':'An account already exists with this email. Try signing in instead.',
    'auth/weak-password':'Choose a stronger password.',
    'auth/popup-closed-by-user':'The Google sign-in window was closed.',
    'auth/popup-blocked':'Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.',
    'auth/unauthorized-domain':'This website domain is not authorized for sign-in. Add every domain you use (including jmbhost.qzz.io, www.jmbhost.qzz.io, jmbhub.cyou and www.jmbhub.cyou) in Firebase Authentication → Settings → Authorized domains.',
    'auth/operation-not-allowed':'This sign-in method is disabled in Firebase Authentication → Sign-in method.',
    'auth/network-request-failed':'The connection to Firebase failed. Check your internet connection and try again.',
    'auth/too-many-requests':'Too many attempts were made. Wait a little and try again.',
    'auth/internal-error':'Firebase returned an internal authentication error. Check the browser console for the exact error.'
  };
  return map[code]||'We could not complete sign-in. Please check your connection and try again. If this keeps happening, contact JMB HUB Support.';
}
function busy(b){submit.disabled=b;submitText.textContent=b?(signup?'Creating account…':'Signing in…'):(signup?'Create account':'Sign In')}
async function persistence(){await setPersistence(auth,remember.checked?browserLocalPersistence:browserSessionPersistence)}
function providerBusy(button, pending, label){
  if(!button)return;
  if(pending){button.dataset.originalHtml=button.innerHTML;button.disabled=true;button.setAttribute('aria-busy','true');button.querySelector('span:last-child')?.replaceChildren(document.createTextNode(label));}
  else{if(button.dataset.originalHtml)button.innerHTML=button.dataset.originalHtml;button.disabled=false;button.removeAttribute('aria-busy');delete button.dataset.originalHtml;}
}
function scorePassword(p){let s=0;if(p.length>=8)s++;if(/[a-z]/.test(p)&&/[A-Z]/.test(p))s++;if(/\d/.test(p))s++;if(/[^A-Za-z0-9]/.test(p))s++;return s}
function updateStrength(){if(!signup)return;const n=scorePassword(password.value),bar=$('#strengthBar'),txt=$('#strengthText');bar.style.width=`${n*25}%`;txt.textContent=n<=1?'Use 8+ characters with letters and numbers.':n===2?'Good start — add another character type.':n===3?'Strong password.':'Excellent password.'}
function toggle(input,button){const visible=input.type==='text';input.type=visible?'password':'text';button.textContent=visible?'Show':'Hide'}
$('#togglePassword').onclick=()=>toggle(password,$('#togglePassword'));$('#toggleConfirm').onclick=()=>toggle(confirm,$('#toggleConfirm'));password.oninput=updateStrength;
function setMode(v){signup=v;confirmWrap.classList.toggle('hide',!signup);forgot.classList.toggle('hide',signup);$('#authTitle').textContent=signup?'Create your account.':'Welcome back.';$('#authSub').textContent=signup?'Join JMBHUB and make your own space.':'Sign in to continue to JMBHUB.';submitText.textContent=signup?'Create account':'Sign In';modeText.textContent=signup?'Already have an account?':'New to JMBHUB?';modeBtn.textContent=signup?'Sign in':'Create account';clearError()}
modeBtn.onclick=()=>setMode(!signup);

if(!backendReady){
  showError('Firebase is not configured in this copy of JMBHUB. Make sure js/config/firebase-config.js contains the JMB HUB web configuration.');
}else{
  onAuthStateChanged(auth,u=>{if(u)afterAuth()});
}

$('#googleBtn').onclick=async()=>{
  clearError();
  if(!backendReady)return showError('Account sign-in is temporarily unavailable. Please try again later.');
  providerBusy($('#googleBtn'),true,'Connecting…');
  try{
    await persistence();
    const provider=new GoogleAuthProvider();
    provider.setCustomParameters({prompt:'select_account'});
    await signInWithPopup(auth,provider);
    afterAuth();
  }catch(e){
    console.error('[JMBHUB] Google sign-in failed:',e);
    showError(friendly(e));
  }finally{providerBusy($('#googleBtn'),false)}
};

$('#discordBtn').onclick=()=>{
  clearError();
  if(!APP_CONFIG.DISCORD_OAUTH_URL)return showError('Discord sign-in has not been connected yet. Use Google or email for now.');
  providerBusy($('#discordBtn'),true,'Opening Discord…');
  location.href=APP_CONFIG.DISCORD_OAUTH_URL;
};

const RESET_LIMIT_KEY='jmb-reset-requests-v1';
const RESET_COOLDOWN_MS=60*1000;
const RESET_WINDOW_MS=24*60*60*1000;
const RESET_MAX_PER_WINDOW=3;
async function resetStorageKey(value){
  const normalized=value.trim().toLowerCase();
  try{
    if(globalThis.crypto?.subtle){
      const bytes=new TextEncoder().encode(normalized);
      const digest=await crypto.subtle.digest('SHA-256',bytes);
      return RESET_LIMIT_KEY+':'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    }
  }catch{}
  return RESET_LIMIT_KEY+':session';
}
function readResetAttempts(key){
  try{
    const data=JSON.parse(localStorage.getItem(key)||'[]');
    return Array.isArray(data)?data.filter(n=>Number.isFinite(n)&&n>Date.now()-RESET_WINDOW_MS):[];
  }catch{return []}
}
function saveResetAttempt(key,attempts){
  try{localStorage.setItem(key,JSON.stringify(attempts.slice(-RESET_MAX_PER_WINDOW)))}catch{}
}
forgot.onclick=async()=>{
  clearError();
  if(!backendReady)return showError('Firebase is not configured.');
  const e=email.value.trim();
  if(!e)return showError('Enter your email address first.');
  if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(e))return showError('Enter a valid email address.');
  const key=await resetStorageKey(e);
  const now=Date.now();
  const attempts=readResetAttempts(key);
  const wait=attempts.length?RESET_COOLDOWN_MS-(now-attempts[attempts.length-1]):0;
  if(wait>0)return showError('Please wait '+Math.ceil(wait/1000)+' seconds before requesting another reset email.');
  if(attempts.length>=RESET_MAX_PER_WINDOW){
    const remaining=Math.max(1,Math.ceil((attempts[0]+RESET_WINDOW_MS-now)/60000));
    return showError('Reset request limit reached on this device. Try again in about '+remaining+' minutes.');
  }
  attempts.push(now);saveResetAttempt(key,attempts);
  forgot.disabled=true;const oldText=forgot.textContent;forgot.textContent='Sending…';
  try{
    await sendPasswordResetEmail(auth,e);
    toast('If an account exists for that email, reset instructions have been sent.','good');
  }catch(err){
    console.error('[JMBHUB] Password reset failed:',err);
    if(err?.code==='auth/too-many-requests')showError('Firebase temporarily limited password reset requests. Please wait before trying again.');
    else showError(friendly(err));
  }finally{
    forgot.disabled=false;forgot.textContent=oldText;
  }
};

$('#authForm').onsubmit=async(ev)=>{
  ev.preventDefault();clearError();
  const e=email.value.trim(),p=password.value;
  if(!e||!p)return showError('Enter your email and password.');
  if(signup&&p!==confirm.value)return showError('Your passwords do not match.');
  if(signup&&p.length<8)return showError('Use at least 8 characters for your password.');
  if(!backendReady)return showError('Firebase is not configured.');
  busy(true);
  try{
    await persistence();
    if(signup)await createUserWithEmailAndPassword(auth,e,p);else await signInWithEmailAndPassword(auth,e,p);
    afterAuth();
  }catch(err){console.error('[JMBHUB] Email authentication failed:',err);showError(friendly(err))}
  finally{busy(false)}
};
