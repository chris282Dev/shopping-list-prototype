import { initializeApp } from 'firebase/app'
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBDoXLDzmePCsQMAdhlMQLVmSzS0IX_u9E",
  authDomain: "projekt-dc.web.app",
  projectId: "projekt-dc",
  storageBucket: "projekt-dc.firebasestorage.app",
  messagingSenderId: "987530168105",
  appId: "1:987530168105:web:b40232e28b1363c2ef5938"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

setPersistence(auth, browserLocalPersistence)

export const ADMIN_EMAIL = 'christophwieczorektest1@gmail.com'
