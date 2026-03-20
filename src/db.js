// src/db.js  — All Firestore operations
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, setDoc, getDoc
} from 'firebase/firestore'
import { db } from './firebase'

// ── Habits ──────────────────────────────────────────────────
export const habitsRef = (uid) =>
  collection(db, 'users', uid, 'habits')

export const subscribeHabits = (uid, cb) => {
  const q = query(habitsRef(uid), orderBy('createdAt', 'asc'))
  return onSnapshot(q, snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )
}

export const addHabit = (uid, habit) =>
  addDoc(habitsRef(uid), { ...habit, createdAt: Date.now() })

export const updateHabit = (uid, id, data) =>
  updateDoc(doc(db, 'users', uid, 'habits', id), data)

export const deleteHabit = (uid, id) =>
  deleteDoc(doc(db, 'users', uid, 'habits', id))

// ── Logs (one doc per habit per day) ────────────────────────
// docId = habitId_YYYY-MM-DD
export const logRef = (uid, habitId, dateStr) =>
  doc(db, 'users', uid, 'logs', `${habitId}_${dateStr}`)

export const setLog = (uid, habitId, dateStr, data) =>
  setDoc(logRef(uid, habitId, dateStr), {
    habitId,
    date: dateStr,
    ...data,
    updatedAt: Date.now(),
  }, { merge: true })

export const subscribeLogs = (uid, cb) => {
  const q = collection(db, 'users', uid, 'logs')
  return onSnapshot(q, snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )
}

// ── User profile (identity statement) ───────────────────────
export const getProfile = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid, 'profile', 'main'))
  return snap.exists() ? snap.data() : {}
}

export const setProfile = (uid, data) =>
  setDoc(doc(db, 'users', uid, 'profile', 'main'), data, { merge: true })
