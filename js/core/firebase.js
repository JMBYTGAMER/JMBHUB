import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {getFirestore} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import {getStorage} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js';
import {FIREBASE_CONFIG} from '../config/firebase-config.js';

const requiredKeys=['apiKey','authDomain','projectId','appId'];
const hasValidConfig=requiredKeys.every(key=>{
  const value=String(FIREBASE_CONFIG?.[key]??'').trim();
  return value && !value.includes('PASTE_');
});

let app=null,auth=null,db=null,storage=null;
export let backendReady=false;

if(hasValidConfig){
  try{
    app=initializeApp(FIREBASE_CONFIG);
    auth=getAuth(app);
    db=getFirestore(app);
    storage=getStorage(app);
    backendReady=true;
  }catch(error){
    console.error('[JMBHUB Firebase] Initialization failed:',error);
  }
}

export {app,auth,db,storage};
