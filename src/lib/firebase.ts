
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  projectId: "studio-7621243156-3f243",
  appId: "1:688035762368:web:2d1296ead3d97a157fdd25",
  storageBucket: "studio-7621243156-3f243.firebasestorage.app",
  apiKey: "AIzaSyCyoqJk8C14uZj3oq8IR7Dd3-tHIDsrssw",
  authDomain: "studio-7621243156-3f243.firebaseapp.com",
  measurementId: "",
  messagingSenderId: "688035762368"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
