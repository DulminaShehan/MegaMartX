// ============================================================
// Checkout — delivery form + COD / Stripe card payment
//
// Flow:
//   COD  → validate form → POST /api/orders → confirmation
//   CARD → validate form → create PaymentIntent → confirm card
//          → POST /api/orders (with paymentIntentId) → confirmation
// ============================================================

import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import {
  FiArrowLeft, FiMapPin, FiPhone, FiUser,
  FiCreditCard, FiTruck, FiLock, FiShoppingBag,
  FiCheckCircle, FiAlertCircle, FiStar,
} from 'react-icons/fi'
import { useCart }  from '../context/CartContext'
import { useAuth }  from '../context/AuthContext'
import { placeOrder, getRewardBalance } from '../firebase/firestore'
import { formatPrice } from '../utils/helpers'
import toast from 'react-hot-toast'

// ── Stripe setup ──────────────────────────────────────────────
const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
const stripePromise = STRIPE_PK && !STRIPE_PK.includes('REPLACE')
  ? loadStripe(STRIPE_PK)
  : Promise.resolve(null)          // null → stripe = null inside hooks

// ── Date helpers ──────────────────────────────────────────────
const getDeliveryDate = () => {
  const d = new Date()
  d.setDate(d.getDate() + 3)
  return d
}
const prettyDate = (d) =>
  d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
const isoDate = (d) => d.toISOString().split('T')[0]  // "YYYY-MM-DD"

// Phone validation: 7–20 chars, digits/spaces/+/-/()
const validPhone = (p) => /^[\d\s\+\-\(\)]{7,20}$/.test(p.trim())

// ── Card element appearance ───────────────────────────────────
const CARD_STYLE = {
  style: {
    base: {
      fontSize: '14px',
      color: '#000',
      fontFamily: 'system-ui, sans-serif',
      '::placeholder': { color: '#90caf9' },
    },
    invalid: { color: '#e53935' },
  },
}

