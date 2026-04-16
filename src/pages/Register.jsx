// ============================================================
// Register Page — simple user registration (no role selector)
// ============================================================

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiCheck } from 'react-icons/fi'
import { FcGoogle } from 'react-icons/fc'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const Register = () => {
  const { register, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [showPass, setShowPass]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading]       = useState(false)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  // Password strength checks
  const checks = [
    { label: 'At least 6 characters', ok: form.password.length >= 6 },
    { label: 'Contains a number',     ok: /\d/.test(form.password) },
    { label: 'Passwords match',       ok: form.password && form.password === form.confirm },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { name, email, password, confirm } = form
    if (!name || !email || !password || !confirm) { toast.error('Please fill in all fields'); return }
    if (password.length < 6)    { toast.error('Password must be at least 6 characters'); return }
    if (password !== confirm)   { toast.error('Passwords do not match'); return }
    setLoading(true)
    try {
      await register(email, password, name)
      toast.success('Account created! Welcome to MegaMartX 🎉')
      navigate('/')
    } catch (err) {
      toast.error(
        err.code === 'auth/email-already-in-use' ? 'This email is already registered'
        : err.code === 'auth/invalid-email'      ? 'Invalid email address'
        : 'Registration failed. Please try again.'
      )
    } finally { setLoading(false) }
  }

  const handleGoogle = async () => {
    try { await loginWithGoogle(); toast.success('Welcome to MegaMartX! 🎉'); navigate('/') }
    catch { toast.error('Google sign-up failed. Try again.') }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>

        {/* Logo */}
        <Link to="/" style={s.logo}>Mega<span style={s.blue}>Mart</span>X</Link>
        <div style={s.buyerBadge}>Buyer Account</div>
        <h1 style={s.heading}>Create Buyer Account</h1>
        <p style={s.sub}>Join thousands of shoppers on MegaMartX</p>

        {/* Google */}
        <button style={s.googleBtn} onClick={handleGoogle} type="button">
          <FcGoogle size={20} />
          Continue with Google
        </button>

        <div style={s.divider}>
          <div style={s.line} /><span style={s.orText}>or sign up with email</span><div style={s.line} />
        </div>

        <form onSubmit={handleSubmit} style={s.form}>

          {/* Full Name */}
          <div style={s.field}>
            <label style={s.label}>Full Name</label>
            <div style={s.inputWrap}>
              <FiUser size={15} color="#90caf9" />
              <input style={s.input} name="name" placeholder="John Doe"
                value={form.name} onChange={handleChange} autoComplete="name" />
            </div>
          </div>

          {/* Email */}
          <div style={s.field}>
            <label style={s.label}>Email Address</label>
            <div style={s.inputWrap}>
              <FiMail size={15} color="#90caf9" />
              <input style={s.input} type="email" name="email" placeholder="you@example.com"
                value={form.email} onChange={handleChange} autoComplete="email" />
            </div>
          </div>

          {/* Password */}
          <div style={s.field}>
            <label style={s.label}>Password</label>
            <div style={s.inputWrap}>
              <FiLock size={15} color="#90caf9" />
              <input style={s.input} type={showPass ? 'text' : 'password'} name="password"
                placeholder="Min. 6 characters" value={form.password} onChange={handleChange} />
              <button type="button" style={s.eyeBtn} onClick={() => setShowPass(p => !p)}>
                {showPass ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div style={s.field}>
            <label style={s.label}>Confirm Password</label>
            <div style={s.inputWrap}>
              <FiLock size={15} color="#90caf9" />
              <input style={s.input} type={showConfirm ? 'text' : 'password'} name="confirm"
                placeholder="Re-enter password" value={form.confirm} onChange={handleChange} />
              <button type="button" style={s.eyeBtn} onClick={() => setShowConfirm(p => !p)}>
                {showConfirm ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </div>
          </div>

          {/* Password strength checklist */}
          {form.password && (
            <div style={s.checkList}>
              {checks.map(({ label, ok }) => (
                <div key={label} style={s.checkItem}>
                  <div style={{ ...s.checkDot, background: ok ? '#2196F3' : '#ddd' }}>
                    {ok && <FiCheck size={10} color="#fff" strokeWidth={3} />}
                  </div>
                  <span style={{ ...s.checkLabel, color: ok ? '#2196F3' : '#aaa' }}>{label}</span>
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            style={{ ...s.submitBtn, opacity: loading ? 0.75 : 1 }}
            disabled={loading}
          >
            {loading ? 'Creating Account…' : 'Create Account'}
          </button>
        </form>

        <p style={s.footer}>
          Already have an account?{' '}
          <Link to="/login" style={s.link}>Sign in here</Link>
        </p>

        {/* Seller note */}
        <div style={s.sellerNote}>
          Want to sell on MegaMartX?{' '}
          <Link to="/seller-register" style={s.link}>Create a Seller Account</Link> instead.
        </div>
      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #e3f2fd 0%, #ffffff 60%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px',
  },
  card: {
    background: '#fff', border: '1px solid #e3f2fd',
    borderRadius: '20px', padding: '40px 36px',
    width: '100%', maxWidth: '420px',
    boxShadow: '0 20px 60px rgba(33,150,243,0.12)',
    display: 'flex', flexDirection: 'column', gap: '16px',
  },
  logo: {
    textAlign: 'center', fontSize: '24px',
    fontWeight: 800, color: '#000',
    textDecoration: 'none', display: 'block',
  },
  blue: { color: '#2196F3' },
  buyerBadge: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#e3f2fd', border: '1px solid #90caf9',
    color: '#1565C0', borderRadius: '20px',
    fontSize: '13px', fontWeight: 700,
    padding: '6px 16px', alignSelf: 'center',
  },
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
  line: { flex: 1, borderTop: '1px solid #e3f2fd' },
  orText: { color: '#aaa', fontSize: '12px', whiteSpace: 'nowrap' },

  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { color: '#000', fontSize: '13px', fontWeight: 600 },
  inputWrap: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: '#f0f8ff', border: '1.5px solid #bbdefb',
    borderRadius: '10px', padding: '0 12px',
    transition: 'border-color .2s',
  },
  input: {
    flex: 1, background: 'none', border: 'none', outline: 'none',
    color: '#000', fontSize: '14px', padding: '11px 0',
  },
  eyeBtn: {
    background: 'none', border: 'none', color: '#aaa',
    cursor: 'pointer', display: 'flex', padding: 0, flexShrink: 0,
  },

  checkList: {
    display: 'flex', flexDirection: 'column', gap: '6px',
    background: '#f0f8ff', borderRadius: '10px', padding: '12px 14px',
  },
  checkItem: { display: 'flex', alignItems: 'center', gap: '8px' },
  checkDot: {
    width: '16px', height: '16px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, transition: 'background .2s',
  },
  checkLabel: { fontSize: '12px', transition: 'color .2s' },

  submitBtn: {
    padding: '13px', background: '#2196F3', color: '#fff',
    border: 'none', borderRadius: '10px',
    fontSize: '15px', fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(33,150,243,0.3)',
    marginTop: '2px',
  },

  footer: { color: '#777', fontSize: '13px', textAlign: 'center', margin: 0 },
  link: { color: '#2196F3', fontWeight: 600, textDecoration: 'none' },

  sellerNote: {
    background: '#f0f8ff', border: '1px solid #bbdefb',
    borderRadius: '10px', padding: '12px 14px',
    color: '#777', fontSize: '12px', textAlign: 'center',
    lineHeight: '1.6',
  },
}

export default Register
