import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyBpKBkMijfUvzDKi0n1EYPIGM7j8AhwixM",
  authDomain: "justlols.firebaseapp.com",
  projectId: "justlols",
  storageBucket: "justlols.firebasestorage.app",
  messagingSenderId: "973374325027",
  appId: "1:973374325027:web:3d8848c2bf5ad759fdcc96",
  measurementId: "G-VZEM5V1PRF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app); 