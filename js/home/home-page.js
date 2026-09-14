import {auth,backendReady} from '../core/firebase.js';
import {APP_CONFIG} from '../config/app-config.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
const card=document.querySelector('#staffCard'),link=document.querySelector('#staffLink'),role=document.querySelector('#staffRole'),year=document.querySelector('#year');
if(year)year.textContent=new Date().getFullYear();
if(link)link.href='pages/admin.html';
if(backendReady&&auth)onAuthStateChanged(auth,async user=>{
  if(!user){card?.classList.add('hide');return}
  let admin=false;try{admin=(await user.getIdTokenResult()).claims?.admin===true}catch{}
  const owner=user.email?.toLowerCase()===APP_CONFIG.OWNER_EMAIL.toLowerCase();
  if(owner||admin){card?.classList.remove('hide');if(role)role.textContent=owner?'OWNER':'ADMIN'}else card?.classList.add('hide');
});
