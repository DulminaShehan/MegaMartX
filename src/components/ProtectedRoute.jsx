// ============================================================
// ProtectedRoute — wraps routes that need auth or a specific role
// Usage:
//   <ProtectedRoute>                → requires login
//   <ProtectedRoute role="seller">  → requires seller or admin
//   <ProtectedRoute role="admin">   → requires admin only
// ============================================================

import { Navigate, useLocation, Link } from 'react-router-dom'
import { FiShield, FiHome } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'

const AccessDenied = ({ requiredRole }) => (
  <div style={s.wrap}>
    <div style={s.card}>
      <div style={s.iconWrap}>
        <FiShield size={36} color="#1565C0" />
      </div>
      <h2 style={s.title}>Access Denied</h2>
      <p style={s.message}>
        You don't have permission to view this page.
        {requiredRole === 'admin' && ' This area is restricted to administrators only.'}
        {requiredRole === 'seller' && ' This area is restricted to sellers and administrators.'}
      </p>
      <Link to="/" style={s.homeBtn}>
        <FiHome size={15} /> Go to Home
      </Link>
    </div>
  </div>
)

const s = {
  wrap: {
    minHeight: '70vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: '#f0f8ff',
  },
  card: {
    background: '#fff',
    border: '1px solid #bbdefb',
    borderRadius: '16px',
    padding: '40px 48px',
    textAlign: 'center',
    maxWidth: '420px',
    boxShadow: '0 8px 32px rgba(33,150,243,0.10)',
  },
  iconWrap: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: '#e8f4fd',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    border: '2px solid #bbdefb',
  },
  title: { color: '#000', fontWeight: 800, fontSize: '22px', margin: '0 0 12px' },
  message: { color: '#555', fontSize: '14px', lineHeight: 1.6, margin: '0 0 24px' },
  homeBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    padding: '10px 24px',
    background: '#2196F3',
    color: '#fff',
    borderRadius: '10px',
    fontWeight: 700,
    fontSize: '14px',
    boxShadow: '0 4px 14px rgba(33,150,243,0.3)',
  },
}

const ProtectedRoute = ({ children, role }) => {
  const { currentUser, userProfile, loading, profileLoading } = useAuth()
  const location = useLocation()

  // Wait for auth state and profile to resolve
  if (loading || profileLoading) return null

  // Not logged in → redirect to login, remember destination
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Role check: seller route requires seller or admin
  if (role === 'seller' && userProfile?.role !== 'seller' && userProfile?.role !== 'admin') {
    return <AccessDenied requiredRole="seller" />
  }

  // Role check: admin route requires admin only
  if (role === 'admin' && userProfile?.role !== 'admin') {
    return <AccessDenied requiredRole="admin" />
  }

  return children
}

export default ProtectedRoute
