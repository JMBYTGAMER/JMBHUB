import {functions,backendReady} from '../core/firebase.js?v=30';
import {httpsCallable} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js';

const $=s=>document.querySelector(s);
const status=$('#status'),timerBox=$('#timerBox'),timer=$('#timer'),form=$('#resetForm'),otp=$('#otp'),verifyBtn=$('#verifyBtn'),saveBtn=$('#saveBtn'),emailHint=$('#emailHint');
const token=new URLSearchParams(location.search).get('token')||'';
let expiresAt=0,verified=false,timerId=null;
function msg(text,type=''){status.textContent=text;status.className=`reset-status ${type}`}
function remaining(){return Math.max(0,expiresAt-Date.now())}
function paintTimer(){const ms=remaining();const sec=Math.ceil(ms/1000);timer.textContent=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;if(sec<=0){clearInterval(timerId);timerBox.classList.add('hide');form.classList.add('hide');verified=false;msg('This reset request has expired. Please return to the login page and request a new email.','err')}}
async function verifyToken(extraOtp=null){
  if(!backendReady||!functions)return msg('Password recovery service is unavailable right now.','err');
  if(!token)return msg('This reset link is missing or invalid. Request a new password reset email.','err');
  verifyBtn.disabled=true;
  try{
    const verify= httpsCallable(functions,'verifyPasswordReset');
    const result=await verify({token,...(extraOtp?{otp:extraOtp}:{})});
    expiresAt=Number(result.data?.expiresAt||0);verified=true;form.classList.remove('hide');timerBox.classList.remove('hide');emailHint.textContent=result.data?.email?`Resetting password for ${result.data.email}`:'';emailHint.classList.toggle('hide',!result.data?.email);msg(extraOtp?'Code verified. Your secure reset session is active.':'Verified automatically. You can now choose a new password.','ok');paintTimer();clearInterval(timerId);timerId=setInterval(paintTimer,1000);
  }catch(e){verified=false;msg(e?.message?.replace('FirebaseError: ','')||'This reset link is invalid or expired.','err')}finally{verifyBtn.disabled=false}
}
verifyBtn.onclick=()=>{const code=otp.value.replace(/\D/g,'').slice(0,6);if(code.length!==6)return msg('Enter the 6-digit code from your email.','err');verifyToken(code)};
form.onsubmit=async e=>{e.preventDefault();if(!verified||remaining()<=0)return msg('Your reset session has expired. Request a new reset email.','err');const p=$('#newPassword').value,c=$('#confirmPassword').value;if(p.length<8)return msg('Use at least 8 characters for your new password.','err');if(p!==c)return msg('The passwords do not match.','err');saveBtn.disabled=true;saveBtn.textContent='Updating…';try{const complete=httpsCallable(functions,'completePasswordReset');await complete({token,password:p});clearInterval(timerId);timerBox.classList.add('hide');form.classList.add('hide');msg('Password changed successfully. You can now sign in with your new password.','ok');setTimeout(()=>location.href='login.html',1800)}catch(e){msg(e?.message?.replace('FirebaseError: ','')||'We could not update your password. Please try again.','err')}finally{saveBtn.disabled=false;saveBtn.textContent='Set new password'}};
verifyToken();
