// ============================================================
// Seller Register — JWT auth (no Firebase)
// ============================================================

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FiUser, FiMail, FiLock, FiEye, FiEyeOff,
  FiCheck, FiPhone, FiShoppingBag,
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const SellerRegister = () => {
  const { register } = useAuth()
  const navigate     = useNavigate()

  const [form, setForm] = useState({
    name: '', storeName: '', email: '', phone: '', password: '', confirm: '',
  })
  const [showPass,    setShowPass]    = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading,     setLoading]     = useState(false)

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const checks = [
    { label: 'At least 6 characters', ok: form.password.length >= 6 },
    { label: 'Contains a number',     ok: /\d/.test(form.password) },
    { label: 'Passwords match',       ok: !!form.password && form.password === form.confirm },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { name, storeName, email, password, confirm } = form
    if (!name || !storeName || !email || !password || !confirm) {
      toast.error('Please fill in all required fields'); return
    }
    if (password.length < 6)  { toast.error('Password must be at least 6 characters'); return }
    if (password !== confirm)  { toast.error('Passwords do not match'); return }

    setLoading(true)
    try {
      await register(email, password, name, 'seller', {
        storeName,
        phone: form.phone,
      })
      toast.success('Seller account created! Welcome to MegaMartX 🎉')
      navigate('/seller')
    } catch (err) {
      toast.error(
        err.code === 'auth/email-already-in-use' ? 'This email is already registered'
        : err.message || 'Registration failed. Please try again.'
      )
    } finally { setLoading(false) }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <Link to="/" style={s.logo}>Mega<span style={s.blue}>Mart</span>X</Link>

        <div style={s.sellerBadge}>
          <FiShoppingBag size={15} /> Seller Account
        </div>

        <h1 style={s.heading}>Start Selling Today</h1>
        <p style={s.sub}>Create your seller account and reach thousands of shoppers</p>

        <form onSubmit={handleSubmit} style={s.form}>

          <div style={s.field}>
            <label style={s.label}>Full Name <span style={s.req}>*</span></label>
            <div style={s.inputWrap}>
              <FiUser size={15} color="#2196F3" />
              <input style={s.input} name="name" placeholder="John Doe"
                value={form.name} onChange={handleChange} autoComplete="name" />
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Store / Business Name <span style={s.req}>*</span></label>
            <div style={s.inputWrap}>
              <FiShoppingBag size={15} color="#2196F3" />
              <input style={s.input} name="storeName" placeholder="e.g. John's Electronics"
                value={form.storeName} onChange={handleChange} />
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Email Address <span style={s.req}>*</span></label>
            <div style={s.inputWrap}>
              <FiMail size={15} color="#2196F3" />
              <input style={s.input} type="email" name="email" placeholder="you@example.com"
                value={form.email} onChange={handleChange} autoComplete="email" />
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Phone Number <span style={s.opt}>(optional)</span></label>
            <div style={s.inputWrap}>
              <FiPhone size={15} color="#2196F3" />
              <input style={s.input} name="phone" placeholder="+1 (555) 000-0000"
                value={form.phone} onChange={handleChange} />
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Password <span style={s.req}>*</span></label>
            <div style={s.inputWrap}>
              <FiLock size={15} color="#2196F3" />
              <input style={s.input} type={showPass ? 'text' : 'password'} name="password"
                placeholder="Min. 6 characters" value={form.password} onChange={handleChange} />
              <button type="button" style={s.eyeBtn} onClick={() => setShowPass(p => !p)}>
                {showPass ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Confirm Password <span style={s.req}>*</span></label>
            <div style={s.inputWrap}>
              <FiLock size={15} color="#2196F3" />
              <input style={s.input} type={showConfirm ? 'text' : 'password'} name="confirm"
                placeholder="Re-enter password" value={form.confirm} onChange={handleChange} />
              <button type="button" style={s.eyeBtn} onClick={() => setShowConfirm(p => !p)}>
                {showConfirm ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </div>
          </div>

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
            {loading ? 'Creating Seller Account…' : 'Create Seller Account'}
          </button>
        </form>

        <p style={s.footer}>
          Already have an account?{' '}
          <Link to="/login" style={s.link}>Login here</Link>
        </p>

        <div style={s.buyerNote}>
          Just want to shop?{' '}
          <Link to="/register" style={s.link}>Create a Buyer Account</Link> instead.
        </div>
      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #e8f5e9 0%, #ffffff 60%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
  },
  card: {
    background: '#fff', border: '1px solid #c8e6c9',
    borderRadius: '20px', padding: '40px 36px',
    width: '100%', maxWidth: '440px',
    boxShadow: '0 20px 60px rgba(33,150,243,0.10)',
    display: 'flex', flexDirection: 'column', gap: '16px',
  },
  logo: {
    textAlign: 'center', fontSize: '24px',
    fontWeight: 800, color: '#000', textDecoration: 'none', display: 'block',
  },
  blue: { color: '#2196F3' },
  sellerBadge: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
    background: '#e8f5e9', border: '1px solid #a5d6a7',
    color: '#2e7d32', borderRadius: '20px',
    fontSize: '13px', fontWeight: 700,
    padding: '6px 16px', alignSelf: 'center',
  },
  heading: { color: '#000', fontSize: '22px', fontWeight: 700, margin: 0, textAlign: 'center' },
  sub:     { color: '#777', fontSize: '13px', textAlign: 'center', margin: 0 },

  form:  { display: 'flex', flexDirection: 'column', gap: '14px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { color: '#000', fontSize: '13px', fontWeight: 600 },
  req:   { color: '#e53935' },
  opt:   { color: '#aaa', fontWeight: 400 },
  inputWrap: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: '#f0f8ff', border: '1.5px solid #bbdefb',
    borderRadius: '10px', padding: '0 12px',
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
  checkItem:  { display: 'flex', alignItems: 'center', gap: '8px' },
  checkDot: {
    width: '16px', height: '16px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, transition: 'background .2s',
  },
  checkLabel: { fontSize: '12px', transition: 'color .2s' },
  submitBtn: {
    padding: '13px',
    background: 'linear-gradient(135deg, #2196F3 0%, #1565C0 100%)',
    color: '#fff', border: 'none', borderRadius: '10px',
    fontSize: '15px', fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(33,150,243,0.35)', marginTop: '2px',
  },
  footer:  { color: '#777', fontSize: '13px', textAlign: 'center', margin: 0 },
  link:    { color: '#2196F3', fontWeight: 600, textDecoration: 'none' },
  buyerNote: {
    background: '#f0f8ff', border: '1px solid #bbdefb',
    borderRadius: '10px', padding: '12px 14px',
    color: '#777', fontSize: '12px', textAlign: 'center', lineHeight: '1.6',
  },
}

export default SellerRegister
