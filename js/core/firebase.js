import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {getFirestore} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import {getStorage} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js';
import {firebaseConfig} from '../config/firebase-config.js';

export const FIREBASE_CONFIG = firebaseConfig;
export const backendReady = Boolean(
  firebaseConfig &&
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

let app, auth, db, storage;

if (backendReady) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export {app, auth, db, storage};
