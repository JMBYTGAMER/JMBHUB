import {auth,backendReady} from '../core/firebase.js?v=8';
import {APP_CONFIG} from '../config/app-config.js';
import {$,toast} from '../core/ui.js';
import {GoogleAuthProvider,signInWithPopup,signInWithEmailAndPassword,createUserWithEmailAndPassword,sendPasswordResetEmail,onAuthStateChanged,setPersistence,browserLocalPersistence,browserSessionPersistence,signInWithCustomToken} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';

const modeBtn=$('#modeBtn'),modeText=$('#modeText'),submit=$('#submitBtn'),submitText=$('#submitText'),error=$('#authError'),email=$('#email'),password=$('#password'),confirm=$('#confirmPassword'),confirmWrap=$('#confirmWrap'),forgot=$('#forgotBtn'),remember=$('#remember');
let signup=false;
const params=new URLSearchParams(location.search);
const nextPage=params.get('next');
const reason=params.get('reason');
const allowedNext=new Set(['dashboard.html','games.html','jmb-area.html','minecraft.html','ai.html','support.html','profile.html','admin.html']);
function afterAuth(){location.href=allowedNext.has(nextPage)?nextPage:'dashboard.html'}
$('#year').textContent=new Date().getFullYear();
function showError(message){error.textContent=message;error.classList.remove('hide')}
function clearError(){error.classList.add('hide');error.textContent=''}
function friendly(e){const code=e?.code||'';return ({'auth/invalid-credential':'That email or password is incorrect.','auth/invalid-email':'Please enter a valid email address.','auth/user-not-found':'No account was found with that email.','auth/wrong-password':'That email or password is incorrect.','auth/email-already-in-use':'An account already exists with this email. Try signing in instead.','auth/weak-password':'Choose a stronger password.','auth/popup-closed-by-user':'The sign-in window was closed.','auth/popup-blocked':'Please allow sign-in pop-ups and try again.','auth/unauthorized-domain':'Sign-in is not available from this address yet.','auth/operation-not-allowed':'This sign-in option is currently unavailable.','auth/network-request-failed':'Please check your connection and try again.','auth/invalid-custom-token':'That sign-in session is no longer valid. Please try again.','auth/too-many-requests':'Too many attempts. Please wait a little and try again.'}[code])||'We could not complete that request. Please try again.')}
function busy(b){submit.disabled=b;submitText.textContent=b?(signup?'Creating account…':'Signing in…'):(signup?'Create account':'Sign In')}
async function persistence(){await setPersistence(auth,remember.checked?browserLocalPersistence:browserSessionPersistence)}
function scorePassword(p){let s=0;if(p.length>=8)s++;if(/[a-z]/.test(p)&&/[A-Z]/.test(p))s++;if(/\d/.test(p))s++;if(/[^A-Za-z0-9]/.test(p))s++;return s}
function updateStrength(){if(!signup)return;const n=scorePassword(password.value),bar=$('#strengthBar'),txt=$('#strengthText');bar.style.width=`${n*25}%`;txt.textContent=n<=1?'Use 8+ characters with letters and numbers.':n===2?'Good start — add another character type.':n===3?'Strong password.':'Excellent password.'}
function toggle(input,button){const visible=input.type==='text';input.type=visible?'password':'text';button.textContent=visible?'Show':'Hide'}
$('#togglePassword').onclick=()=>toggle(password,$('#togglePassword'));$('#toggleConfirm').onclick=()=>toggle(confirm,$('#toggleConfirm'));password.oninput=updateStrength;
function setMode(v){signup=v;confirmWrap.classList.toggle('hide',!signup);forgot.classList.toggle('hide',signup);$('#authTitle').textContent=signup?'Create your account.':'Welcome back.';$('#authSub').textContent=signup?'Join JMBHUB and make your own space.':'Sign in to continue to JMBHUB.';submitText.textContent=signup?'Create account':'Sign In';modeText.textContent=signup?'Already have an account?':'New to JMBHUB?';modeBtn.textContent=signup?'Sign in':'Create account';clearError()}
modeBtn.onclick=()=>setMode(!signup);
if(reason==='unavailable')showError('Sign-in service is temporarily unavailable. Please try again later.');

async function consumeDiscordToken(){const hash=location.hash.startsWith('#')?location.hash.slice(1):'';const token=new URLSearchParams(hash).get('jmb_token');if(!token||!backendReady)return;if(token.length>6000){history.replaceState({},'',location.pathname);showError('That sign-in link is invalid.');return}try{await setPersistence(auth,browserLocalPersistence);await signInWithCustomToken(auth,token);history.replaceState({},'',location.pathname);afterAuth()}catch(e){history.replaceState({},'',location.pathname);showError(friendly(e))}}
consumeDiscordToken();
if(backendReady)onAuthStateChanged(auth,u=>{if(u)afterAuth()});

$('#googleBtn').onclick=async()=>{clearError();if(!backendReady)return showError('Sign-in is temporarily unavailable. Please try again later.');try{await persistence();await signInWithPopup(auth,new GoogleAuthProvider());afterAuth()}catch(e){showError(friendly(e))}};
$('#discordBtn').onclick=()=>{clearError();if(!APP_CONFIG.DISCORD_OAUTH_URL)return showError('This sign-in option is temporarily unavailable.');location.href=APP_CONFIG.DISCORD_OAUTH_URL};
forgot.onclick=async()=>{
  clearError();
  if(!backendReady)return showError('Password recovery is temporarily unavailable. Please try again later.');
  const e=email.value.trim().toLowerCase();
  if(!e)return showError('Enter your email address first.');
  forgot.disabled=true;
  try{
    await sendPasswordResetEmail(auth,e,{url:new URL('login.html',location.href).href,handleCodeInApp:false});
    toast('Reset instructions sent. Check your email inbox.','good');
  }catch(err){showError(friendly(err))}finally{forgot.disabled=false}
};
$('#authForm').onsubmit=async ev=>{ev.preventDefault();clearError();const e=email.value.trim(),p=password.value;if(!e||!p)return showError('Enter your email and password.');if(signup&&p!==confirm.value)return showError('Your passwords do not match.');if(signup&&p.length<8)return showError('Use at least 8 characters for your password.');if(!backendReady)return showError('Sign-in is temporarily unavailable.');busy(true);try{await persistence();if(signup)await createUserWithEmailAndPassword(auth,e,p);else await signInWithEmailAndPassword(auth,e,p);afterAuth()}catch(err){showError(friendly(err))}finally{busy(false)}};
