// ============================================================
// OrderDetails — full single-order view (/orders/:id)
// ============================================================

import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  FiArrowLeft, FiPackage, FiCalendar, FiHash,
  FiUser, FiMail, FiTruck, FiStar, FiCheck, FiEdit2,
} from 'react-icons/fi'
import { getOrderById, submitReview, checkReviewed } from '../firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { formatPrice, formatDate, STATUS_COLORS, imgFallback } from '../utils/helpers'
import { FullPageLoader } from '../components/Loader'
import toast from 'react-hot-toast'

const STATUS_STEPS = ['pending', 'processing', 'shipped', 'delivered']

// ── Star selector ────────────────────────────────────────────
const StarPicker = ({ value, onChange }) => (
  <div style={{ display: 'flex', gap: '6px' }}>
    {[1,2,3,4,5].map(n => (
      <button
        key={n} type="button"
        onClick={() => onChange(n)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
      >
        <FiStar
          size={28}
          fill={n <= value ? '#f59e0b' : 'none'}
          color={n <= value ? '#f59e0b' : '#ccc'}
        />
      </button>
    ))}
    {value > 0 && (
      <span style={{ alignSelf: 'center', fontSize: '13px', color: '#888', marginLeft: '4px' }}>
        {['','Poor','Fair','Good','Very Good','Excellent'][value]}
      </span>
    )}
  </div>
)

// ── Per-item review panel ────────────────────────────────────
const ReviewPanel = ({ item, orderId, currentUser }) => {
  const [reviewed,  setReviewed]  = useState(null)   // null=checking, true/false
  const [open,      setOpen]      = useState(false)
  const [rating,    setRating]    = useState(0)
  const [comment,   setComment]   = useState('')
  const [busy,      setBusy]      = useState(false)

  useEffect(() => {
    if (!currentUser) return
    checkReviewed(item.productId, orderId)
      .then(d => setReviewed(d.reviewed))
      .catch(() => setReviewed(false))
  }, [item.productId, orderId, currentUser])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (rating === 0) { toast.error('Please select a star rating'); return }
    setBusy(true)
    try {
      await submitReview({ productId: item.productId, orderId, rating, comment })
      setReviewed(true)
      setOpen(false)
      toast.success('Review submitted! Thank you.')
    } catch (err) {
      toast.error(err.message)
    } finally { setBusy(false) }
  }

  if (reviewed === null) return null   // still checking

  if (reviewed) return (
    <div style={rs.done}>
      <FiCheck size={14} color="#2e7d32" />
      <span style={{ color: '#2e7d32', fontSize: '12px', fontWeight: 600 }}>Review submitted</span>
    </div>
  )

  return (
    <div style={rs.wrap}>
      {!open ? (
        <button style={rs.writeBtn} onClick={() => setOpen(true)}>
          <FiEdit2 size={13} /> Write a Review
        </button>
      ) : (
        <form onSubmit={handleSubmit} style={rs.form}>
          <p style={rs.formTitle}>Rate this product</p>
          <StarPicker value={rating} onChange={setRating} />
          <textarea
            style={rs.textarea}
            placeholder="Share your experience (optional)…"
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
          />
          <div style={rs.formBtns}>
            <button type="button" style={rs.cancelBtn} onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" style={{ ...rs.submitBtn, opacity: busy ? 0.7 : 1 }} disabled={busy}>
              {busy ? 'Submitting…' : 'Submit Review'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

const rs = {
  wrap:      { marginTop: '10px' },
  done:      { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', padding: '6px 10px', background: '#e8f5e9', borderRadius: '8px', width: 'fit-content' },
  writeBtn:  { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#f0f8ff', border: '1.5px solid #90caf9', borderRadius: '8px', color: '#1565C0', fontSize: '12px', fontWeight: 600, cursor: 'pointer' },
  form:      { marginTop: '8px', background: '#f8faff', border: '1.5px solid #e3f2fd', borderRadius: '12px', padding: '16px' },
  formTitle: { color: '#000', fontSize: '13px', fontWeight: 700, margin: '0 0 10px' },
  textarea:  { width: '100%', marginTop: '12px', padding: '10px 12px', border: '1.5px solid #bbdefb', borderRadius: '8px', fontSize: '13px', color: '#000', background: '#fff', resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  formBtns:  { display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'flex-end' },
  cancelBtn: { padding: '7px 16px', background: 'none', border: '1.5px solid #ddd', borderRadius: '8px', color: '#888', fontSize: '12px', cursor: 'pointer' },
  submitBtn: { padding: '7px 18px', background: '#2196F3', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' },
}

const OrderDetails = () => {
  const { id }                  = useParams()
  const { currentUser, isAdmin } = useAuth()
  const navigate                = useNavigate()

  const [order,   setOrder]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    getOrderById(id)
      .then(data => {
        if (!data) { setNotFound(true); return }
        // Security: regular users can only see their own orders
        if (!isAdmin && data.userId !== currentUser?.uid) {
          setNotFound(true)
          return
        }
        setOrder(data)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id, currentUser, isAdmin])

  if (loading) return <FullPageLoader />

  if (notFound) return (
    <div style={s.centred}>
      <div style={s.notFoundIcon}><FiPackage size={42} color="#2196F3" /></div>
      <h2 style={s.notFoundTitle}>Order not found</h2>
      <p style={s.notFoundSub}>This order doesn't exist or you don't have permission to view it.</p>
      <Link to="/orders" style={s.backBtn}>Back to My Orders</Link>
    </div>
  )

  const statusColor  = STATUS_COLORS[order.status] || '#888'
  const stepIndex    = STATUS_STEPS.indexOf(order.status)
  const isCancelled  = order.status === 'cancelled'

  return (
    <div style={s.page}>
      <div style={s.container}>

        {/* ── Back link ── */}
        <button style={s.back} onClick={() => navigate(-1)}>
          <FiArrowLeft size={15} /> Back to Orders
        </button>

        {/* ── Page header ── */}
        <div style={s.header}>
          <div>
            <h1 style={s.title}>Order Details</h1>
            <p style={s.orderId}>
              <FiHash size={13} style={{ verticalAlign: 'middle' }} />
              {' '}#{order.id.slice(-12).toUpperCase()}
            </p>
          </div>
          <span style={{
            ...s.statusBadge,
            color:      statusColor,
            background: statusColor + '18',
            border:     `1px solid ${statusColor}44`,
          }}>
            {order.status
              ? order.status.charAt(0).toUpperCase() + order.status.slice(1)
              : 'Pending'}
          </span>
        </div>

        {/* ── Progress tracker (hidden for cancelled) ── */}
        {!isCancelled && (
          <div style={s.progressCard}>
            <div style={s.progressSteps}>
              {STATUS_STEPS.map((step, i) => {
                const done    = i <= stepIndex
                const current = i === stepIndex
                return (
                  <div key={step} style={s.stepWrap}>
                    {/* Connector line */}
                    {i > 0 && (
                      <div style={{
                        ...s.connector,
                        background: i <= stepIndex ? '#2196F3' : '#e3f2fd',
                      }} />
                    )}
                    <div style={{
                      ...s.stepDot,
                      background: done ? '#2196F3' : '#e3f2fd',
                      border:     current ? '3px solid #2196F3' : '2px solid ' + (done ? '#2196F3' : '#bbdefb'),
                      boxShadow:  current ? '0 0 0 4px rgba(33,150,243,0.15)' : 'none',
                    }}>
                      {done && !current && <span style={s.checkMark}>✓</span>}
                    </div>
                    <p style={{
                      ...s.stepLabel,
                      color:      done ? '#2196F3' : '#aaa',
                      fontWeight: current ? 700 : 500,
                    }}>
                      {step.charAt(0).toUpperCase() + step.slice(1)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div style={s.grid}>

          {/* ── Left column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Order items */}
            <div style={s.card}>
              <h3 style={s.cardTitle}>
                <FiPackage size={16} style={{ verticalAlign: 'middle', marginRight: '7px', color: '#2196F3' }} />
                Items ({order.items?.length || 0})
              </h3>
              {order.status === 'delivered' && (
                <div style={s.reviewBanner}>
                  <FiStar size={15} color="#f59e0b" fill="#f59e0b" />
                  <span>Your order was delivered! Share your experience for each item below.</span>
                </div>
              )}
              <div style={s.itemList}>
                {order.items?.map((item, i) => (
                  <div key={i} style={s.itemRow}>
                    <img
                      src={item.imageUrl || imgFallback(80, 80)}
                      alt={item.title}
                      style={s.itemImg}
                      onError={e => { e.target.src = imgFallback(80, 80) }}
                    />
                    <div style={s.itemInfo}>
                      <p style={s.itemTitle}>{item.title}</p>
                      <p style={s.itemMeta}>
                        Sold by <strong>{item.sellerName || 'MegaMartX'}</strong>
                      </p>
                      <p style={s.itemMeta}>Qty: {item.quantity}</p>
                      {order.status === 'delivered' && (
                        <ReviewPanel
                          item={item}
                          orderId={order.id}
                          currentUser={currentUser}
                        />
                      )}
                    </div>
                    <div style={s.itemPriceWrap}>
                      <p style={s.itemUnitPrice}>{formatPrice(item.price)} each</p>
                      <p style={s.itemTotal}>{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Buyer info */}
            <div style={s.card}>
              <h3 style={s.cardTitle}>
                <FiUser size={16} style={{ verticalAlign: 'middle', marginRight: '7px', color: '#2196F3' }} />
                Customer
              </h3>
              <div style={s.infoRow}>
                <FiUser size={14} color="#90caf9" />
                <span style={s.infoLabel}>Name</span>
                <span style={s.infoVal}>{order.userName || '—'}</span>
              </div>
              <div style={s.infoRow}>
                <FiMail size={14} color="#90caf9" />
                <span style={s.infoLabel}>Email</span>
                <span style={s.infoVal}>{order.userEmail || '—'}</span>
              </div>
              <div style={s.infoRow}>
                <FiCalendar size={14} color="#90caf9" />
                <span style={s.infoLabel}>Placed</span>
                <span style={s.infoVal}>{formatDate(order.createdAt)}</span>
              </div>
              <div style={s.infoRow}>
                <FiTruck size={14} color="#90caf9" />
                <span style={s.infoLabel}>Status</span>
                <span style={{ ...s.infoVal, color: statusColor, fontWeight: 700 }}>
                  {order.status
                    ? order.status.charAt(0).toUpperCase() + order.status.slice(1)
                    : 'Pending'}
                </span>
              </div>
            </div>
          </div>

          {/* ── Right column — summary ── */}
          <div style={s.summary}>
            <h3 style={s.cardTitle}>Order Summary</h3>

            {[
              ['Subtotal',              formatPrice(order.subtotal)],
              ['Shipping',              order.shipping === 0 ? 'FREE' : formatPrice(order.shipping)],
              ['Tax (8%)',              formatPrice(order.tax)],
            ].map(([label, value]) => (
              <div key={label} style={s.sRow}>
                <span style={s.sLabel}>{label}</span>
                <span style={s.sVal}>{value}</span>
              </div>
            ))}

            <div style={s.divider} />

            <div style={s.totalRow}>
              <span style={s.totalLabel}>Total</span>
              <span style={s.totalVal}>{formatPrice(order.total)}</span>
            </div>

            <div style={s.divider} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              <Link to="/orders" style={s.ordersBtn}>View All Orders</Link>
              <Link to="/shop"   style={s.shopBtn}>Continue Shopping</Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────
const s = {
  page:      { background: '#fff', minHeight: '80vh', padding: '40px 0 64px' },
  container: { maxWidth: '1000px', margin: '0 auto', padding: '0 20px' },

  back: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: 'none', border: 'none', color: '#2196F3',
    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
    marginBottom: '20px', padding: 0,
  },

  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: '24px', gap: '12px', flexWrap: 'wrap',
  },
  title:   { color: '#000', fontSize: '24px', fontWeight: 800, margin: '0 0 4px' },
  orderId: { color: '#888', fontSize: '13px', margin: 0 },
  statusBadge: {
    fontSize: '13px', fontWeight: 700,
    padding: '6px 16px', borderRadius: '20px',
    whiteSpace: 'nowrap',
  },

  // Progress tracker
  progressCard: {
    background: '#f0f8ff', border: '1.5px solid #e3f2fd',
    borderRadius: '14px', padding: '24px 32px',
    marginBottom: '24px',
  },
  progressSteps: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0,
  },
  stepWrap:   { display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', flex: 1 },
  connector:  { position: 'absolute', top: '15px', right: '50%', width: '100%', height: '3px', zIndex: 0 },
  stepDot: {
    width: '30px', height: '30px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1, transition: 'all .3s',
  },
  checkMark:  { color: '#fff', fontSize: '13px', fontWeight: 900 },
  stepLabel:  { fontSize: '12px', marginTop: '8px', textAlign: 'center' },

  // Grid layout
  grid: { display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px', alignItems: 'start' },

  // Cards
  card: {
    background: '#fff', border: '1.5px solid #e3f2fd',
    borderRadius: '14px', padding: '20px',
    boxShadow: '0 2px 12px rgba(33,150,243,0.06)',
  },
  cardTitle: { color: '#000', fontSize: '15px', fontWeight: 700, margin: '0 0 16px' },

  // Review banner
  reviewBanner: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '10px 14px', marginBottom: '12px',
    background: '#fffde7', border: '1px solid #ffc107',
    borderRadius: '10px', color: '#856404', fontSize: '13px', fontWeight: 500,
  },

  // Item list
  itemList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  itemRow: {
    display: 'flex', alignItems: 'center', gap: '14px',
    padding: '12px', background: '#f9fcff',
    border: '1px solid #e3f2fd', borderRadius: '10px',
  },
  itemImg: {
    width: '62px', height: '62px', objectFit: 'cover',
    borderRadius: '8px', background: '#e3f2fd', flexShrink: 0,
  },
  itemInfo:       { flex: 1, minWidth: 0 },
  itemTitle:      { color: '#000', fontSize: '13px', fontWeight: 600, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  itemMeta:       { color: '#888', fontSize: '12px', margin: '2px 0 0' },
  itemPriceWrap:  { textAlign: 'right', flexShrink: 0 },
  itemUnitPrice:  { color: '#888', fontSize: '11px', margin: '0 0 3px' },
  itemTotal:      { color: '#2196F3', fontSize: '14px', fontWeight: 800, margin: 0 },

  // Info rows
  infoRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: '1px solid #f0f8ff' },
  infoLabel: { color: '#888', fontSize: '13px', minWidth: '58px' },
  infoVal:   { color: '#000', fontSize: '13px', fontWeight: 500, flex: 1 },

  // Summary card
  summary: {
    background: '#fff', border: '1.5px solid #e3f2fd',
    borderRadius: '14px', padding: '20px',
    position: 'sticky', top: '80px',
    boxShadow: '0 4px 20px rgba(33,150,243,0.07)',
  },
  sRow:       { display: 'flex', justifyContent: 'space-between', margin: '8px 0' },
  sLabel:     { color: '#777', fontSize: '14px' },
  sVal:       { color: '#000', fontSize: '14px', fontWeight: 500 },
  divider:    { borderTop: '1px solid #e3f2fd', margin: '14px 0' },
  totalRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: '#000', fontSize: '16px', fontWeight: 700 },
  totalVal:   { color: '#2196F3', fontSize: '22px', fontWeight: 800 },

  ordersBtn: {
    display: 'block', textAlign: 'center',
    padding: '11px 0', background: '#2196F3', color: '#fff',
    borderRadius: '10px', fontWeight: 700, fontSize: '14px',
    boxShadow: '0 4px 14px rgba(33,150,243,0.28)',
  },
  shopBtn: {
    display: 'block', textAlign: 'center',
    padding: '11px 0', background: '#f0f8ff', color: '#2196F3',
    border: '1.5px solid #bbdefb',
    borderRadius: '10px', fontWeight: 700, fontSize: '14px',
  },

  // Not-found state
  centred: {
    minHeight: '70vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '40px',
  },
  notFoundIcon:  { width: '88px', height: '88px', background: '#e3f2fd', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  notFoundTitle: { color: '#000', fontSize: '22px', fontWeight: 700, margin: 0 },
  notFoundSub:   { color: '#777', fontSize: '14px', margin: 0, textAlign: 'center', maxWidth: '340px' },
  backBtn: {
    marginTop: '8px', padding: '12px 32px',
    background: '#2196F3', color: '#fff',
    borderRadius: '10px', fontWeight: 700,
    boxShadow: '0 4px 14px rgba(33,150,243,0.3)',
  },
}

export default OrderDetails
