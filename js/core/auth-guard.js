import {auth,backendReady} from './firebase.js';
import {onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {APP_CONFIG} from '../config/app-config.js';
import {$,setText} from './ui.js';

async function applyUser(u){
  setText('userName',u.displayName||u.email?.split('@')[0]||'JMB User');
  setText('userEmail',u.email||'');
  const av=$('#userAvatar');
  if(av)av.textContent=(u.displayName||u.email||'J')[0].toUpperCase();
  const owner=u.email?.toLowerCase()===APP_CONFIG.OWNER_EMAIL.toLowerCase();
  let admin=false;
  try{admin=(await u.getIdTokenResult()).claims?.admin===true}catch{}
  document.querySelectorAll('[data-owner-only]').forEach(e=>e.classList.toggle('hide',!owner));
  document.querySelectorAll('[data-admin-only]').forEach(e=>e.classList.toggle('hide',!(owner||admin)));
  document.querySelectorAll('[data-role]').forEach(e=>e.textContent=owner?'Owner':admin?'Admin':'Member');
  return {...u,owner,admin};
}

export async function guard(){
  if(!backendReady){
    const here=encodeURIComponent(location.pathname.split('/').pop()||'dashboard.html');
    location.replace(`login.html?next=${here}&reason=unavailable`);
    return new Promise(()=>{});
  }
  return new Promise(resolve=>{onAuthStateChanged(auth,async u=>{if(!u){location.href='login.html';return}resolve(await applyUser(u)})});
}
export async function logout(){if(backendReady)await signOut(auth);location.href='login.html'}
