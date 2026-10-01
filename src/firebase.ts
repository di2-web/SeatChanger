import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { firebaseConfig } from './firebaseConfig'

const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const db: Firestore = getFirestore(app)

export function getFirebaseDb(): Firestore {
  return db
}

export function isFirebaseConfigured(): boolean {
  return true
}
