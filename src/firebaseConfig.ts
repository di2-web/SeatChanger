export interface FirebaseConfig {
  apiKey: string
  authDomain?: string
  projectId: string
  storageBucket?: string
  messagingSenderId?: string
  appId?: string
  measurementId?: string
}

export const firebaseConfig: FirebaseConfig = {
  apiKey: "AIzaSyC3HzMP0nznlOVFQ8eTsKwIFyrrPOOVTcQ",
  authDomain: "whoo-fcdd6.firebaseapp.com",
  projectId: "whoo-fcdd6",
  storageBucket: "whoo-fcdd6.firebasestorage.app",
  messagingSenderId: "324422821512",
  appId: "1:324422821512:web:268d939f40e5ac5049e13d",
  measurementId: "G-MGPWXYHVFV",
}

export const defaultFirebaseConfig = firebaseConfig
