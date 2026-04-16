// ============================================================
// OrderConfirmation — shown after a successful checkout
// Reads order details from React Router location state (fast
// path) or fetches from the API if the user navigates directly.
// ============================================================

import { useEffect, useState } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import {
  FiCheckCircle, FiPackage, FiMapPin, FiPhone,
  FiCalendar, FiCreditCard, FiShoppingBag, FiHash,
} from 'react-icons/fi'
import { getOrderById } from '../firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { formatPrice, STATUS_COLORS } from '../utils/helpers'
import { FullPageLoader } from '../components/Loader'

const prettyDate = (isoString) => {
  if (!isoString) return 'N/A'
  const d = new Date(isoString)
  return d.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

const OrderConfirmation = () => {
  const { id }                    = useParams()
  const { state }                 = useLocation()
  const { currentUser, isAdmin }  = useAuth()

  const [details,  setDetails]  = useState(state || null)
  const [loading,  setLoading]  = useState(!state)   // skip load if we have state
  const [notFound, setNotFound] = useState(false)

  // If user lands here via direct URL (no router state), fetch from API
  useEffect(() => {
    if (state) {
      setDetails(state)
      return
    }
    getOrderById(id)
      .then(order => {
        if (!order) { setNotFound(true); return }
        if (!isAdmin && order.userId !== currentUser?.uid) { setNotFound(true); return }
        setDetails({
          orderId:       order.id,
          paymentMethod: order.paymentMethod,
          address:       order.address,
          phone:         order.phone,
          total:         order.total,
          deliveryDate:  order.deliveryDate,
          userName:      order.userName,
          userEmail:     order.userEmail,
        })
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id, state, currentUser, isAdmin])

  if (loading)   return <FullPageLoader />
  if (notFound)  return (
    <div style={s.centred}>
      <FiPackage size={44} color="#2196F3" />
      <h2 style={s.notFoundTitle}>Order not found</h2>
      <Link to="/orders" style={s.primaryBtn}>My Orders</Link>
    </div>
  )

  const {
    orderId, paymentMethod, address, phone,
    total, deliveryDate, userName, userEmail,
  } = details

  const isCard = paymentMethod === 'CARD'

  return (
    <div style={s.page}>
      <div style={s.container}>

        {/* ── Success hero ── */}
        <div style={s.hero}>
          <div style={s.heroIcon}>
            <FiCheckCircle size={40} color="#fff" />
          </div>
          <h1 style={s.heroTitle}>Order Placed Successfully!</h1>
          <p style={s.heroSub}>
            Thank you, <strong>{userName}</strong>! Your order has been confirmed
            {isCard ? ' and payment processed' : ''}.
          </p>
        </div>

        {/* ── Detail cards grid ── */}
        <div style={s.grid}>

          {/* Order ID */}
          <InfoCard icon={<FiHash size={17} color="#2196F3" />} label="Order ID">
            <p style={s.mono}>#{orderId?.slice(-12).toUpperCase()}</p>
          </InfoCard>

          {/* Payment method */}
          <InfoCard icon={<FiCreditCard size={17} color="#2196F3" />} label="Payment">
            <div style={s.payBadgeWrap}>
              <span style={{
                ...s.payBadge,
                background: isCard ? '#e3f2fd' : '#e8f5e9',
                color:      isCard ? '#1565c0' : '#2e7d32',
                border:     `1px solid ${isCard ? '#90caf9' : '#a5d6a7'}`,
              }}>
                {isCard ? '💳 Card Payment' : '📦 Cash on Delivery'}
              </span>
              <span style={{ ...s.statusDot, color: STATUS_COLORS['pending'] }}>Pending</span>
            </div>
          </InfoCard>

          {/* Delivery address */}
          <InfoCard icon={<FiMapPin size={17} color="#2196F3" />} label="Delivery Address">
            <p style={s.infoText}>{address || '—'}</p>
          </InfoCard>

          {/* Phone */}
          <InfoCard icon={<FiPhone size={17} color="#2196F3" />} label="Phone Number">
            <p style={s.infoText}>{phone || '—'}</p>
          </InfoCard>

          {/* Estimated delivery */}
          <InfoCard icon={<FiCalendar size={17} color="#2196F3" />} label="Estimated Delivery">
            <p style={s.deliveryDate}>{prettyDate(deliveryDate)}</p>
            <p style={s.deliverySub}>3–5 business days</p>
          </InfoCard>

          {/* Order total */}
          <InfoCard icon={<FiShoppingBag size={17} color="#2196F3" />} label="Order Total">
            <p style={s.totalAmt}>{formatPrice(total)}</p>
            {!isCard && (
              <p style={s.codNote}>Payable on delivery</p>
            )}
          </InfoCard>

        </div>

        {/* ── What happens next timeline ── */}
        <div style={s.timeline}>
          <h3 style={s.timelineTitle}>What happens next?</h3>
          <div style={s.steps}>
            {[
              { icon: '✅', label: 'Order Confirmed',     done: true  },
              { icon: '📦', label: 'Packing Your Items',  done: false },
              { icon: '🚚', label: 'Out for Delivery',    done: false },
              { icon: '🎉', label: 'Delivered to You',    done: false },
            ].map((step, i) => (
              <div key={i} style={s.step}>
                <div style={{ ...s.stepCircle, background: step.done ? '#2196F3' : '#e3f2fd' }}>
                  <span style={{ fontSize: '16px' }}>{step.icon}</span>
                </div>
                {i < 3 && <div style={{ ...s.stepLine, background: step.done ? '#2196F3' : '#e3f2fd' }} />}
                <p style={{ ...s.stepLabel, color: step.done ? '#2196F3' : '#aaa', fontWeight: step.done ? 700 : 400 }}>
                  {step.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div style={s.actions}>
          <Link to={`/orders/${orderId}`} style={s.primaryBtn}>
            <FiPackage size={15} /> Track This Order
          </Link>
          <Link to="/orders" style={s.secondaryBtn}>
            View All Orders
          </Link>
          <Link to="/shop" style={s.ghostBtn}>
            Continue Shopping
          </Link>
        </div>

        {/* Email note */}
        <p style={s.emailNote}>
          A confirmation has been sent to <strong>{userEmail}</strong>
        </p>
      </div>
    </div>
  )
}

// ── Small helper component ────────────────────────────────────
const InfoCard = ({ icon, label, children }) => (
  <div style={s.infoCard}>
    <div style={s.infoCardHead}>
      {icon}
      <span style={s.infoCardLabel}>{label}</span>
    </div>
    <div style={s.infoCardBody}>{children}</div>
  </div>
)

// ── Styles ────────────────────────────────────────────────────
const s = {
  page:      { background: '#fff', minHeight: '80vh', padding: '40px 0 80px' },
  container: { maxWidth: '860px', margin: '0 auto', padding: '0 20px' },

  // Hero
  hero: {
    textAlign: 'center', marginBottom: '36px',
    padding: '36px 24px',
    background: 'linear-gradient(135deg, #2196F3 0%, #1565C0 100%)',
    borderRadius: '20px',
    boxShadow: '0 8px 32px rgba(33,150,243,0.3)',
  },
  heroIcon: {
    width: '72px', height: '72px', borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 16px',
  },
  heroTitle: { color: '#fff', fontSize: '26px', fontWeight: 800, margin: '0 0 8px' },
  heroSub:   { color: 'rgba(255,255,255,0.88)', fontSize: '15px', margin: 0 },

  // Detail grid
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '14px', marginBottom: '28px',
  },

  infoCard: {
    background: '#fff', border: '1.5px solid #e3f2fd',
    borderRadius: '14px', overflow: 'hidden',
    boxShadow: '0 2px 10px rgba(33,150,243,0.05)',
  },
  infoCardHead: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '12px 16px', background: '#f0f8ff',
    borderBottom: '1px solid #e3f2fd',
  },
  infoCardLabel: { color: '#555', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' },
  infoCardBody:  { padding: '14px 16px' },

  // Card content
  mono:         { color: '#000', fontSize: '14px', fontWeight: 700, margin: 0, fontFamily: 'monospace', letterSpacing: '0.5px' },
  infoText:     { color: '#000', fontSize: '13px', fontWeight: 500, margin: 0, lineHeight: 1.5 },
  deliveryDate: { color: '#000', fontSize: '13px', fontWeight: 700, margin: 0 },
  deliverySub:  { color: '#888', fontSize: '12px', margin: '4px 0 0' },
  totalAmt:     { color: '#2196F3', fontSize: '20px', fontWeight: 800, margin: 0 },
  codNote:      { color: '#888', fontSize: '12px', margin: '4px 0 0' },

  payBadgeWrap: { display: 'flex', flexDirection: 'column', gap: '6px' },
  payBadge: {
    display: 'inline-block', fontSize: '12px', fontWeight: 700,
    padding: '4px 10px', borderRadius: '20px',
  },
  statusDot: { fontSize: '12px', fontWeight: 600 },

  // Timeline
  timeline: {
    background: '#f0f8ff', border: '1.5px solid #e3f2fd',
    borderRadius: '16px', padding: '24px',
    marginBottom: '28px',
  },
  timelineTitle: { color: '#000', fontSize: '15px', fontWeight: 700, margin: '0 0 20px' },
  steps: { display: 'flex', alignItems: 'flex-start', justifyContent: 'center' },
  step:  { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' },
  stepCircle: {
    width: '44px', height: '44px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  stepLine: {
    position: 'absolute', top: '22px', left: '50%',
    width: '100%', height: '3px', zIndex: 0,
  },
  stepLabel: { fontSize: '11px', marginTop: '8px', textAlign: 'center' },

  // Action buttons
  actions: {
    display: 'flex', gap: '12px', justifyContent: 'center',
    flexWrap: 'wrap', marginBottom: '20px',
  },
  primaryBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '7px',
    padding: '12px 28px', background: '#2196F3', color: '#fff',
    borderRadius: '10px', fontWeight: 700, fontSize: '14px',
    boxShadow: '0 4px 14px rgba(33,150,243,0.3)',
  },
  secondaryBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '7px',
    padding: '12px 28px', background: '#f0f8ff', color: '#2196F3',
    border: '1.5px solid #bbdefb',
    borderRadius: '10px', fontWeight: 700, fontSize: '14px',
  },
  ghostBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '7px',
    padding: '12px 28px', background: 'none', color: '#555',
    border: '1.5px solid #e3f2fd',
    borderRadius: '10px', fontWeight: 600, fontSize: '14px',
  },

  emailNote: { color: '#aaa', fontSize: '12px', textAlign: 'center', margin: 0 },

  // Not found
  centred: {
    minHeight: '60vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: '14px',
  },
  notFoundTitle: { color: '#000', fontSize: '22px', fontWeight: 700, margin: 0 },
}

export default OrderConfirmation
