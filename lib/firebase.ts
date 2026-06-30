import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

let app;
let db: any = null;
let auth: any = null;
let isFirebaseEnabled = false;

if (firebaseConfig && (firebaseConfig as any).apiKey) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
    auth = getAuth(app);
    isFirebaseEnabled = true;
    console.log("Firebase initialized successfully. Cloud Sync is ACTIVE.");
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
  }
} else {
  console.log("No Firebase API key found. Operating in local-only offline mode.");
}

export { db, auth, isFirebaseEnabled };
