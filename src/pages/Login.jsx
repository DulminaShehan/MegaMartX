// ============================================================
// Login Page — JWT auth (no Firebase)
// ============================================================

import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const Login = () => {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const from      = location.state?.from?.pathname || '/'

  const [form,    setForm]    = useState({ email: '', password: '' })
  const [showPw,  setShowPw]  = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  // Redirect based on role after login
  const redirectByRole = (user) => {
    if (user?.role === 'admin')  { navigate('/admin',  { replace: true }); return }
    if (user?.role === 'seller') { navigate('/seller', { replace: true }); return }
    navigate(from === '/login' ? '/' : from, { replace: true })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) { toast.error('Please fill in all fields'); return }
    setLoading(true)
    try {
      const { user } = await login(form.email, form.password)
      toast.success(
        user.role === 'seller' ? 'Welcome back, Seller! 🛍️'
        : user.role === 'admin'  ? 'Welcome back, Admin! 🛡️'
        : 'Welcome back! 👋'
      )
      redirectByRole(user)
    } catch (err) {
      toast.error(
        err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password'
          ? 'Invalid email or password'
          : err.message || 'Login failed. Please try again.'
      )
    } finally { setLoading(false) }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* Logo */}
        <div style={s.logoWrap}>
          <Link to="/" style={s.logo}>Mega<span style={s.blue}>Mart</span>X</Link>
        </div>

        <h1 style={s.heading}>Welcome Back</h1>
        <p style={s.sub}>Sign in to your account to continue</p>

        {/* Form */}
        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Email Address</label>
            <div style={s.inputWrap}>
              <FiMail size={15} color="#90caf9" />
              <input
                style={s.input} type="email" name="email"
                placeholder="you@example.com"
                value={form.email} onChange={handleChange} autoComplete="email"
              />
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Password</label>
            <div style={s.inputWrap}>
              <FiLock size={15} color="#90caf9" />
              <input
                style={s.input} type={showPw ? 'text' : 'password'} name="password"
                placeholder="••••••••"
                value={form.password} onChange={handleChange} autoComplete="current-password"
              />
              <button type="button" style={s.eye} onClick={() => setShowPw(p => !p)}>
                {showPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            style={{ ...s.submitBtn, opacity: loading ? 0.75 : 1 }}
            disabled={loading}
          >
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>

        <p style={s.footer}>
          Don't have an account?{' '}
          <Link to="/register" style={s.link}>Sign up free</Link>
        </p>

        <div style={s.sellerNote}>
          New seller?{' '}
          <Link to="/seller-register" style={s.link}>Create a Seller Account</Link>
        </div>
      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #e3f2fd 0%, #ffffff 60%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
  },
  card: {
    background: '#ffffff', border: '1px solid #e3f2fd',
    borderRadius: '20px', padding: '40px 36px',
    width: '100%', maxWidth: '420px',
    boxShadow: '0 20px 60px rgba(33,150,243,0.12)',
    display: 'flex', flexDirection: 'column', gap: '18px',
  },
  logoWrap: { textAlign: 'center' },
  logo:    { fontSize: '24px', fontWeight: 800, color: '#000' },
  blue:    { color: '#2196F3' },
  heading: { color: '#000', fontSize: '22px', fontWeight: 700, margin: 0, textAlign: 'center' },
  sub:     { color: '#777', fontSize: '13px', textAlign: 'center', margin: 0 },

  form:  { display: 'flex', flexDirection: 'column', gap: '14px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { color: '#000', fontSize: '13px', fontWeight: 600 },
  inputWrap: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: '#f0f8ff', border: '1.5px solid #bbdefb',
    borderRadius: '10px', padding: '0 12px',
  },
  input: {
    flex: 1, background: 'none', border: 'none', outline: 'none',
    color: '#000', fontSize: '14px', padding: '11px 0',
  },
  eye: {
    background: 'none', border: 'none', color: '#aaa',
    cursor: 'pointer', display: 'flex', padding: 0,
  },
  submitBtn: {
    padding: '13px', background: '#2196F3', color: '#fff',
    border: 'none', borderRadius: '10px',
    fontSize: '15px', fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(33,150,243,0.3)', marginTop: '4px',
  },
  footer: { color: '#777', fontSize: '13px', textAlign: 'center', margin: 0 },
  link:   { color: '#2196F3', fontWeight: 600 },
  sellerNote: {
    background: '#f0f8ff', border: '1px solid #bbdefb',
    borderRadius: '10px', padding: '12px 14px',
    color: '#777', fontSize: '12px', textAlign: 'center', lineHeight: '1.6',
  },
}

export default Login
