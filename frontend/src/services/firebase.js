import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

// In dev mode: point SDK to local emulators instead of Google's servers
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS !== 'false') {
  connectFirestoreEmulator(db, 'localhost', 8090);
  connectFunctionsEmulator(functions, 'localhost', 5001);
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
}

const signIn = (email, password) => signInWithEmailAndPassword(auth, email, password);
const logOut = () => signOut(auth);
const onAuthChange = (callback) => onAuthStateChanged(auth, callback);

export {
  app,
  auth,
  db,
  functions,
  signIn,
  logOut,
  onAuthChange,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
};
