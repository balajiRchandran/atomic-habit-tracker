// src/firebase.js
// ─────────────────────────────────────────────────────────────
// SETUP: Replace the values below with your own Firebase project
// credentials. See README.md for step-by-step instructions.
// ─────────────────────────────────────────────────────────────
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyCR5E_2o4Uc0B6ytCwVUmXBQY5sk-Qz5Zg",
  authDomain: "habit-tracker-920a3.firebaseapp.com",
  projectId: "habit-tracker-920a3",
  storageBucket: "habit-tracker-920a3.firebasestorage.app",
  messagingSenderId: "773151405747",
  appId: "1:773151405747:web:828947c21f8c7b09d9e2c6"
};

const app      = initializeApp(firebaseConfig)
export const db       = getFirestore(app)
export const auth = getAuth(app)
