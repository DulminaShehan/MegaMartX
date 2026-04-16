// ============================================================
// ProtectedRoute — wraps routes that need auth or a specific role
// Usage:
//   <ProtectedRoute>           → requires login
//   <ProtectedRoute role="seller"> → requires seller/admin
//   <ProtectedRoute role="admin">  → requires admin only
// ============================================================

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ProtectedRoute = ({ children, role }) => {
  const { currentUser, userProfile, loading } = useAuth()
  const location = useLocation()

  // Still loading Firebase auth state — show nothing
  if (loading) return null

  // Not logged in → redirect to login, remember where they were going
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Role check: seller route requires seller or admin
  if (role === 'seller' && userProfile?.role !== 'seller' && userProfile?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  // Role check: admin route requires admin only
  if (role === 'admin' && userProfile?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute
