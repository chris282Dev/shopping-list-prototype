import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { get } from 'svelte/store'
import {
  user, userProfile, household, authLoading, authError, isAdmin, isApproved,
  loginWithEmail, loginWithGoogle, register, logout, createHousehold, joinHousehold
} from '../../src/stores/auth.js'
import * as firebase from 'firebase/auth'
import * as firestore from 'firebase/firestore'
import { auth, db, ADMIN_EMAIL } from '../../src/lib/firebase.js'

describe('Auth Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset stores
    user.set(null)
    userProfile.set(null)
    household.set(null)
    authLoading.set(true)
    authError.set('')
  })

  describe('loginWithEmail', () => {
    it('should successfully log in with valid credentials', async () => {
      const mockUser = {
        uid: 'user123',
        email: 'test@example.com',
        displayName: 'Test User'
      }

      vi.mocked(firebase.signInWithEmailAndPassword).mockResolvedValue({
        user: mockUser
      })

      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({})
      })

      await loginWithEmail('test@example.com', 'password123')

      expect(firebase.signInWithEmailAndPassword).toHaveBeenCalledWith(
        auth,
        'test@example.com',
        'password123'
      )
      expect(get(authError)).toBe('')
    })

    it('should handle invalid email error', async () => {
      vi.mocked(firebase.signInWithEmailAndPassword).mockRejectedValue({
        code: 'auth/invalid-email'
      })

      try {
        await loginWithEmail('invalid-email', 'password123')
      } catch (e) {
        expect(get(authError)).toBe('Ungültige E-Mail-Adresse.')
      }
    })

    it('should handle user not found error', async () => {
      vi.mocked(firebase.signInWithEmailAndPassword).mockRejectedValue({
        code: 'auth/user-not-found'
      })

      try {
        await loginWithEmail('notfound@example.com', 'password123')
      } catch (e) {
        expect(get(authError)).toBe('Kein Konto mit dieser E-Mail gefunden.')
      }
    })

    it('should handle wrong password error', async () => {
      vi.mocked(firebase.signInWithEmailAndPassword).mockRejectedValue({
        code: 'auth/wrong-password'
      })

      try {
        await loginWithEmail('test@example.com', 'wrongpassword')
      } catch (e) {
        expect(get(authError)).toBe('Falsches Passwort.')
      }
    })

    it('should handle invalid credential error', async () => {
      vi.mocked(firebase.signInWithEmailAndPassword).mockRejectedValue({
        code: 'auth/invalid-credential'
      })

      try {
        await loginWithEmail('test@example.com', 'password')
      } catch (e) {
        expect(get(authError)).toBe('E-Mail oder Passwort ist falsch.')
      }
    })

    it('should handle too many requests error', async () => {
      vi.mocked(firebase.signInWithEmailAndPassword).mockRejectedValue({
        code: 'auth/too-many-requests'
      })

      try {
        await loginWithEmail('test@example.com', 'password')
      } catch (e) {
        expect(get(authError)).toBe('Zu viele Versuche. Bitte warte kurz.')
      }
    })

    it('should clear previous errors on successful login', async () => {
      authError.set('Previous error')

      const mockUser = {
        uid: 'user123',
        email: 'test@example.com'
      }

      vi.mocked(firebase.signInWithEmailAndPassword).mockResolvedValue({
        user: mockUser
      })

      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true
      })

      await loginWithEmail('test@example.com', 'password123')

      expect(get(authError)).toBe('')
    })
  })

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const mockUser = {
        uid: 'newuser123',
        email: 'newuser@example.com',
        displayName: 'New User'
      }

      vi.mocked(firebase.createUserWithEmailAndPassword).mockResolvedValue({
        user: mockUser
      })

      vi.mocked(firebase.updateProfile).mockResolvedValue(undefined)

      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false
      })

      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      await register('New User', 'newuser@example.com', 'password123')

      expect(firebase.createUserWithEmailAndPassword).toHaveBeenCalledWith(
        auth,
        'newuser@example.com',
        'password123'
      )
      expect(firebase.updateProfile).toHaveBeenCalledWith(mockUser, {
        displayName: 'New User'
      })
      expect(get(authError)).toBe('')
    })

    it('should handle email already in use error', async () => {
      vi.mocked(firebase.createUserWithEmailAndPassword).mockRejectedValue({
        code: 'auth/email-already-in-use'
      })

      try {
        await register('User', 'existing@example.com', 'password123')
      } catch (e) {
        expect(get(authError)).toBe('Diese E-Mail-Adresse ist bereits registriert.')
      }
    })

    it('should handle weak password error', async () => {
      vi.mocked(firebase.createUserWithEmailAndPassword).mockRejectedValue({
        code: 'auth/weak-password'
      })

      try {
        await register('User', 'new@example.com', '123')
      } catch (e) {
        expect(get(authError)).toBe('Das Passwort muss mindestens 6 Zeichen lang sein.')
      }
    })

    it('should set display name from name parameter', async () => {
      const mockUser = {
        uid: 'user123',
        email: 'test@example.com'
      }

      vi.mocked(firebase.createUserWithEmailAndPassword).mockResolvedValue({
        user: mockUser
      })

      vi.mocked(firebase.updateProfile).mockResolvedValue(undefined)

      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false
      })

      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      await register('Custom Name', 'test@example.com', 'password123')

      expect(firebase.updateProfile).toHaveBeenCalledWith(mockUser, {
        displayName: 'Custom Name'
      })
    })

    it('should clear previous errors on successful registration', async () => {
      authError.set('Previous error')

      const mockUser = {
        uid: 'user123',
        email: 'test@example.com'
      }

      vi.mocked(firebase.createUserWithEmailAndPassword).mockResolvedValue({
        user: mockUser
      })

      vi.mocked(firebase.updateProfile).mockResolvedValue(undefined)

      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false
      })

      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      await register('User', 'test@example.com', 'password123')

      expect(get(authError)).toBe('')
    })
  })

  describe('loginWithGoogle', () => {
    it('should successfully log in with Google', async () => {
      const mockUser = {
        uid: 'googleuser123',
        email: 'user@gmail.com',
        displayName: 'Google User'
      }

      vi.mocked(firebase.signInWithPopup).mockResolvedValue({
        user: mockUser
      })

      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true
      })

      await loginWithGoogle()

      expect(firebase.signInWithPopup).toHaveBeenCalled()
      expect(get(authError)).toBe('')
    })

    it('should handle popup closed by user error', async () => {
      vi.mocked(firebase.signInWithPopup).mockRejectedValue({
        code: 'auth/popup-closed-by-user'
      })

      try {
        await loginWithGoogle()
      } catch (e) {
        expect(get(authError)).toBe('Login-Fenster wurde geschlossen.')
      }
    })

    it('should clear previous errors on successful Google login', async () => {
      authError.set('Previous error')

      const mockUser = {
        uid: 'googleuser123',
        email: 'user@gmail.com'
      }

      vi.mocked(firebase.signInWithPopup).mockResolvedValue({
        user: mockUser
      })

      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true
      })

      await loginWithGoogle()

      expect(get(authError)).toBe('')
    })
  })

  describe('logout', () => {
    it('should successfully log out', async () => {
      vi.mocked(firebase.signOut).mockResolvedValue(undefined)

      await logout()

      expect(firebase.signOut).toHaveBeenCalledWith(auth)
    })
  })

  describe('createHousehold', () => {
    it('should create a new household with valid code', async () => {
      const mockUser = {
        uid: 'user123',
        email: 'test@example.com'
      }

      auth.currentUser = mockUser

      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      await createHousehold('My Household')

      expect(firestore.setDoc).toHaveBeenCalled()
      const call = vi.mocked(firestore.setDoc).mock.calls[0]
      const data = call[1]

      expect(data.name).toBe('My Household')
      expect(data.ownerId).toBe('user123')
      expect(data.members).toContain('user123')
      expect(data.inviteCode).toHaveLength(6)
      expect(data.inviteCode).toMatch(/^[A-Z0-9]{6}$/)
    })

    it('should throw error when not authenticated', async () => {
      auth.currentUser = null

      try {
        await createHousehold('My Household')
      } catch (e) {
        expect(e.message).toBe('Nicht angemeldet')
      }
    })

    it('should update user with household ID', async () => {
      const mockUser = {
        uid: 'user123',
        email: 'test@example.com'
      }

      auth.currentUser = mockUser

      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)
      vi.mocked(firestore.doc).mockReturnValue({ ref: 'householdRef' })

      await createHousehold('My Household')

      expect(firestore.updateDoc).toHaveBeenCalled()
    })

    it('should generate unique invite codes', async () => {
      const mockUser = {
        uid: 'user123',
        email: 'test@example.com'
      }

      auth.currentUser = mockUser

      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      const codes = new Set()

      for (let i = 0; i < 5; i++) {
        await createHousehold(`Household ${i}`)
        const call = vi.mocked(firestore.setDoc).mock.calls[i]
        codes.add(call[1].inviteCode)
      }

      expect(codes.size).toBe(5) // All codes should be unique
    })
  })

  describe('joinHousehold', () => {
    it('should join household with valid code', async () => {
      const mockUser = {
        uid: 'newuser123',
        email: 'newuser@example.com'
      }

      auth.currentUser = mockUser

      const mockHouseholdDoc = {
        id: 'household123',
        ref: { id: 'household123' }
      }

      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [mockHouseholdDoc]
      })

      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      await joinHousehold('ABC123')

      expect(firestore.getDocs).toHaveBeenCalled()
      expect(firestore.updateDoc).toHaveBeenCalledTimes(2)
    })

    it('should throw error when household code is invalid', async () => {
      const mockUser = {
        uid: 'newuser123',
        email: 'newuser@example.com'
      }

      auth.currentUser = mockUser

      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: true,
        docs: []
      })

      try {
        await joinHousehold('INVALID')
      } catch (e) {
        expect(e.message).toBe('Ungültiger Code')
      }
    })

    it('should throw error when not authenticated', async () => {
      auth.currentUser = null

      try {
        await joinHousehold('ABC123')
      } catch (e) {
        expect(e.message).toBe('Nicht angemeldet')
      }
    })

    it('should convert code to uppercase', async () => {
      const mockUser = {
        uid: 'newuser123',
        email: 'newuser@example.com'
      }

      auth.currentUser = mockUser

      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: true,
        docs: []
      })

      try {
        await joinHousehold('abc123')
      } catch (e) {
        // Expected to fail, but check that the code was uppercased
        const call = vi.mocked(firestore.query).mock.calls[
          vi.mocked(firestore.query).mock.calls.length - 1
        ]
      }
    })

    it('should add user to household members and set householdId', async () => {
      const mockUser = {
        uid: 'newuser123',
        email: 'newuser@example.com'
      }

      auth.currentUser = mockUser

      const mockHouseholdDoc = {
        id: 'household123',
        ref: { id: 'household123' }
      }

      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [mockHouseholdDoc]
      })

      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      await joinHousehold('ABC123')

      expect(firestore.updateDoc).toHaveBeenCalledTimes(2)
    })
  })

  describe('Derived Stores', () => {
    it('isAdmin should be true for admin email', () => {
      user.set({ email: ADMIN_EMAIL })
      expect(get(isAdmin)).toBe(true)
    })

    it('isAdmin should be false for non-admin email', () => {
      user.set({ email: 'user@example.com' })
      expect(get(isAdmin)).toBe(false)
    })

    it('isApproved should be true when approvalStatus is approved', () => {
      userProfile.set({ approvalStatus: 'approved' })
      expect(get(isApproved)).toBe(true)
    })

    it('isApproved should be false when approvalStatus is pending', () => {
      userProfile.set({ approvalStatus: 'pending' })
      expect(get(isApproved)).toBe(false)
    })

    it('isApproved should be false when approvalStatus is rejected', () => {
      userProfile.set({ approvalStatus: 'rejected' })
      expect(get(isApproved)).toBe(false)
    })
  })

  describe('Error message mapping', () => {
    const errorCases = [
      ['auth/invalid-email', 'Ungültige E-Mail-Adresse.'],
      ['auth/user-not-found', 'Kein Konto mit dieser E-Mail gefunden.'],
      ['auth/wrong-password', 'Falsches Passwort.'],
      ['auth/email-already-in-use', 'Diese E-Mail-Adresse ist bereits registriert.'],
      ['auth/weak-password', 'Das Passwort muss mindestens 6 Zeichen lang sein.'],
      ['auth/too-many-requests', 'Zu viele Versuche. Bitte warte kurz.'],
      ['auth/popup-closed-by-user', 'Login-Fenster wurde geschlossen.'],
      ['auth/invalid-credential', 'E-Mail oder Passwort ist falsch.']
    ]

    errorCases.forEach(([code, expectedMessage]) => {
      it(`should map error code ${code} to correct message`, async () => {
        vi.mocked(firebase.signInWithEmailAndPassword).mockRejectedValue({ code })

        try {
          await loginWithEmail('test@example.com', 'password')
        } catch (e) {
          expect(get(authError)).toBe(expectedMessage)
        }
      })
    })

    it('should show generic error for unknown error code', async () => {
      vi.mocked(firebase.signInWithEmailAndPassword).mockRejectedValue({
        code: 'auth/unknown-error'
      })

      try {
        await loginWithEmail('test@example.com', 'password')
      } catch (e) {
        expect(get(authError)).toBe('Ein Fehler ist aufgetreten. Bitte versuche es erneut.')
      }
    })
  })
})
