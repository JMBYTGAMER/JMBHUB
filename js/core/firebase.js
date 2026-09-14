import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {getFirestore} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import {getStorage} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js';
import {FIREBASE_CONFIG} from '../config/firebase-config.js?v=4';
const required=['apiKey','authDomain','projectId','appId'];
export const backendReady=required.every(k=>String(FIREBASE_CONFIG?.[k]||'').trim()&&!String(FIREBASE_CONFIG?.[k]).includes('PASTE_'));
let app=null,auth=null,db=null,storage=null;
if(backendReady){try{app=initializeApp(FIREBASE_CONFIG);auth=getAuth(app);try{db=getFirestore(app)}catch{}try{storage=getStorage(app)}catch{}}catch(e){console.warn('JMB service initialization unavailable');}}
export {app,auth,db,storage};
