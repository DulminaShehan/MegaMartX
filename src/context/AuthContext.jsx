import { createContext, useContext, useEffect, useRef, useState } from 'react'
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
  const [currentUser, setCurrentUser]       = useState(null)
  const [userProfile, setUserProfile]       = useState(null)
  const [loading, setLoading]               = useState(true)
  const [profileLoading, setProfileLoading] = useState(true)

  // Prevents onAuthStateChanged from auto-creating a 'user' profile
  // during registration (race condition: auth fires before profile is saved)
  const isRegistering = useRef(false)

  const register = async (email, password, name, role = 'user', extraData = {}) => {
    isRegistering.current = true
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(cred.user, { displayName: name })
      const profileData = { name, email, role, photoURL: '', ...extraData }
      await createUserProfile(cred.user.uid, profileData)
      return cred
    } finally {
      isRegistering.current = false
    }
  }

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password)

  const loginWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider)
    const existing = await getUserProfile(cred.user.uid)
    if (!existing) {
      const profileData = {
        name:     cred.user.displayName || cred.user.email,
        email:    cred.user.email,
        role:     'user',
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
      setProfileLoading(true)
      if (user) {
        try {
          let profile = await getUserProfile(user.uid)

          // Returning user whose profile doesn't exist in MySQL yet — auto-create.
          // Skip during active registration to avoid overwriting the seller/admin role.
          if (!profile && !isRegistering.current) {
            const profileData = {
              name:     user.displayName || user.email,
              email:    user.email,
              role:     'user',
              photoURL: user.photoURL || '',
            }
            profile = await createUserProfile(user.uid, profileData)
          }

          setUserProfile(profile)
        } catch (err) {
          console.warn('Could not load user profile:', err.message)
          setUserProfile(null)
        }
      } else {
        setUserProfile(null)
      }
      setLoading(false)
      setProfileLoading(false)
    })

    const timeout = setTimeout(() => setLoading(false), 5000)
    return () => { unsubscribe(); clearTimeout(timeout) }
  }, [])

  const isAdmin  = userProfile?.role === 'admin'
  const isSeller = userProfile?.role === 'seller' || isAdmin

  const value = {
    currentUser, userProfile, loading, profileLoading,
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
