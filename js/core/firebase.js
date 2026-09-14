import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {getFirestore} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import {getStorage} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js';
import {getFunctions} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js';
import {FIREBASE_CONFIG} from '../config/firebase-config.js?v=11';

const required=['apiKey','authDomain','projectId','appId'];
const configValid=required.every(k=>{const v=String(FIREBASE_CONFIG?.[k]??'').trim();return v&&!v.includes('PASTE_')});
export let backendReady=false;
export let backendError='';
let app=null,auth=null,db=null,storage=null,functions=null;

if(configValid){
  try{
    app=initializeApp(FIREBASE_CONFIG);
    auth=getAuth(app);
    backendReady=!!auth;
    try{db=getFirestore(app)}catch(error){console.warn('[JMBHUB] Optional database service unavailable.',error)}
    try{storage=getStorage(app)}catch(error){console.warn('[JMBHUB] Optional storage service unavailable.',error)}
    try{functions=getFunctions(app,'us-central1')}catch(error){console.warn('[JMBHUB] Optional functions service unavailable.',error)}
  }catch(error){
    backendError=String(error?.message||error||'Initialization failed');
    console.error('[JMBHUB] Authentication initialization failed.',error);
  }
}else{
  backendError='Missing web application configuration.';
  console.error('[JMBHUB] Authentication configuration is incomplete.');
}

export {app,auth,db,storage,functions};
