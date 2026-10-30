import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import {initializeAppCheck,ReCaptchaEnterpriseProvider} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app-check.js';
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

let app, auth, db, storage, appCheck;

if (backendReady) {
  app = initializeApp(firebaseConfig);

  // Enable App Check as soon as the public site key has been registered.
  // Until then, normal Firebase initialization remains unchanged.
  const appCheckSiteKey = String(firebaseConfig.appCheckSiteKey || '').trim();
  if (appCheckSiteKey) {
    try {
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true
      });
    } catch (error) {
      console.error('[JMBHUB] App Check could not initialize. Verify its Firebase configuration.');
    }
  }

  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export {app, auth, db, storage, appCheck};
