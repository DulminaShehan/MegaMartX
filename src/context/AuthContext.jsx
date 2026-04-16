// ============================================================
// AuthContext — JWT-based authentication (no Firebase)
//
// Token lifecycle:
//   register / login  → backend returns { token, user }
//                        → stored in localStorage
//   page reload       → decode token from localStorage,
//                        verify expiry, restore currentUser
//   logout            → remove token, clear state
// ============================================================

import { createContext, useContext, useEffect, useState } from 'react'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const TOKEN_KEY = 'megamartx_token'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

// ── Helpers ───────────────────────────────────────────────────

/** Decode a JWT payload without verification (client-side only) */
const decodeToken = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

/** Return the stored token if it hasn't expired, else null */
const getValidToken = () => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return null
  const payload = decodeToken(token)
  if (!payload) return null
  // payload.exp is in seconds
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    localStorage.removeItem(TOKEN_KEY)
    return null
  }
  return token
}

// ── Provider ──────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading,     setLoading]     = useState(true)

  // On mount: restore session from localStorage token
  useEffect(() => {
    const token = getValidToken()
    if (token) {
      const payload = decodeToken(token)
      // We hydrate a minimal user from the token; full profile is fetched lazily if needed
      setCurrentUser({
        uid:      payload.uid,
        email:    payload.email,
        role:     payload.role,
        name:     payload.name,
        // These are filled on profile fetch or register/login response
        storeName:  payload.storeName  || '',
        phone:      payload.phone      || '',
        photoURL:   payload.photoURL   || '',
      })
    }
    setLoading(false)
  }, [])

  // ── register ──────────────────────────────────────────────
  /**
   * @param {string} email
   * @param {string} password
   * @param {string} name
   * @param {'user'|'seller'|'admin'} role
   * @param {object} extraData  — { storeName, phone }
   */
  const register = async (email, password, name, role = 'user', extraData = {}) => {
    const res = await fetch(`${BASE}/api/auth/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password, name, role, ...extraData }),
    })
    const data = await res.json()
    if (!res.ok) throw { code: data.code, message: data.error }

    localStorage.setItem(TOKEN_KEY, data.token)
    setCurrentUser(data.user)
    return data
  }

  // ── login ─────────────────────────────────────────────────
  const login = async (email, password) => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw { code: data.code, message: data.error }

    localStorage.setItem(TOKEN_KEY, data.token)
    setCurrentUser(data.user)
    return data
  }

  // ── logout ────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setCurrentUser(null)
  }

  // ── refreshProfile ────────────────────────────────────────
  // Re-fetches the full user record from the API and updates state
  const refreshProfile = async () => {
    const token = getValidToken()
    if (!token || !currentUser) return
    try {
      const res = await fetch(`${BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const profile = await res.json()
        setCurrentUser(prev => ({ ...prev, ...profile }))
      }
    } catch { /* ignore — stale data is fine */ }
  }

  // ── Derived flags (match old Firebase context shape) ──────
  const isAdmin  = currentUser?.role === 'admin'
  const isSeller = currentUser?.role === 'seller' || isAdmin

  // userProfile is an alias of currentUser for backward-compat
  // (old code used `userProfile?.name`, `userProfile?.role`, etc.)
  const value = {
    currentUser,
    userProfile:    currentUser,
    loading,
    profileLoading: false,          // no async profile load needed

    isAdmin,
    isSeller,
    isUser: !!currentUser,

    register,
    login,
    logout,
    loginWithGoogle: null,          // Google auth removed
    refreshProfile,

    // Expose the raw token for components that need to call the API directly
    getToken: getValidToken,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
