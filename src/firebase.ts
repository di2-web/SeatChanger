import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { initializeFirestore, getFirestore, type Firestore } from 'firebase/firestore'
import { firebaseConfig } from './firebaseConfig'

const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

let firestoreInstance: Firestore
try {
  firestoreInstance = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
  })
} catch {
  firestoreInstance = getFirestore(app)
}

export const db: Firestore = firestoreInstance

export function getFirebaseDb(): Firestore {
  return db
}

export function isFirebaseConfigured(): boolean {
  return true
}
