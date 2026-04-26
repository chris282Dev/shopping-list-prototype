import { writable, derived, get } from 'svelte/store'
import {
  collection, query, where, onSnapshot, addDoc,
  updateDoc, deleteDoc, doc, serverTimestamp, getDocs
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { user } from './auth.js'

export const shoppingLists = writable([])
export const activeListId = writable(null)
export const allItems = writable([])

// Abgeleiteter Store: nur Items der aktiven Liste
export const shoppingItems = derived(
  [allItems, activeListId],
  ([$allItems, $activeListId]) => {
    if (!$activeListId) return []
    return $allItems
      .filter(i => i.listId === $activeListId)
      .sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0))
  }
)

export const CATEGORIES = [
  'Obst & Gemüse', 'Kühlschrank', 'Getränke',
  'Backen & Kochen', 'Drogerie', 'Haushalt', 'Sonstiges'
]

let listsUnsub = null
let itemsUnsub = null
let currentHouseholdId = null

export function subscribeShoppingData(householdId) {
  if (householdId === currentHouseholdId) return
  currentHouseholdId = householdId

  listsUnsub?.()
  itemsUnsub?.()

  // Listen abonnieren
  const listsQ = query(collection(db, 'shoppingLists'), where('householdId', '==', householdId))
  listsUnsub = onSnapshot(listsQ, (snap) => {
    const lists = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    shoppingLists.set(lists)
    const current = get(activeListId)
    if (lists.length > 0 && (!current || !lists.find(l => l.id === current))) {
      activeListId.set(lists[0].id)
    }
  })

  // Alle Items des Haushalts abonnieren (ein einziger Query)
  const itemsQ = query(collection(db, 'items'), where('householdId', '==', householdId))
  itemsUnsub = onSnapshot(itemsQ, (snap) => {
    allItems.set(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

// Rückwärtskompatibilität
export function subscribeShoppingLists(householdId) { subscribeShoppingData(householdId) }
export function subscribeItems() {}

export function unsubscribeShopping() {
  listsUnsub?.(); itemsUnsub?.()
  listsUnsub = null; itemsUnsub = null; currentHouseholdId = null
  shoppingLists.set([]); allItems.set([]); activeListId.set(null)
}

export async function addShoppingList(name, householdId) {
  await addDoc(collection(db, 'shoppingLists'), {
    name, householdId,
    categoryOrder: CATEGORIES,
    createdAt: serverTimestamp()
  })
}

export async function deleteShoppingList(listId) {
  await deleteDoc(doc(db, 'shoppingLists', listId))
}

export async function addItem(listId, { name, quantity, category }, householdId) {
  const currentUser = get(user)
  await addDoc(collection(db, 'items'), {
    listId,
    householdId,
    name,
    quantity: quantity || null,
    category: category || 'Sonstiges',
    checked: false,
    createdBy: currentUser?.uid,
    createdByName: currentUser?.displayName,
    createdAt: serverTimestamp()
  })
}

export async function toggleItem(itemId, checked) {
  await updateDoc(doc(db, 'items', itemId), { checked: !checked })
}

export async function deleteItem(itemId) {
  await deleteDoc(doc(db, 'items', itemId))
}

export async function deleteCheckedItems(listId) {
  const q = query(collection(db, 'items'), where('listId', '==', listId), where('checked', '==', true))
  const snap = await getDocs(q)
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
}