// ╔══════════════════════════════════════════════════════════╗
// ║  CheckoutForm — lives inside <Elements> so hooks work    ║
// ╚══════════════════════════════════════════════════════════╝
const CheckoutForm = () => {
  const stripe   = useStripe()
  const elements = useElements()
  const stripeReady = !!stripe

  const { cartItems, cartTotal, clearCart } = useCart()
  const { currentUser, userProfile }        = useAuth()
  const navigate = useNavigate()

  // ── Pricing ─────────────────────────────────────────────
  const shipping       = cartTotal > 50 ? 0 : 4.99
  const tax            = +(cartTotal * 0.08).toFixed(2)
  const deliveryDate   = getDeliveryDate()

  // ── Reward points state ──────────────────────────────────
  const [rewardBalance,   setRewardBalance]   = useState(0)
  const [redeemInput,     setRedeemInput]     = useState('')
  const [appliedPoints,   setAppliedPoints]   = useState(0)

  const pointsDiscount = +(appliedPoints / 100).toFixed(2)
  const grand          = +(cartTotal + shipping + tax - pointsDiscount).toFixed(2)

  // Max points the user can redeem: 50% of pre-discount total, capped at balance
  const maxRedeemable  = Math.min(rewardBalance, Math.floor((cartTotal + shipping + tax) * 50))

  // ── Form state ───────────────────────────────────────────
  const [form, setForm] = useState({
    fullName:      '',
    address:       '',
    phone:         '',
    paymentMethod: 'COD',
  })
  const [errors,    setErrors]    = useState({})
  const [cardError, setCardError] = useState(null)
  const [placing,   setPlacing]   = useState(false)

  // Pre-fill name/phone from profile once it loads
  useEffect(() => {
    if (!userProfile) return
    setForm(prev => ({
      ...prev,
      fullName: prev.fullName || userProfile.name  || '',
      phone:    prev.phone    || userProfile.phone || '',
    }))
  }, [userProfile])

  // Load reward balance
  useEffect(() => {
    if (!currentUser) return
    getRewardBalance(currentUser.uid)
      .then(d => setRewardBalance(d.points || 0))
      .catch(() => {})
  }, [currentUser])

  // Redirect to cart if cart is empty
  useEffect(() => {
    if (cartItems.length === 0) navigate('/cart')
  }, [cartItems, navigate])

  // ── Validation ───────────────────────────────────────────
  const validate = () => {
    const e = {}
    if (!form.fullName.trim() || form.fullName.trim().length < 2)
      e.fullName = 'Full name is required'
    if (!form.address.trim() || form.address.trim().length < 10)
      e.address  = 'Enter a complete address (at least 10 characters)'
    if (!form.phone.trim() || !validPhone(form.phone))
      e.phone    = 'Enter a valid phone number (e.g. +1 555 000 0000)'
    return e
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }))
  }

  // ── Points helpers ───────────────────────────────────────
  const handleApplyPoints = () => {
    const pts = parseInt(redeemInput) || 0
    if (pts < 100)   { toast.error('Minimum redemption is 100 points'); return }
    if (pts > maxRedeemable) {
      toast.error(`You can redeem at most ${maxRedeemable} points on this order`)
      return
    }
    setAppliedPoints(pts)
    toast.success(`${pts} points applied — saving ${formatPrice(pts / 100)}!`)
  }

  const handleRemovePoints = () => {
    setAppliedPoints(0)
    setRedeemInput('')
  }

  // ── Core: build and send the order ───────────────────────
  const submitOrder = async (paymentIntentId = '') => {
    const order = await placeOrder({
      userId:          currentUser.uid,
      userName:        form.fullName,
      userEmail:       currentUser.email,
      address:         form.address,
      phone:           form.phone,
      paymentMethod:   form.paymentMethod,
      deliveryDate:    isoDate(deliveryDate),
      paymentIntentId,
      pointsRedeemed:  appliedPoints,
      items: cartItems.map(i => ({
        id:         i.id,
        title:      i.title,
        price:      i.price,
        quantity:   i.quantity,
        imageUrl:   i.imageUrl   || '',
        sellerUid:  i.sellerUid  || '',
        sellerName: i.sellerName || '',
        color:      i.color      || '',
        size:       i.size       || '',
      })),
      sellerUids: [...new Set(cartItems.map(i => i.sellerUid).filter(Boolean))],
      subtotal: cartTotal,
      shipping,
      tax,
      total: grand,
    })
    await clearCart()
    toast.success('Order placed successfully!')
    navigate(`/order-confirmation/${order.id}`, {
      state: {
        orderId:       order.id,
        paymentMethod: form.paymentMethod,
        address:       form.address,
        phone:         form.phone,
        total:         grand,
        deliveryDate:  deliveryDate.toISOString(),
        userName:      form.fullName,
        userEmail:     currentUser.email,
      },
    })
  }

  // ── Submit handler ───────────────────────────────────────
  const handleSubmit = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setCardError(null)
    setPlacing(true)

    try {
      // ── Cash on Delivery ─────────────────────────────────
      if (form.paymentMethod === 'COD') {
        await submitOrder()
        return
      }

      // ── Card Payment (Stripe) ────────────────────────────
      if (!stripeReady) {
        toast.error('Stripe is not loaded yet. Please wait a moment.')
        return
      }
      if (!STRIPE_PK || STRIPE_PK.includes('REPLACE')) {
        toast.error('Stripe is not configured. Please add your Stripe keys to .env')
        return
      }

      // 1️⃣  Create a PaymentIntent on the backend
      const intentRes = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/stripe/create-payment-intent`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ amount: grand }),
        }
      )
      if (!intentRes.ok) {
        const data = await intentRes.json().catch(() => ({}))
        throw new Error(data.error || 'Could not start payment. Please try again.')
      }
      const { clientSecret } = await intentRes.json()

      // 2️⃣  Confirm card payment in the browser
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name:  form.fullName,
            email: currentUser.email,
            phone: form.phone,
          },
        },
      })

      if (error) {
        setCardError(error.message)
        toast.error(error.message)
        return
      }

      // 3️⃣  Payment succeeded → save the order
      await submitOrder(paymentIntent.id)

    } catch (err) {
      toast.error(err.message || 'Something went wrong. Please try again.')
    } finally {
      setPlacing(false)
    }
  }

  const stripeConfigured = STRIPE_PK && !STRIPE_PK.includes('REPLACE')
  const canPay = !placing && (form.paymentMethod === 'COD' || stripeConfigured)

  // ── Render ───────────────────────────────────────────────
  return (
    <div style={s.page}>
      <div style={s.container}>

        {/* Header */}
        <div style={s.pageHead}>
          <Link to="/cart" style={s.backLink}>
            <FiArrowLeft size={14} /> Back to Cart
          </Link>
          <h1 style={s.title}>Checkout</h1>
          <p style={s.sub}>{cartItems.length} item{cartItems.length !== 1 ? 's' : ''}</p>
        </div>

        <div style={s.layout}>

          {/* ════════════ LEFT — FORM ════════════ */}
          <div style={s.formCol}>

            {/* Delivery Details */}
            <div style={s.card}>
              <h2 style={s.cardTitle}>
                <FiMapPin size={16} style={s.cardIcon} /> Delivery Details
              </h2>

              {/* Full Name */}
              <Field label="Full Name" icon={<FiUser size={13} />} error={errors.fullName}>
                <input
                  style={{ ...s.input, ...(errors.fullName ? s.inputErr : {}) }}
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="John Doe"
                  autoComplete="name"
                />
              </Field>

              {/* Address */}
              <Field label="Delivery Address" icon={<FiMapPin size={13} />} error={errors.address}>
                <textarea
                  style={{ ...s.textarea, ...(errors.address ? s.inputErr : {}) }}
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="123 Main Street, City, State, ZIP Code"
                  rows={3}
                />
              </Field>

              {/* Phone */}
              <Field label="Phone Number" icon={<FiPhone size={13} />} error={errors.phone}>
                <input
                  style={{ ...s.input, ...(errors.phone ? s.inputErr : {}) }}
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+1 555 000 0000"
                  autoComplete="tel"
                />
              </Field>
            </div>

            {/* Payment Method */}
            <div style={s.card}>
              <h2 style={s.cardTitle}>
                <FiCreditCard size={16} style={s.cardIcon} /> Payment Method
              </h2>

              {/* Cash on Delivery */}
              <PaymentOption
                value="COD"
                selected={form.paymentMethod === 'COD'}
                onSelect={() => setForm(p => ({ ...p, paymentMethod: 'COD' }))}
                title="Cash on Delivery"
                sub="Pay when your order arrives"
                badge="Free"
                badgeColor="#2e7d32"
                badgeBg="#e8f5e9"
                icon="📦"
              />

              {/* Card Payment */}
              <PaymentOption
                value="CARD"
                selected={form.paymentMethod === 'CARD'}
                onSelect={() => setForm(p => ({ ...p, paymentMethod: 'CARD' }))}
                title="Card Payment"
                sub="Visa, Mastercard, Amex — secured by Stripe"
                badge="Instant"
                badgeColor="#1565c0"
                badgeBg="#e3f2fd"
                icon="💳"
              />

              {/* Stripe CardElement — shown when card selected */}
              {form.paymentMethod === 'CARD' && (
                <div style={s.stripeWrap}>
                  {stripeConfigured ? (
                    <>
                      <p style={s.stripeLabel}>
                        <FiLock size={12} /> Enter card details
                      </p>
                      <div style={s.cardElementBox}>
                        <CardElement
                          options={CARD_STYLE}
                          onChange={e => setCardError(e.error?.message || null)}
                        />
                      </div>
                      {cardError && (
                        <p style={s.fieldError}>
                          <FiAlertCircle size={12} /> {cardError}
                        </p>
                      )}
                      <div style={s.stripeTestNote}>
                        <FiLock size={11} />
                        <span>Test card: <strong>4242 4242 4242 4242</strong> · any future exp · any CVC</span>
                      </div>
                    </>
                  ) : (
                    <div style={s.stripeWarning}>
                      <FiAlertCircle size={15} color="#f59e0b" />
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, color: '#000', fontSize: '13px' }}>
                          Stripe not configured
                        </p>
                        <p style={{ margin: '3px 0 0', color: '#666', fontSize: '12px' }}>
                          Add your <code style={s.code}>VITE_STRIPE_PUBLISHABLE_KEY</code> and{' '}
                          <code style={s.code}>STRIPE_SECRET_KEY</code> to <code style={s.code}>.env</code> to
                          enable card payments.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Reward Points */}
            {rewardBalance > 0 && (
              <div style={s.card}>
                <h2 style={s.cardTitle}>
                  <FiStar size={16} style={{ color: '#f59e0b' }} /> Reward Points
                </h2>
                <div style={s.rewardBal}>
                  <span style={s.rewardPts}>⭐ {rewardBalance.toLocaleString()} pts</span>
                  <span style={s.rewardVal}>≈ {formatPrice(rewardBalance / 100)} value</span>
                </div>

                {appliedPoints > 0 ? (
                  <div style={s.appliedRow}>
                    <span style={s.appliedText}>
                      ✅ {appliedPoints} pts applied — <strong>{formatPrice(pointsDiscount)} off</strong>
                    </span>
                    <button style={s.removePointsBtn} onClick={handleRemovePoints}>Remove</button>
                  </div>
                ) : (
                  <div style={s.redeemRow}>
                    <input
                      style={s.redeemInput}
                      type="number"
                      placeholder={`100 – ${maxRedeemable} pts`}
                      value={redeemInput}
                      min={100}
                      max={maxRedeemable}
                      step={100}
                      onChange={e => setRedeemInput(e.target.value)}
                    />
                    <button style={s.applyBtn} onClick={handleApplyPoints}>Apply</button>
                    <button style={s.useMaxBtn} onClick={() => setRedeemInput(String(maxRedeemable))}>
                      Use Max
                    </button>
                  </div>
                )}
                <p style={s.redeemHint}>100 pts = $1 off · Max 50% of order value</p>
              </div>
            )}

            {/* Place Order CTA */}
            <button
              style={{
                ...s.placeBtn,
                opacity: canPay ? 1 : 0.6,
                cursor:  canPay ? 'pointer' : 'not-allowed',
              }}
              onClick={handleSubmit}
              disabled={!canPay}
            >
              {placing
                ? <><SpinnerInline /> Processing…</>
                : form.paymentMethod === 'CARD'
                  ? `💳  Pay ${formatPrice(grand)}`
                  : `📦  Place Order — ${formatPrice(grand)}`
              }
            </button>

            <p style={s.secureNote}>
              <FiLock size={12} /> 256-bit SSL encryption · Your data is safe
            </p>
          </div>

          {/* ════════════ RIGHT — ORDER SUMMARY ════════════ */}
          <div style={s.summary}>
            <h3 style={s.summaryTitle}>
              <FiShoppingBag size={15} style={{ color: '#2196F3', verticalAlign: 'middle', marginRight: '6px' }} />
              Order Summary
            </h3>

            {/* Items */}
            <div style={s.itemList}>
              {cartItems.map(item => (
                <div key={item.id} style={s.itemRow}>
                  <div style={s.qtyBadge}>{item.quantity}</div>
                  <img
                    src={item.imageUrl || 'https://placehold.co/48x48/e3f2fd/2196F3?text=P'}
                    alt={item.title}
                    style={s.itemImg}
                    onError={e => { e.target.src = 'https://placehold.co/48x48/e3f2fd/2196F3?text=P' }}
                  />
                  <p style={s.itemName}>{item.title}</p>
                  <span style={s.itemPrice}>{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div style={s.divider} />

            {/* Price breakdown */}
            {[
              ['Subtotal', formatPrice(cartTotal)],
              ['Shipping', shipping === 0 ? 'FREE' : formatPrice(shipping)],
              ['Tax (8%)',  formatPrice(tax)],
            ].map(([l, v]) => (
              <div key={l} style={s.priceRow}>
                <span style={s.priceLabel}>{l}</span>
                <span style={{ ...s.priceVal, color: v === 'FREE' ? '#2e7d32' : '#000' }}>{v}</span>
              </div>
            ))}
            {appliedPoints > 0 && (
              <div style={s.priceRow}>
                <span style={{ ...s.priceLabel, color: '#2e7d32' }}>⭐ Points Discount</span>
                <span style={{ ...s.priceVal, color: '#2e7d32', fontWeight: 700 }}>
                  -{formatPrice(pointsDiscount)}
                </span>
              </div>
            )}

            <div style={s.divider} />

            <div style={s.totalRow}>
              <span style={s.totalLabel}>Total</span>
              <span style={s.totalAmt}>{formatPrice(grand)}</span>
            </div>

            <div style={s.divider} />

            {/* Estimated delivery */}
            <div style={s.deliveryBox}>
              <FiTruck size={20} color="#2196F3" style={{ flexShrink: 0 }} />
              <div>
                <p style={s.deliveryLabel}>Estimated Delivery</p>
                <p style={s.deliveryDate}>{prettyDate(deliveryDate)}</p>
                {shipping === 0
                  ? <p style={s.freeShip}>🎉 Free shipping applied</p>
                  : <p style={s.freeShipHint}>Add {formatPrice(50 - cartTotal)} more for free shipping</p>
                }
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Small reusable sub-components ────────────────────────────

const Field = ({ label, icon, error, children }) => (
  <div style={s.field}>
    <label style={s.label}>{icon} {label}</label>
    {children}
    {error && (
      <p style={s.fieldError}>
        <FiAlertCircle size={12} /> {error}
      </p>
    )}
  </div>
)

const PaymentOption = ({
  value, selected, onSelect,
  title, sub, badge, badgeColor, badgeBg, icon,
}) => (
  <button
    type="button"
    style={{
      ...s.payOption,
      ...(selected ? s.payOptionActive : {}),
    }}
    onClick={onSelect}
  >
    <div style={{
      ...s.payRadio,
      ...(selected ? s.payRadioActive : {}),
    }}>
      {selected && <div style={s.payRadioDot} />}
    </div>
    <span style={s.payIcon}>{icon}</span>
    <div style={s.payText}>
      <p style={s.payTitle}>{title}</p>
      <p style={s.paySub}>{sub}</p>
    </div>
    <span style={{ ...s.payBadge, color: badgeColor, background: badgeBg }}>
      {badge}
    </span>
  </button>
)

const SpinnerInline = () => (
  <span style={{
    display: 'inline-block', width: '14px', height: '14px',
    border: '2px solid rgba(255,255,255,0.4)',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    verticalAlign: 'middle',
    marginRight: '8px',
  }} />
)

// ── Root export (wraps form in Stripe Elements) ───────────────
const Checkout = () => (
  <Elements stripe={stripePromise}>
    <CheckoutForm />
  </Elements>
)

export default Checkout

// ── Styles ────────────────────────────────────────────────────
const s = {
  page:      { background: '#fff', minHeight: '80vh', padding: '40px 0 72px' },
  container: { maxWidth: '1060px', margin: '0 auto', padding: '0 20px' },

  pageHead:  { marginBottom: '28px' },
  backLink: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    color: '#2196F3', fontSize: '13px', fontWeight: 600, marginBottom: '10px',
  },
  title: { color: '#000', fontSize: '26px', fontWeight: 800, margin: '0 0 3px' },
  sub:   { color: '#888', fontSize: '14px', margin: 0 },

  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: '24px',
    alignItems: 'start',
  },

  formCol: { display: 'flex', flexDirection: 'column', gap: '20px' },

  // Cards
  card: {
    background: '#fff',
    border: '1.5px solid #e3f2fd',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 12px rgba(33,150,243,0.06)',
  },
  cardTitle: {
    display: 'flex', alignItems: 'center', gap: '8px',
    color: '#000', fontSize: '16px', fontWeight: 700, margin: '0 0 20px',
  },
  cardIcon: { color: '#2196F3' },

  // Form fields
  field: { marginBottom: '16px' },
  label: {
    display: 'flex', alignItems: 'center', gap: '6px',
    color: '#555', fontSize: '13px', fontWeight: 600,
    marginBottom: '7px',
  },
  input: {
    width: '100%', padding: '10px 13px',
    border: '1.5px solid #e3f2fd', borderRadius: '10px',
    background: '#f9fcff', color: '#000', fontSize: '14px',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color .2s',
  },
  textarea: {
    width: '100%', padding: '10px 13px',
    border: '1.5px solid #e3f2fd', borderRadius: '10px',
    background: '#f9fcff', color: '#000', fontSize: '14px',
    outline: 'none', resize: 'vertical', boxSizing: 'border-box',
    fontFamily: 'inherit', transition: 'border-color .2s',
  },
  inputErr:   { borderColor: '#e53935', background: '#fff5f5' },
  fieldError: {
    display: 'flex', alignItems: 'center', gap: '5px',
    color: '#e53935', fontSize: '12px', margin: '5px 0 0',
  },

  // Payment options
  payOption: {
    display: 'flex', alignItems: 'center', gap: '12px',
    width: '100%', padding: '14px 16px',
    background: '#f9fcff', border: '1.5px solid #e3f2fd',
    borderRadius: '12px', cursor: 'pointer',
    marginBottom: '10px', textAlign: 'left',
    transition: 'border-color .2s, background .2s',
  },
  payOptionActive: { border: '1.5px solid #2196F3', background: '#f0f8ff' },
  payRadio: {
    width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
    border: '2px solid #bbdefb', background: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  payRadioActive: { border: '2px solid #2196F3' },
  payRadioDot: {
    width: '8px', height: '8px', borderRadius: '50%', background: '#2196F3',
  },
  payIcon:  { fontSize: '20px', flexShrink: 0 },
  payText:  { flex: 1, minWidth: 0 },
  payTitle: { color: '#000', fontSize: '14px', fontWeight: 700, margin: 0 },
  paySub:   { color: '#888', fontSize: '12px', margin: '2px 0 0' },
  payBadge: {
    fontSize: '11px', fontWeight: 700, padding: '3px 9px',
    borderRadius: '20px', flexShrink: 0,
  },

  // Stripe card element
  stripeWrap: {
    marginTop: '4px',
    background: '#f0f8ff', border: '1.5px solid #bbdefb',
    borderRadius: '12px', padding: '16px',
  },
  stripeLabel: {
    display: 'flex', alignItems: 'center', gap: '5px',
    color: '#555', fontSize: '12px', fontWeight: 600, margin: '0 0 10px',
  },
  cardElementBox: {
    background: '#fff', border: '1.5px solid #e3f2fd',
    borderRadius: '8px', padding: '12px',
  },
  stripeTestNote: {
    display: 'flex', alignItems: 'center', gap: '5px',
    marginTop: '10px', color: '#888', fontSize: '11px',
  },
  stripeWarning: {
    display: 'flex', alignItems: 'flex-start', gap: '10px',
    background: '#fffbeb', border: '1px solid #fcd34d',
    borderRadius: '10px', padding: '12px',
  },
  code: {
    background: '#f0f0f0', borderRadius: '4px',
    padding: '1px 5px', fontSize: '11px', fontFamily: 'monospace',
  },

  // CTA button
  placeBtn: {
    width: '100%', padding: '16px',
    background: 'linear-gradient(135deg, #2196F3 0%, #1565C0 100%)',
    color: '#fff', border: 'none', borderRadius: '12px',
    fontSize: '16px', fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    boxShadow: '0 6px 20px rgba(33,150,243,0.35)',
    transition: 'opacity .2s',
  },
  secureNote: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '6px', color: '#aaa', fontSize: '12px', margin: '6px 0 0',
  },

  // Summary panel
  summary: {
    background: '#fff', border: '1.5px solid #e3f2fd',
    borderRadius: '16px', padding: '24px',
    position: 'sticky', top: '80px',
    boxShadow: '0 4px 20px rgba(33,150,243,0.07)',
  },
  summaryTitle: { color: '#000', fontSize: '16px', fontWeight: 700, margin: '0 0 16px' },

  itemList:  { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '4px' },
  itemRow:   { display: 'flex', alignItems: 'center', gap: '10px' },
  qtyBadge: {
    minWidth: '20px', height: '20px', background: '#2196F3', color: '#fff',
    borderRadius: '50%', fontSize: '11px', fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  itemImg: {
    width: '40px', height: '40px', objectFit: 'cover',
    borderRadius: '8px', background: '#e3f2fd', flexShrink: 0,
  },
  itemName:  { flex: 1, fontSize: '13px', color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  itemPrice: { color: '#2196F3', fontSize: '13px', fontWeight: 700, flexShrink: 0 },

  divider: { borderTop: '1px solid #e3f2fd', margin: '14px 0' },

  priceRow:   { display: 'flex', justifyContent: 'space-between', margin: '7px 0' },
  priceLabel: { color: '#777', fontSize: '14px' },
  priceVal:   { fontSize: '14px', fontWeight: 500 },

  totalRow:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel:{ color: '#000', fontSize: '16px', fontWeight: 700 },
  totalAmt:  { color: '#2196F3', fontSize: '22px', fontWeight: 800 },

  deliveryBox: {
    display: 'flex', alignItems: 'flex-start', gap: '12px',
    background: '#f0f8ff', border: '1px solid #bbdefb',
    borderRadius: '12px', padding: '14px',
  },
  deliveryLabel: { color: '#555', fontSize: '12px', margin: 0, fontWeight: 600 },
  deliveryDate:  { color: '#000', fontSize: '13px', fontWeight: 700, margin: '3px 0 0' },
  freeShip:      { color: '#2e7d32', fontSize: '11px', margin: '5px 0 0', fontWeight: 600 },
  freeShipHint:  { color: '#888', fontSize: '11px', margin: '5px 0 0' },

  // Reward points card
  rewardBal: {
    display: 'flex', alignItems: 'center', gap: '12px',
    background: '#fffde7', border: '1px solid #fff176',
    borderRadius: '10px', padding: '10px 14px', marginBottom: '14px',
  },
  rewardPts: { color: '#f57f17', fontSize: '15px', fontWeight: 800 },
  rewardVal: { color: '#888', fontSize: '13px' },

  redeemRow: { display: 'flex', gap: '8px', marginBottom: '8px' },
  redeemInput: {
    flex: 1, padding: '9px 12px',
    border: '1.5px solid #e3f2fd', borderRadius: '10px',
    background: '#f9fcff', color: '#000', fontSize: '14px',
    outline: 'none', boxSizing: 'border-box',
  },
  applyBtn: {
    padding: '9px 16px', background: '#2196F3', color: '#fff',
    border: 'none', borderRadius: '10px', fontWeight: 700,
    fontSize: '13px', cursor: 'pointer', flexShrink: 0,
  },
  useMaxBtn: {
    padding: '9px 12px', background: '#e3f2fd', color: '#2196F3',
    border: 'none', borderRadius: '10px', fontWeight: 700,
    fontSize: '13px', cursor: 'pointer', flexShrink: 0,
  },

  appliedRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: '#e8f5e9', border: '1px solid #a5d6a7',
    borderRadius: '10px', padding: '10px 14px', marginBottom: '8px',
  },
  appliedText:    { color: '#2e7d32', fontSize: '13px' },
  removePointsBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#e53935', fontSize: '12px', fontWeight: 600,
  },

  redeemHint: { color: '#aaa', fontSize: '11px', margin: 0 },
}
