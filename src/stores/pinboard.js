import { writable, get } from 'svelte/store'
import {
  collection, query, where, onSnapshot, addDoc,
  deleteDoc, doc, serverTimestamp, orderBy, limit
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { user } from './auth.js'

export const notes = writable([])

let notesUnsub = null

export function subscribePinboard(householdId) {
  notesUnsub?.()
  const q = query(collection(db, 'pinboard'), where('householdId', '==', householdId))
  notesUnsub = onSnapshot(q, (snap) => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    items.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
    notes.set(items.slice(0, 20))
  })
}

export function unsubscribePinboard() {
  notesUnsub?.()
  notes.set([])
}

export async function addNote(householdId, text) {
  const currentUser = get(user)
  await addDoc(collection(db, 'pinboard'), {
    householdId,
    text,
    createdBy: currentUser?.uid,
    createdByName: currentUser?.displayName,
    createdAt: serverTimestamp()
  })
}

export async function deleteNote(noteId) {
  await deleteDoc(doc(db, 'pinboard', noteId))
}
