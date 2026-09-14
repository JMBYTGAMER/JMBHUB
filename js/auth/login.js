import {auth,backendReady} from '../core/firebase.js';
import {APP_CONFIG} from '../config/app-config.js';
import {$,toast} from '../core/ui.js';
import {GoogleAuthProvider,signInWithRedirect,getRedirectResult,signInWithEmailAndPassword,createUserWithEmailAndPassword,sendPasswordResetEmail,onAuthStateChanged,setPersistence,browserLocalPersistence,browserSessionPersistence} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';

const modeBtn=$('#modeBtn'),modeText=$('#modeText'),submit=$('#submitBtn'),submitText=$('#submitText'),error=$('#authError'),email=$('#email'),password=$('#password'),confirm=$('#confirmPassword'),confirmWrap=$('#confirmWrap'),forgot=$('#forgotBtn'),remember=$('#remember');
let signup=false;
const nextPage=new URLSearchParams(location.search).get('next');
const allowedNext=new Set(['dashboard.html','games.html','jmb-area.html','minecraft.html','ai.html','support.html','profile.html','admin.html']);
function afterAuth(){location.href=allowedNext.has(nextPage)?nextPage:'dashboard.html'}

$('#year').textContent=new Date().getFullYear();
function showError(message){error.textContent=message;error.classList.remove('hide')}
function showFirebaseError(context,e){
  console.error(`[JMBHUB Firebase] ${context}`,e);
  const code=e?.code||'unknown-error';
  const messages={
    'auth/unauthorized-domain':'This website is not authorized for Google sign-in yet. Add www.jmbhost.qzz.io to Firebase Authentication → Settings → Authorized domains.',
    'auth/operation-not-allowed':'Google sign-in is not enabled in Firebase Authentication.',
    'auth/network-request-failed':'Network connection to the account service failed. Check your connection and try again.',
    'auth/popup-blocked':'Your browser blocked the sign-in window. Please use Google sign-in again.',
    'auth/redirect-cancelled-by-user':'Google sign-in was cancelled.',
    'auth/internal-error':'The account service returned an internal error. Please try again.'
  };
  showError(messages[code]||`${e?.message||'We could not complete that request.'} [${code}]`);
}
function clearError(){error.classList.add('hide');error.textContent=''}
function busy(b){submit.disabled=b;submitText.textContent=b?(signup?'Creating account…':'Signing in…'):(signup?'Create account':'Sign In')}
async function persistence(){if(!auth)throw new Error('Authentication is unavailable.');await setPersistence(auth,remember.checked?browserLocalPersistence:browserSessionPersistence)}
function scorePassword(p){let s=0;if(p.length>=8)s++;if(/[a-z]/.test(p)&&/[A-Z]/.test(p))s++;if(/\d/.test(p))s++;if(/[^A-Za-z0-9]/.test(p))s++;return s}
function updateStrength(){if(!signup)return;const n=scorePassword(password.value),bar=$('#strengthBar'),txt=$('#strengthText');bar.style.width=`${n*25}%`;txt.textContent=n<=1?'Use 8+ characters with letters and numbers.':n===2?'Good start — add another character type.':n===3?'Strong password.':'Excellent password.'}
function toggle(input,button){const visible=input.type==='text';input.type=visible?'password':'text';button.textContent=visible?'Show':'Hide'}
$('#togglePassword').onclick=()=>toggle(password,$('#togglePassword'));$('#toggleConfirm').onclick=()=>toggle(confirm,$('#toggleConfirm'));password.oninput=updateStrength;
function setMode(v){signup=v;confirmWrap.classList.toggle('hide',!signup);forgot.classList.toggle('hide',signup);$('#authTitle').textContent=signup?'Create your account.':'Welcome back.';$('#authSub').textContent=signup?'Join JMBHUB and make your own space.':'Sign in to continue to JMBHUB.';submitText.textContent=signup?'Create account':'Sign In';modeText.textContent=signup?'Already have an account?':'New to JMBHUB?';modeBtn.textContent=signup?'Sign in':'Create account';clearError()}
modeBtn.onclick=()=>setMode(!signup);

if(backendReady){
  onAuthStateChanged(auth,u=>{if(u)afterAuth()});
  getRedirectResult(auth).then(result=>{if(result?.user)afterAuth()}).catch(e=>showFirebaseError('Google redirect sign-in failed',e));
}

$('#googleBtn').onclick=async()=>{
  clearError();
  if(!backendReady)return showError('Account services are temporarily unavailable. Please try again later.');
  try{
    await persistence();
    await signInWithRedirect(auth,new GoogleAuthProvider());
  }catch(e){showFirebaseError('Google sign-in failed',e)}
};

$('#discordBtn').onclick=()=>{
  clearError();
  if(!APP_CONFIG.DISCORD_OAUTH_URL)return showError('Discord sign-in is not connected yet. The secure Discord OAuth endpoint must be configured first.');
  location.href=APP_CONFIG.DISCORD_OAUTH_URL;
};

forgot.onclick=async()=>{
  clearError();
  if(!backendReady)return showError('Password recovery is temporarily unavailable.');
  const e=email.value.trim();
  if(!e)return showError('Enter your email address first.');
  try{await sendPasswordResetEmail(auth,e);toast('Password reset instructions sent','good')}catch(err){showFirebaseError('Password reset failed',err)}
};

$('#authForm').onsubmit=async(ev)=>{
  ev.preventDefault();clearError();
  const e=email.value.trim(),p=password.value;
  if(!e||!p)return showError('Enter your email and password.');
  if(signup&&p!==confirm.value)return showError('Your passwords do not match.');
  if(signup&&p.length<8)return showError('Use at least 8 characters for your password.');
  if(!backendReady)return showError('Account services are temporarily unavailable.');
  busy(true);
  try{await persistence();if(signup)await createUserWithEmailAndPassword(auth,e,p);else await signInWithEmailAndPassword(auth,e,p);afterAuth()}
  catch(err){showFirebaseError(signup?'Account creation failed':'Email sign-in failed',err)}
  finally{busy(false)}
};
