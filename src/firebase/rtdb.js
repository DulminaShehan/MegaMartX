// ============================================================
// Realtime Database helpers — user account records
// Structure:
//   /users/{uid}        → all accounts (buyers + sellers)
//   /buyers/{uid}       → buyer-only accounts
//   /sellers/{uid}      → seller-only accounts
// ============================================================

import { ref, set, get, update, serverTimestamp } from 'firebase/database'
import { rtdb } from './config'

// ── Write a user record to RTDB ───────────────────────────────
export const writeUserToRTDB = async (uid, data) => {
  const record = {
    ...data,
    uid,
    createdAt: Date.now(),   // RTDB uses ms timestamps, not Firestore Timestamps
  }

  const writes = []

  // Always write to /users/{uid}
  writes.push(set(ref(rtdb, `users/${uid}`), record))

  // Also write to role-specific node
  if (data.role === 'seller') {
    writes.push(set(ref(rtdb, `sellers/${uid}`), record))
  } else {
    writes.push(set(ref(rtdb, `buyers/${uid}`), record))
  }

  await Promise.all(writes)
}

// ── Read a user record from RTDB ─────────────────────────────
export const readUserFromRTDB = async (uid) => {
  const snap = await get(ref(rtdb, `users/${uid}`))
  return snap.exists() ? snap.val() : null
}

// ── Update a user record in RTDB ─────────────────────────────
export const updateUserInRTDB = async (uid, data) => {
  await update(ref(rtdb, `users/${uid}`), data)

  // Keep role-specific node in sync too
  const role = data.role
  if (role === 'seller') {
    await update(ref(rtdb, `sellers/${uid}`), data)
  } else if (role === 'user') {
    await update(ref(rtdb, `buyers/${uid}`), data)
  }
}
