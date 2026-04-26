import { writable, derived } from 'svelte/store'
import {
  onAuthStateChanged, signOut,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  GoogleAuthProvider, signInWithPopup, updateProfile
} from 'firebase/auth'
import {
  doc, getDoc, getDocs, setDoc, onSnapshot, collection, query, where,
  updateDoc, arrayUnion, serverTimestamp
} from 'firebase/firestore'
import { auth, db, ADMIN_EMAIL } from '../lib/firebase.js'

export const user = writable(null)
export const userProfile = writable(null)
export const household = writable(null)
export const authLoading = writable(true)
export const authError = writable('')

export const isAdmin = derived(user, $u => $u?.email === ADMIN_EMAIL)
export const isApproved = derived(userProfile, $p => $p?.approvalStatus === 'approved')

let householdUnsub = null
let profileUnsub = null

onAuthStateChanged(auth, async (firebaseUser) => {
  if (firebaseUser) {
    user.set(firebaseUser)

    // Sicherheitsnetz: User-Doc anlegen, falls es (z. B. nach DB-Wipe) fehlt.
    try {
      await ensureUserDoc(firebaseUser)
    } catch (e) {
      console.error('ensureUserDoc Fehler im Auth-Listener:', e)
    }

    profileUnsub?.()
    profileUnsub = onSnapshot(doc(db, 'users', firebaseUser.uid), (snap) => {
      if (snap.exists()) {
        const profile = { uid: snap.id, ...snap.data() }
        userProfile.set(profile)
        if (profile.householdId && profile.approvalStatus === 'approved') {
          subscribeHousehold(profile.householdId)
        } else {
          household.set(null)
        }
      } else {
        userProfile.set(null)
      }
    })
  } else {
    user.set(null)
    userProfile.set(null)
    household.set(null)
    householdUnsub?.()
    profileUnsub?.()
    householdUnsub = null
    profileUnsub = null
  }
  authLoading.set(false)
})

function subscribeHousehold(householdId) {
  householdUnsub?.()
  householdUnsub = onSnapshot(doc(db, 'households', householdId), (snap) => {
    household.set(snap.exists() ? { id: snap.id, ...snap.data() } : null)
  })
}

export async function loginWithEmail(email, password) {
  authError.set('')
  try {
    const result = await signInWithEmailAndPassword(auth, email, password)
    await ensureUserDoc(result.user)
  } catch (e) {
    authError.set(getAuthErrorMessage(e.code))
    throw e
  }
}

export async function loginWithGoogle() {
  authError.set('')
  try {
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    await ensureUserDoc(result.user)
  } catch (e) {
    authError.set(getAuthErrorMessage(e.code))
    throw e
  }
}

export async function register(name, email, password) {
  authError.set('')
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(result.user, { displayName: name })
    await ensureUserDoc(result.user, name)
  } catch (e) {
    authError.set(getAuthErrorMessage(e.code))
    throw e
  }
}

async function ensureUserDoc(firebaseUser, name) {
  const ref = doc(db, 'users', firebaseUser.uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    const isAdminUser = firebaseUser.email === ADMIN_EMAIL
    await setDoc(ref, {
      displayName: name || firebaseUser.displayName || firebaseUser.email,
      email: firebaseUser.email,
      photoURL: firebaseUser.photoURL || null,
      approvalStatus: isAdminUser ? 'approved' : 'pending',
      role: isAdminUser ? 'admin' : 'user',
      approvedBy: isAdminUser ? firebaseUser.email : null,
      createdAt: serverTimestamp()
    })
  }
}

export async function logout() {
  await signOut(auth)
}

export async function createHousehold(name) {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('Nicht angemeldet')
  const code = Math.random().toString(36).substring(2, 8).toUpperCase()
  const ref = doc(collection(db, 'households'))
  await setDoc(ref, {
    name,
    inviteCode: code,
    ownerId: currentUser.uid,
    members: [currentUser.uid],
    createdAt: serverTimestamp()
  })
  await updateDoc(doc(db, 'users', currentUser.uid), { householdId: ref.id })
}

export async function joinHousehold(code) {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('Nicht angemeldet')
  const q = query(collection(db, 'households'), where('inviteCode', '==', code.toUpperCase()))
  const snap = await getDocs(q)
  if (snap.empty) throw new Error('Ungültiger Code')
  const hDoc = snap.docs[0]
  await updateDoc(hDoc.ref, { members: arrayUnion(currentUser.uid) })
  await updateDoc(doc(db, 'users', currentUser.uid), { householdId: hDoc.id })
}

function getAuthErrorMessage(code) {
  const messages = {
    'auth/invalid-email': 'Ungültige E-Mail-Adresse.',
    'auth/user-not-found': 'Kein Konto mit dieser E-Mail gefunden.',
    'auth/wrong-password': 'Falsches Passwort.',
    'auth/email-already-in-use': 'Diese E-Mail-Adresse ist bereits registriert.',
    'auth/weak-password': 'Das Passwort muss mindestens 6 Zeichen lang sein.',
    'auth/too-many-requests': 'Zu viele Versuche. Bitte warte kurz.',
    'auth/popup-closed-by-user': 'Login-Fenster wurde geschlossen.',
    'auth/invalid-credential': 'E-Mail oder Passwort ist falsch.',
  }
  return messages[code] || 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.'
}
