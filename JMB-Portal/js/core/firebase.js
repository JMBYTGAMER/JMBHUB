import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {getFirestore} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import {getStorage} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js';
import {FIREBASE_CONFIG} from '../config/firebase-config.js';
export const firebaseEnabled=!Object.values(FIREBASE_CONFIG).some(v=>String(v).includes('PASTE_'));
let app,auth,db,storage;
if(firebaseEnabled){app=initializeApp(FIREBASE_CONFIG);auth=getAuth(app);db=getFirestore(app);storage=getStorage(app)}
export {app,auth,db,storage};
