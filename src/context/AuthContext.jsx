import { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth'
import { auth, googleProvider } from '../firebase/config'
import { createUserProfile, getUserProfile } from '../firebase/firestore'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const register = async (email, password, name, role = 'user', extraData = {}) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName: name })

    const profileData = { name, email, role, photoURL: '', ...extraData }

    await createUserProfile(cred.user.uid, profileData)
    return cred
  }

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password)

  const loginWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider)
    const existing = await getUserProfile(cred.user.uid)
    if (!existing) {
      const profileData = {
        name: cred.user.displayName,
        email: cred.user.email,
        role: 'user',
        photoURL: cred.user.photoURL || '',
      }
      await createUserProfile(cred.user.uid, profileData)
    }
    return cred
  }

  const logout = () => signOut(auth)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      if (user) {
        try {
          // Firestore may not exist yet — catch and continue
          const profile = await getUserProfile(user.uid)
          setUserProfile(profile)
        } catch (err) {
          console.warn('Could not load user profile (Firestore may not be set up yet):', err.message)
          setUserProfile(null)
        }
      } else {
        setUserProfile(null)
      }
      // Always unblock the app regardless of Firestore errors
      setLoading(false)
    })

    // Safety net: unblock after 5 seconds even if Firebase never responds
    const timeout = setTimeout(() => setLoading(false), 5000)

    return () => {
      unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const isAdmin  = userProfile?.role === 'admin'
  const isSeller = userProfile?.role === 'seller' || isAdmin

  const value = {
    currentUser, userProfile, loading,
    isAdmin, isSeller, isUser: !!currentUser,
    register, login, loginWithGoogle, logout,
    refreshProfile: async () => {
      if (currentUser) {
        try {
          const profile = await getUserProfile(currentUser.uid)
          setUserProfile(profile)
        } catch { /* ignore */ }
      }
    },
  }

  // Always render children — never block on loading
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
