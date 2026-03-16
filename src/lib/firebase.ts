import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const

for (const key of requiredEnvVars) {
  if (!import.meta.env[key]) {
    throw new Error(
      `Missing required environment variable: ${key}. Copy .env.example to .env and fill in the values.`
    )
  }
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY.trim(),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN.trim(),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID.trim(),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET.trim(),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID.trim(),
  appId: import.meta.env.VITE_FIREBASE_APP_ID.trim(),
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()
export const calendarProvider = new GoogleAuthProvider()
calendarProvider.addScope('https://www.googleapis.com/auth/calendar.events.readonly')
