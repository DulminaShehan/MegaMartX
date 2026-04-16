// ============================================================
// Login Page — white + blue theme
// ============================================================

import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi'
import { FcGoogle } from 'react-icons/fc'
import { useAuth } from '../context/AuthContext'
import { getUserProfile } from '../firebase/firestore'
import toast from 'react-hot-toast'

const Login = () => {
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [gLoading, setGLoading] = useState(false)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  // Redirect based on role after any successful login
  const redirectByRole = (profile) => {
    if (profile?.role === 'admin')  { navigate('/admin',  { replace: true }); return }
    if (profile?.role === 'seller') { navigate('/seller', { replace: true }); return }
    navigate(from === '/login' ? '/' : from, { replace: true })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) { toast.error('Please fill in all fields'); return }
    setLoading(true)
    try {
      const cred = await login(form.email, form.password)
      const profile = await getUserProfile(cred.user.uid)
      toast.success(
        profile?.role === 'seller' ? 'Welcome back, Seller! 🛍️'
        : profile?.role === 'admin' ? 'Welcome back, Admin! 🛡️'
        : 'Welcome back! 👋'
      )
      redirectByRole(profile)
    } catch (err) {
      toast.error(
        err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password'
          ? 'Invalid email or password'
          : err.code === 'auth/too-many-requests'
          ? 'Too many attempts. Try again later.'
          : 'Login failed. Please try again.'
      )
    } finally { setLoading(false) }
  }

  const handleGoogle = async () => {
    setGLoading(true)
    try {
      const cred = await loginWithGoogle()
      const profile = await getUserProfile(cred.user.uid)
      toast.success('Logged in with Google!')
      redirectByRole(profile)
    } catch { toast.error('Google login failed.') }
    finally { setGLoading(false) }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* Logo */}
        <div style={s.logoWrap}>
          <Link to="/" style={s.logo}>Mega<span style={s.blue}>Mart</span>X</Link>
        </div>

        <h1 style={s.heading}>Welcome Back</h1>
        <p style={s.sub}>Buyers go to the shop · Sellers go to their dashboard</p>

        {/* Google */}
        <button style={s.googleBtn} onClick={handleGoogle} disabled={gLoading}>
          <FcGoogle size={20} />
          {gLoading ? 'Signing in…' : 'Continue with Google'}
        </button>

        <div style={s.divider}><div style={s.divLine} /><span style={s.divText}>or sign in with email</span><div style={s.divLine} /></div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={s.form}>
          <Field label="Email Address">
            <div style={s.inputWrap}>
              <FiMail size={15} color="#90caf9" />
              <input style={s.input} type="email" name="email" placeholder="you@example.com"
                value={form.email} onChange={handleChange} autoComplete="email" />
            </div>
          </Field>

          <Field label="Password" extra={<a href="#" style={s.forgot}>Forgot password?</a>}>
            <div style={s.inputWrap}>
              <FiLock size={15} color="#90caf9" />
              <input style={s.input} type={showPass ? 'text' : 'password'} name="password"
                placeholder="••••••••" value={form.password} onChange={handleChange} autoComplete="current-password" />
              <button type="button" style={s.eye} onClick={() => setShowPass(p => !p)}>
                {showPass ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </div>
          </Field>

          <button type="submit" style={{ ...s.submitBtn, opacity: loading ? 0.75 : 1 }} disabled={loading}>
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>

        <p style={s.footer}>
          Don't have an account? <Link to="/register" style={s.link}>Sign up free</Link>
        </p>

        <div style={s.sellerNote}>
          New seller?{' '}
          <Link to="/seller-register" style={s.link}>Create a Seller Account</Link>
        </div>
      </div>
    </div>
  )
}

const Field = ({ label, extra, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <label style={{ color: '#000', fontSize: '13px', fontWeight: 600 }}>{label}</label>
      {extra}
    </div>
    {children}
  </div>
)

const s = {
  page: {
    minHeight: '100vh', background: 'linear-gradient(135deg, #e3f2fd 0%, #ffffff 60%)',
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
  logo: { fontSize: '24px', fontWeight: 800, color: '#000' },
  blue: { color: '#2196F3' },
  heading: { color: '#000', fontSize: '22px', fontWeight: 700, margin: 0, textAlign: 'center' },
  sub: { color: '#777', fontSize: '13px', textAlign: 'center', margin: 0 },

  googleBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    padding: '11px', background: '#fff',
    border: '1.5px solid #e0e0e0', borderRadius: '10px',
    fontSize: '14px', fontWeight: 600, color: '#333',
    cursor: 'pointer', width: '100%',
    boxShadow: '0 1px 4px rgba(0,0,0,.06)',
  },
  divider: { display: 'flex', alignItems: 'center', gap: '10px' },
  divLine: { flex: 1, borderTop: '1px solid #e3f2fd' },
  divText: { color: '#aaa', fontSize: '12px', whiteSpace: 'nowrap' },

  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  inputWrap: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: '#f0f8ff', border: '1.5px solid #bbdefb',
    borderRadius: '10px', padding: '0 12px',
  },
  input: {
    flex: 1, background: 'none', border: 'none', outline: 'none',
    color: '#000', fontSize: '14px', padding: '11px 0',
  },
  eye: { background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', display: 'flex', padding: 0 },
  forgot: { color: '#2196F3', fontSize: '12px', fontWeight: 500 },
  submitBtn: {
    padding: '13px', background: '#2196F3', color: '#fff',
    border: 'none', borderRadius: '10px',
    fontSize: '15px', fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(33,150,243,0.3)', marginTop: '4px',
  },
  buyerBadge: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#e3f2fd', border: '1px solid #90caf9',
    color: '#1565C0', borderRadius: '20px',
    fontSize: '13px', fontWeight: 700,
    padding: '6px 16px', alignSelf: 'center',
  },
  footer: { color: '#777', fontSize: '13px', textAlign: 'center', margin: 0 },
  link: { color: '#2196F3', fontWeight: 600 },
  sellerNote: {
    background: '#f0f8ff', border: '1px solid #bbdefb',
    borderRadius: '10px', padding: '12px 14px',
    color: '#777', fontSize: '12px', textAlign: 'center',
    lineHeight: '1.6',
  },
}

export default Login
