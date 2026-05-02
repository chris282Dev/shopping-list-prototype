import { vi } from 'vitest'

// Mock Firebase Authentication
export const mockFirebaseAuth = {
  currentUser: null
}

export const mockFirebaseDb = {}

// Mock Firebase Auth functions
export const mockOnAuthStateChanged = vi.fn((auth, callback) => {
  if (mockFirebaseAuth.currentUser) {
    callback(mockFirebaseAuth.currentUser)
  }
  return () => {} // unsubscribe function
})

export const mockSignInWithEmailAndPassword = vi.fn()
export const mockCreateUserWithEmailAndPassword = vi.fn()
export const mockSignInWithPopup = vi.fn()
export const mockSignOut = vi.fn()
export const mockUpdateProfile = vi.fn()

// Mock Firebase Firestore functions
export const mockOnSnapshot = vi.fn((ref, callback) => {
  return () => {} // unsubscribe function
})

export const mockGetDoc = vi.fn()
export const mockGetDocs = vi.fn()
export const mockSetDoc = vi.fn()
export const mockUpdateDoc = vi.fn()
export const mockDeleteDoc = vi.fn()
export const mockAddDoc = vi.fn()

// Mock Firestore references
export const mockDoc = vi.fn((db, collection, id) => ({ db, collection, id }))
export const mockCollection = vi.fn((db, name) => ({ db, name }))
export const mockQuery = vi.fn((...args) => args)

// Setup global mocks before tests
vi.mock('firebase/auth', () => ({
  initializeApp: vi.fn(() => ({})),
  getAuth: vi.fn(() => mockFirebaseAuth),
  browserLocalPersistence: {},
  setPersistence: vi.fn(),
  onAuthStateChanged: mockOnAuthStateChanged,
  signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
  createUserWithEmailAndPassword: mockCreateUserWithEmailAndPassword,
  signInWithPopup: mockSignInWithPopup,
  signOut: mockSignOut,
  updateProfile: mockUpdateProfile,
  GoogleAuthProvider: vi.fn()
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => mockFirebaseDb),
  doc: mockDoc,
  collection: mockCollection,
  query: mockQuery,
  where: vi.fn((field, op, value) => ({ field, op, value })),
  onSnapshot: mockOnSnapshot,
  getDoc: mockGetDoc,
  getDocs: mockGetDocs,
  setDoc: mockSetDoc,
  updateDoc: mockUpdateDoc,
  deleteDoc: mockDeleteDoc,
  addDoc: mockAddDoc,
  serverTimestamp: vi.fn(() => new Date()),
  arrayUnion: vi.fn(arr => arr),
  orderBy: vi.fn(),
  limit: vi.fn()
}))

vi.mock('../src/lib/firebase.js', () => ({
  auth: mockFirebaseAuth,
  db: mockFirebaseDb,
  ADMIN_EMAIL: 'christophwieczorektest1@gmail.com'
}))
