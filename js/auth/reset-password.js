import {functions} from '../core/firebase.js?v=22';
import {httpsCallable} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js';

const $=s=>document.querySelector(s);
const year=$('#year'); year.textContent=new Date().getFullYear();
const params=new URLSearchParams(location.search);
const requestId=params.get('request')||sessionStorage.getItem('jmb_reset_request')||'';
const token=params.get('token')||'';
const title=$('#resetTitle'),sub=$('#resetSub'),error=$('#resetError'),success=$('#resetSuccess'),state=$('#verifyState'),verifyEmail=$('#verifyEmail'),timer=$('#pageTimer'),form=$('#resetForm'),submit=$('#resetSubmit'),otp=$('#otp');
let valid=false,seconds=300,interval=null;
function showError(text){error.textContent=text;error.classList.remove('hide');success.classList.add('hide')}
function showSuccess(text){success.textContent=text;success.classList.remove('hide');error.classList.add('hide')}
function toggle(input,button){const visible=input.type==='text';input.type=visible?'password':'text';button.textContent=visible?'Show':'Hide'}
$('#showNew').onclick=()=>toggle($('#newPassword'),$('#showNew'));
$('#showConfirm').onclick=()=>toggle($('#confirmNew'),$('#showConfirm'));
function startTimer(initial){seconds=Math.max(0,Number(initial)||300);clearInterval(interval);const tick=()=>{const m=Math.floor(seconds/60),s=String(seconds%60).padStart(2,'0');timer.textContent=`Expires in ${m}:${s}`;if(seconds<=0){clearInterval(interval);valid=false;state.textContent='This reset request has expired.';state.parentElement.classList.add('expired');return}seconds--};tick();interval=setInterval(tick,1000)}
async function verify(){
  if(!functions||!requestId){title.textContent='Reset request unavailable.';sub.textContent='Request a new password reset email to continue.';showError('This reset request is incomplete. Please request a new email.');return}
  try{
    const result=await httpsCallable(functions,'verifyPasswordReset')({requestId,token});
    if(!result?.data?.valid){throw new Error('This reset request is invalid or has expired.')}
    valid=true;state.textContent=result.data.requiresOtp?'Code required':'Verified securely';verifyEmail.textContent=result.data.email||'';title.textContent=result.data.requiresOtp?'Enter your code.':'Create a new password.';sub.textContent=result.data.requiresOtp?'Enter the 6-digit code from your JMBHUB email, then choose a new password.':'Your reset request is verified. Choose a new password below.';startTimer(result.data.expiresIn);
  }catch(e){title.textContent='Reset link expired.';sub.textContent='Request a new password reset email to continue.';state.textContent='Verification failed';showError(e?.message?.replace('FirebaseError: ','')||'This reset link is invalid or has expired.');startTimer(0)}
}
form.onsubmit=async e=>{
  e.preventDefault();
  if(!valid)return showError('This reset request is no longer active. Request a new email.');
  const a=$('#newPassword').value,b=$('#confirmNew').value,code=otp.value.replace(/\D/g,'');
  if(a.length<8)return showError('Use at least 8 characters for your new password.');
  if(a!==b)return showError('Your new passwords do not match.');
  submit.disabled=true;submit.querySelector('span').textContent='Updating…';
  try{
    const result=await httpsCallable(functions,'completePasswordReset')({requestId,token,otp:code,newPassword:a});
    if(!result?.data?.ok)throw new Error('Password update could not be completed.');
    clearInterval(interval);valid=false;form.classList.add('hide');title.textContent='Password updated.';sub.textContent='Your JMBHUB password has been changed successfully.';showSuccess('You can now return to sign in with your new password.');
    setTimeout(()=>location.href='login.html',1800);
  }catch(e){showError(e?.message?.replace('FirebaseError: ','')||'We could not update your password. Please try again.');if(/expired|verification/i.test(e?.message||'')){valid=false;clearInterval(interval)}}
  finally{submit.disabled=false;submit.querySelector('span').textContent='Update password'}
};
verify();
