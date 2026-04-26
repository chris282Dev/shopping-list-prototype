import { writable, get } from 'svelte/store'
import {
  collection, query, where, onSnapshot, addDoc,
  updateDoc, deleteDoc, doc, serverTimestamp, orderBy
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { user } from './auth.js'

export const todos = writable([])

let todosUnsub = null

export function subscribeTodos(householdId) {
  todosUnsub?.()
  const q = query(collection(db, 'todos'), where('householdId', '==', householdId))
  todosUnsub = onSnapshot(q, (snap) => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    items.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
    todos.set(items)
  })
}

export function unsubscribeTodos() {
  todosUnsub?.()
  todos.set([])
}

export async function addTodo(householdId, { title, assignedTo, assignedToName }) {
  const currentUser = get(user)
  await addDoc(collection(db, 'todos'), {
    householdId,
    title,
    assignedTo: assignedTo || null,
    assignedToName: assignedToName || null,
    done: false,
    createdBy: currentUser?.uid,
    createdByName: currentUser?.displayName,
    createdAt: serverTimestamp()
  })
}

export async function toggleTodo(todoId, done) {
  await updateDoc(doc(db, 'todos', todoId), { done: !done })
}

export async function deleteTodo(todoId) {
  await deleteDoc(doc(db, 'todos', todoId))
}
