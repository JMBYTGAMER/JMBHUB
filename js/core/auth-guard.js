import {auth,backendReady} from './firebase.js';
import {onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {APP_CONFIG} from '../config/app-config.js';
import {$,setText} from './ui.js';

function applyUser(u){
  setText('userName',u.displayName||u.email?.split('@')[0]||'JMB User');
  setText('userEmail',u.email||'');
  const av=$('#userAvatar');
  if(av)av.textContent=(u.displayName||u.email||'J')[0].toUpperCase();
  const owner=u.email?.toLowerCase()===APP_CONFIG.OWNER_EMAIL.toLowerCase();
  document.querySelectorAll('[data-owner-only]').forEach(e=>e.classList.toggle('hide',!owner));
  return {...u,owner};
}

export function guard(){
  const demo=localStorage.getItem('jmb-demo-user');
  if(!backendReady){
    const u=demo?JSON.parse(demo):{uid:'demo-user',email:'demo@jmb.local',displayName:'Demo User',demo:true};
    return Promise.resolve(applyUser({...u,demo:true}));
  }
  return new Promise(resolve=>{
    onAuthStateChanged(auth,u=>{
      if(!u){location.href='login.html';return}
      resolve(applyUser({...u,demo:false}));
    });
  });
}

export async function logout(){
  localStorage.removeItem('jmb-demo-user');
  if(backendReady)await signOut(auth);
  location.href='login.html';
}
