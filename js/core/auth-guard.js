import {auth,app,backendReady,db} from './firebase.js';
import {onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {doc,setDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import {APP_CONFIG} from '../config/app-config.js';
import {$,setText} from './ui.js';

async function applyUser(u){
  // Refresh the Firebase profile first. A user may have verified their email
  // after signing in, in which case the cached User object can be stale.
  try{await u.reload()}catch(error){console.warn('[JMBHUB] Could not refresh account profile.',error?.code||error?.message||error)}
  if(app){
    try{
      const {getFunctions,httpsCallable}=await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js');
      const status=(await httpsCallable(getFunctions(app,'asia-south1'),'getMyAccountStatus')({})).data||{};
      if(status.disabled===true){await signOut(auth);location.replace('login.html?blocked=1');return null;}
    }catch(error){console.warn('[JMBHUB] Account status check unavailable.',error?.code||error?.message||error)}
  }
  let claims={};
  try{claims=(await u.getIdTokenResult(true)).claims||{}}catch{}
  // A visible admin menu is only a UI convenience. Firestore Rules and Cloud
  // Functions independently verify the identity on the server.
  const actualEmail=String(u.email||'').trim().toLowerCase();
  const configuredOwnerEmail=String(APP_CONFIG.OWNER_EMAIL||'').trim().toLowerCase();
  const emailMatchesOwner=Boolean(actualEmail&&configuredOwnerEmail&&actualEmail===configuredOwnerEmail);
  const verified=Boolean(u.emailVerified||claims.email_verified===true);
  const owner=emailMatchesOwner&&verified;
  const admin=verified&&Boolean(claims.admin===true||claims.role==='admin'||owner);

  setText('userName',u.displayName||u.email?.split('@')[0]||'JMB User');
  setText('userEmail',u.email||'');
  const av=$('#userAvatar');
  if(av)av.textContent=(u.displayName||u.email||'J')[0].toUpperCase();

  document.querySelectorAll('[data-owner-only]').forEach(e=>e.classList.toggle('hide',!owner));
  document.querySelectorAll('[data-admin-only]').forEach(e=>e.classList.toggle('hide',!admin));

  if(db){
    setDoc(doc(db,'profiles',u.uid),{
      uid:u.uid,
      email:u.email||'',
      displayName:u.displayName||'',
      photoURL:u.photoURL||'',
      emailVerified:Boolean(u.emailVerified),
      lastSeenAt:serverTimestamp()
    },{merge:true}).catch(()=>{});
  }

  return {...u,owner,admin,claims,emailMatchesOwner,emailVerified:verified,configuredOwnerEmail};
}

export function guard(){
  if(!backendReady){
    location.replace('login.html');
    return new Promise(()=>{});
  }
  return new Promise(resolve=>{
    onAuthStateChanged(auth,async u=>{
      if(!u){location.href='login.html';return}
      const result=await applyUser(u);
      if(result)resolve(result);
    });
  });
}

export async function logout(){
  if(backendReady&&auth?.currentUser)await signOut(auth);
  localStorage.removeItem('jmb-demo-user');
  location.href='login.html';
}
