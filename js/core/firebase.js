import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {getFirestore} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import {getStorage} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js';
import {getFunctions} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js';
import {FIREBASE_CONFIG} from '../config/firebase-config.js?v=10';

const required=['apiKey','authDomain','projectId','appId'];
export const backendReady=required.every(k=>{const v=String(FIREBASE_CONFIG?.[k]??'').trim();return v&&!v.includes('PASTE_')});
let app=null,auth=null,db=null,storage=null,functions=null;
if(backendReady){
  try{
    app=initializeApp(FIREBASE_CONFIG);
    auth=getAuth(app);
    try{db=getFirestore(app)}catch{}
    try{storage=getStorage(app)}catch{}
    try{functions=getFunctions(app,'us-central1')}catch{}
  }catch{}
}
export {app,auth,db,storage,functions};
