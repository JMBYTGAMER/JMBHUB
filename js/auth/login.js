import {auth,backendReady,backendError} from '../core/firebase.js?v=20';
import {APP_CONFIG} from '../config/app-config.js';
import {$,toast} from '../core/ui.js';
import {GoogleAuthProvider,signInWithPopup,signInWithRedirect,getRedirectResult,signInWithEmailAndPassword,createUserWithEmailAndPassword,sendPasswordResetEmail,onAuthStateChanged,setPersistence,browserLocalPersistence,browserSessionPersistence,signInWithCustomToken} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';

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
if(!backendReady&&backendError)console.warn('[JMBHUB] Sign-in is unavailable:',backendError);
function friendly(e){const code=e?.code||'';return ({'auth/invalid-credential':'That email or password is incorrect.','auth/invalid-email':'Please enter a valid email address.','auth/user-not-found':'No account was found with that email.','auth/wrong-password':'That email or password is incorrect.','auth/email-already-in-use':'An account already exists with this email. Try signing in instead.','auth/weak-password':'Choose a stronger password.','auth/popup-closed-by-user':'The Google window was closed before sign-in finished.','auth/popup-blocked':'Your browser blocked the Google window. We will switch to the secure redirect flow.','auth/unauthorized-domain':'This website address is not enabled for sign-in yet. Add jmbhost.qzz.io and www.jmbhost.qzz.io to your allowed authentication domains.','auth/operation-not-allowed':'Google sign-in is not enabled yet. Enable Google in your authentication providers.','auth/network-request-failed':'Please check your connection and try again.','auth/invalid-custom-token':'That sign-in session is no longer valid. Please try again.','auth/too-many-requests':'Too many attempts. Please wait a little and try again.','auth/internal-error':'Google sign-in could not start. Please try again.','auth/failed-precondition':'Google sign-in could not start. Please try again.','auth/account-exists-with-different-credential':'An account already exists with this email using another sign-in method.'}[code])||(e?.message==='Google sign-in was closed before completion.'?'The Google window was closed before sign-in finished.':'We could not complete that request. Please try again.')}
function busy(b){submit.disabled=b;submitText.textContent=b?(signup?'Creating account…':'Signing in…'):(signup?'Create account':'Sign In')}
function isMobile(){return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||window.matchMedia('(max-width:700px)').matches}
async function persistence(){await setPersistence(auth,remember.checked?browserLocalPersistence:browserSessionPersistence)}
function scorePassword(p){let s=0;if(p.length>=8)s++;if(/[a-z]/.test(p)&&/[A-Z]/.test(p))s++;if(/\d/.test(p))s++;if(/[^A-Za-z0-9]/.test(p))s++;return s}
function updateStrength(){if(!signup)return;const n=scorePassword(password.value),bar=$('#strengthBar'),txt=$('#strengthText');bar.style.width=`${n*25}%`;txt.textContent=n<=1?'Use 8+ characters with letters and numbers.':n===2?'Good start — add another character type.':n===3?'Strong password.':'Excellent password.'}
function toggle(input,button){const visible=input.type==='text';input.type=visible?'password':'text';button.textContent=visible?'Show':'Hide'}
$('#togglePassword').onclick=()=>toggle(password,$('#togglePassword'));$('#toggleConfirm').onclick=()=>toggle(confirm,$('#toggleConfirm'));password.oninput=updateStrength;
function setMode(v){signup=v;confirmWrap.classList.toggle('hide',!signup);forgot.classList.toggle('hide',signup);$('#authTitle').textContent=signup?'Create your account.':'Welcome back.';$('#authSub').textContent=signup?'Join JMBHUB and make your own space.':'Sign in to continue to JMBHUB.';submitText.textContent=signup?'Create account':'Sign In';modeText.textContent=signup?'Already have an account?':'New to JMBHUB?';modeBtn.textContent=signup?'Sign in':'Create account';clearError()}
modeBtn.onclick=()=>setMode(!signup);
if(reason==='unavailable')showError('Sign-in service is temporarily unavailable. Please try again later.');

