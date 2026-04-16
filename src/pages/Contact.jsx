// ============================================================
// Contact Page — white + blue theme
// ============================================================

import { useState } from 'react'
import { FiMail, FiPhone, FiMapPin, FiSend, FiClock } from 'react-icons/fi'
import toast from 'react-hot-toast'

const Contact = () => {
  const [form, setForm] = useState({ name:'', email:'', subject:'', message:'' })
  const [sending, setSending] = useState(false)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) { toast.error('Please fill required fields'); return }
    setSending(true)
    await new Promise(r => setTimeout(r, 1200))
    toast.success("Message sent! We'll reply within 24 hours.")
    setForm({ name:'', email:'', subject:'', message:'' })
    setSending(false)
  }

  return (
    <div style={s.page}>
      {/* Hero */}
      <section style={s.hero}>
        <h1 style={s.heroTitle}>Get in <span style={s.blue}>Touch</span></h1>
        <p style={s.heroSub}>We're here to help — reach out anytime and we'll get back to you within 24 hours.</p>
      </section>

      <div style={s.container}>
        <div style={s.layout}>
          {/* Info column */}
          <div style={s.infoCol}>
            <h2 style={s.infoTitle}>Contact Information</h2>
            <p style={s.infoSub}>Choose how you'd like to reach us.</p>

            {[
              { Icon: FiMapPin, label: 'Office',  val: '123 Market Street, Colombo 03, Sri Lanka' },
              { Icon: FiPhone,  label: 'Phone',   val: '+94 77 123 4567' },
              { Icon: FiMail,   label: 'Email',   val: 'support@megamartx.com' },
            ].map(({ Icon, label, val }) => (
              <div key={label} style={s.infoItem}>
                <div style={s.infoIcon}><Icon size={17} color="#2196F3" /></div>
                <div>
                  <p style={s.infoLabel}>{label}</p>
                  <p style={s.infoVal}>{val}</p>
                </div>
              </div>
            ))}

            <div style={s.hoursBox}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
                <FiClock size={14} color="#2196F3" />
                <span style={{ color:'#000', fontWeight:700, fontSize:'14px' }}>Support Hours</span>
              </div>
              {[['Mon – Fri','9 AM – 6 PM'],['Saturday','10 AM – 4 PM'],['Sunday','Closed']].map(([day,hrs]) => (
                <div key={day} style={s.hoursRow}>
                  <span style={s.hoursDay}>{day}</span>
                  <span style={{ color: hrs === 'Closed' ? '#e53935' : '#2196F3', fontWeight:600, fontSize:'13px' }}>{hrs}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Form column */}
          <div style={s.formBox}>
            <h2 style={s.formTitle}>Send a Message</h2>
            <form onSubmit={handleSubmit} style={s.form}>
              <div style={s.row2}>
                <F label="Your Name *"><input style={s.input} name="name" placeholder="John Doe" value={form.name} onChange={handleChange} required /></F>
                <F label="Email Address *"><input style={s.input} type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required /></F>
              </div>
              <F label="Subject"><input style={s.input} name="subject" placeholder="How can we help?" value={form.subject} onChange={handleChange} /></F>
              <F label="Message *"><textarea style={{ ...s.input, minHeight:'130px', resize:'vertical' }} name="message" placeholder="Describe your issue in detail…" value={form.message} onChange={handleChange} required /></F>
              <button type="submit" style={{ ...s.sendBtn, opacity: sending ? 0.75 : 1 }} disabled={sending}>
                <FiSend size={15} /> {sending ? 'Sending…' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

const F = ({ label, children }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
    <label style={{ color:'#000', fontSize:'13px', fontWeight:600 }}>{label}</label>
    {children}
  </div>
)

const s = {
  page: { background:'#fff' },
  hero: {
    background:'linear-gradient(135deg, #e3f2fd 0%, #ffffff 70%)',
    padding:'64px 24px', textAlign:'center',
    borderBottom:'1px solid #e3f2fd',
  },
  heroTitle: { color:'#000', fontSize:'clamp(28px,5vw,44px)', fontWeight:800, margin:'0 0 12px' },
  blue: { color:'#2196F3' },
  heroSub: { color:'#555', fontSize:'16px', margin:'0 auto', maxWidth:'520px' },
  container: { maxWidth:'1100px', margin:'0 auto', padding:'56px 20px 80px' },
  layout: { display:'grid', gridTemplateColumns:'1fr 1.5fr', gap:'48px', alignItems:'start' },
  infoCol: {},
  infoTitle: { color:'#000', fontSize:'20px', fontWeight:700, margin:'0 0 8px' },
  infoSub: { color:'#777', fontSize:'14px', margin:'0 0 24px', lineHeight:'1.7' },
  infoItem: { display:'flex', alignItems:'flex-start', gap:'14px', marginBottom:'20px' },
  infoIcon: { width:'40px', height:'40px', background:'#e3f2fd', border:'1px solid #bbdefb', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  infoLabel: { color:'#888', fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.5px', margin:'0 0 3px', fontWeight:600 },
  infoVal: { color:'#000', fontSize:'14px', fontWeight:500, margin:0 },
  hoursBox: { background:'#f0f8ff', border:'1px solid #bbdefb', borderRadius:'12px', padding:'16px 18px' },
  hoursRow: { display:'flex', justifyContent:'space-between', marginBottom:'6px' },
  hoursDay: { color:'#555', fontSize:'13px' },
  formBox: { background:'#fff', border:'1.5px solid #e3f2fd', borderRadius:'16px', padding:'32px', boxShadow:'0 4px 24px rgba(33,150,243,0.08)' },
  formTitle: { color:'#000', fontSize:'20px', fontWeight:700, margin:'0 0 24px' },
  form: { display:'flex', flexDirection:'column', gap:'16px' },
  row2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' },
  input: { background:'#f0f8ff', border:'1.5px solid #bbdefb', borderRadius:'10px', color:'#000', fontSize:'14px', padding:'11px 14px', outline:'none', fontFamily:'inherit', boxSizing:'border-box', width:'100%' },
  sendBtn: { display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', padding:'13px', background:'#2196F3', color:'#fff', border:'none', borderRadius:'10px', fontSize:'15px', fontWeight:700, cursor:'pointer', boxShadow:'0 4px 14px rgba(33,150,243,0.3)' },
}

export default Contact
