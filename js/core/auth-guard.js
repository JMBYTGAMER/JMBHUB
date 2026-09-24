import {auth,backendReady} from './firebase.js';
import {onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {APP_CONFIG} from '../config/app-config.js';
import {$,setText} from './ui.js';

async function applyUser(u){
 let claims={};
 try{claims=(await u.getIdTokenResult(true)).claims||{}}catch{}
 const owner=u.email?.toLowerCase()===APP_CONFIG.OWNER_EMAIL.toLowerCase();
 const admin=Boolean(claims.admin===true||claims.role==='admin'||owner);
 setText('userName',u.displayName||u.email?.split('@')[0]||'JMB User');
 setText('userEmail',u.email||'');
 const av=$('#userAvatar');if(av)av.textContent=(u.displayName||u.email||'J')[0].toUpperCase();
 document.querySelectorAll('[data-owner-only]').forEach(e=>e.classList.toggle('hide',!owner));
 document.querySelectorAll('[data-admin-only]').forEach(e=>e.classList.toggle('hide',!admin));
 return {...u,owner,admin,claims};
}
export function guard(){
 if(!backendReady){location.replace('login.html');return new Promise(()=>{})}
 return new Promise(resolve=>onAuthStateChanged(auth,async u=>{if(!u){location.href='login.html';return}resolve(await applyUser(u))}));
}
export async function logout(){if(backendReady&&auth?.currentUser)await signOut(auth);localStorage.removeItem('jmb-demo-user');location.href='login.html'}