async function consumeGoogleRedirect(){if(!backendReady)return;try{const result=await getRedirectResult(auth);if(result?.user)afterAuth()}catch(e){if(e?.code)showError(friendly(e))}}
consumeGoogleRedirect();

async function consumeDiscordToken(){const hash=location.hash.startsWith('#')?location.hash.slice(1):'';const token=new URLSearchParams(hash).get('jmb_token');if(!token||!backendReady)return;if(token.length>6000){history.replaceState({},'',location.pathname);showError('That sign-in link is invalid.');return}try{await setPersistence(auth,browserLocalPersistence);await signInWithCustomToken(auth,token);history.replaceState({},'',location.pathname);afterAuth()}catch(e){history.replaceState({},'',location.pathname);showError(friendly(e))}}
consumeDiscordToken();
if(backendReady)onAuthStateChanged(auth,u=>{if(u)afterAuth()});

const googleBtn=$('#googleBtn');
let googleBusy=false;
async function startGoogleSignIn(){
  if(googleBusy)return;
  googleBusy=true;
  clearError();
  googleBtn.disabled=true;
  const label=googleBtn.querySelector('span:last-child');
  if(label)label.textContent='Opening Google…';

  if(!backendReady||!auth){
    googleBtn.disabled=false;
    googleBusy=false;
    if(label)label.textContent='Continue with Google';
    return showError('Sign-in is temporarily unavailable. Please try again later.');
  }

  const provider=new GoogleAuthProvider();
  provider.setCustomParameters({prompt:'select_account'});

  try{
    await persistence();

    // Popup-first is deliberate: it avoids custom-domain redirect edge cases
    // on GitHub Pages, while still working from a direct user click on mobile.
    const result=await signInWithPopup(auth,provider);
    if(result?.user)afterAuth();
  }catch(e){
    const code=e?.code||'';
    console.warn('[JMBHUB] Google popup sign-in failed:',code,e);

    // Only fall back to redirect for browser/popup conditions. Configuration
    // errors should be shown directly so the user can fix the real setting.
    const redirectable=[
      'auth/popup-blocked',
      'auth/cancelled-popup-request',
      'auth/popup-closed-by-user',
      'auth/operation-not-supported-in-this-environment',
      'auth/internal-error'
    ];
    if(redirectable.includes(code)){
      try{
        if(label)label.textContent='Redirecting to Google…';
        await signInWithRedirect(auth,provider);
        return;
      }catch(redirectError){
        console.error('[JMBHUB] Google redirect sign-in failed:',redirectError);
        showError(friendly(redirectError));
      }
    }else{
      showError(friendly(e));
    }
  }finally{
    googleBtn.disabled=false;
    googleBusy=false;
    if(label)label.textContent='Continue with Google';
  }
}
googleBtn.onclick=startGoogleSignIn;
$('#discordBtn').onclick=()=>{clearError();if(!APP_CONFIG.DISCORD_OAUTH_URL)return showError('This sign-in option is temporarily unavailable.');location.href=APP_CONFIG.DISCORD_OAUTH_URL};
forgot.onclick=async()=>{
  clearError();
  if(!backendReady)return showError('Password recovery is temporarily unavailable. Please try again later.');
  const e=email.value.trim().toLowerCase();
  if(!e)return showError('Enter your email address first.');
  forgot.disabled=true;
  try{
    await sendPasswordResetEmail(auth,e,{url:new URL('login.html?reset=1',location.href).href,handleCodeInApp:false});
    toast('Reset instructions sent. Check your email inbox.','good');
  }catch(err){showError(friendly(err))}finally{forgot.disabled=false}
};
$('#authForm').onsubmit=async ev=>{ev.preventDefault();clearError();const e=email.value.trim(),p=password.value;if(!e||!p)return showError('Enter your email and password.');if(signup&&p!==confirm.value)return showError('Your passwords do not match.');if(signup&&p.length<8)return showError('Use at least 8 characters for your password.');if(!backendReady)return showError('Sign-in is temporarily unavailable.');busy(true);try{await persistence();if(signup)await createUserWithEmailAndPassword(auth,e,p);else await signInWithEmailAndPassword(auth,e,p);afterAuth()}catch(err){showError(friendly(err))}finally{busy(false)}};
