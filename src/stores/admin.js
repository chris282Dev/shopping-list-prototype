import { writable } from 'svelte/store'
import {
  collection, query, where, onSnapshot,
  updateDoc, doc
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { isAdmin } from './auth.js'

export const pendingUsers = writable([])

let firestoreUnsub = null

isAdmin.subscribe($isAdmin => {
  if ($isAdmin) {
    const q = query(collection(db, 'users'), where('approvalStatus', '==', 'pending'))
    firestoreUnsub = onSnapshot(q, snap => {
      pendingUsers.set(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  } else {
    firestoreUnsub?.()
    firestoreUnsub = null
    pendingUsers.set([])
  }
})

export async function approveUser(uid) {
  await updateDoc(doc(db, 'users', uid), {
    approvalStatus: 'approved',
    approvedAt: new Date()
  })
}

export async function rejectUser(uid) {
  await updateDoc(doc(db, 'users', uid), {
    approvalStatus: 'rejected',
    rejectedAt: new Date()
  })
}
