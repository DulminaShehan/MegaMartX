// ============================================================
// Cart Page — white + blue theme
// ============================================================

import { Link, useNavigate } from 'react-router-dom'
import { FiShoppingBag, FiArrowLeft, FiTrash2, FiArrowRight } from 'react-icons/fi'
import CartItem from '../components/CartItem'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { formatPrice } from '../utils/helpers'
import toast from 'react-hot-toast'

const Cart = () => {
  const { cartItems, cartTotal, clearCart } = useCart()
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  const shipping = cartTotal > 50 ? 0 : 4.99
  const tax = +(cartTotal * 0.08).toFixed(2)
  const grand = +(cartTotal + shipping + tax).toFixed(2)

  const handleCheckout = () => {
    if (!currentUser) {
      toast.error('Please login to continue')
      navigate('/login', { state: { from: { pathname: '/checkout' } } })
      return
    }
    navigate('/checkout')
  }

  if (cartItems.length === 0) return (
    <div style={s.empty}>
      <div style={s.emptyIcon}><FiShoppingBag size={48} color="#2196F3" /></div>
      <h2 style={s.emptyTitle}>Your cart is empty</h2>
      <p style={s.emptySub}>Looks like you haven't added anything yet.</p>
      <Link to="/shop" style={s.shopBtn}>Start Shopping</Link>
    </div>
  )

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.pageHead}>
          <h1 style={s.title}>Shopping Cart</h1>
          <span style={s.badge}>{cartItems.length} item{cartItems.length !== 1 ? 's' : ''}</span>
        </div>

        <div style={s.layout} className="cart-layout">
          {/* Items list */}
          <div>
            <div style={s.listHead}>
              <span style={s.listHeadText}>Products</span>
              <button style={s.clearBtn} onClick={clearCart}><FiTrash2 size={13} /> Clear All</button>
            </div>
            <div style={s.items}>{cartItems.map(item => <CartItem key={item.variantKey || item.id} item={item} />)}</div>
            <Link to="/shop" style={s.continueShopping}><FiArrowLeft size={13} /> Continue Shopping</Link>
          </div>

          {/* Summary */}
          <div style={s.summary}>
            <h3 style={s.summaryTitle}>Order Summary</h3>

            <div style={s.summaryRows}>
              <div style={s.sRow}>
                <span style={s.sLabel}>Subtotal</span>
                <span style={s.sVal}>{formatPrice(cartTotal)}</span>
              </div>
              <div style={s.sRow}>
                <span style={s.sLabel}>Shipping</span>
                <span style={shipping === 0 ? s.freeLabel : s.sVal}>
                  {shipping === 0 ? 'FREE' : formatPrice(shipping)}
                </span>
              </div>
              <div style={s.sRow}>
                <span style={s.sLabel}>Tax (8%)</span>
                <span style={s.sVal}>{formatPrice(tax)}</span>
              </div>
            </div>

            {shipping === 0
              ? <p style={s.freeNote}>🎉 You qualify for free shipping!</p>
              : <p style={s.freeNoteGray}>Add {formatPrice(50 - cartTotal)} more for free shipping</p>
            }

            <div style={s.divider} />

            <div style={s.totalRow}>
              <span style={s.totalLabel}>Total</span>
              <span style={s.totalVal}>{formatPrice(grand)}</span>
            </div>

            <button
              style={s.checkoutBtn}
              onClick={handleCheckout}
            >
              Proceed to Checkout <FiArrowRight size={15} style={{ verticalAlign: 'middle' }} />
            </button>

            <p style={s.secure}>🔒 Secure checkout — SSL encrypted</p>
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  page: { background: '#fff', minHeight: '80vh', padding: '40px 0 64px' },
  container: { maxWidth: '1100px', margin: '0 auto', padding: '0 20px' },
  pageHead: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' },
  title: { color: '#000', fontSize: '26px', fontWeight: 700, margin: 0 },
  badge: {
    background: '#e3f2fd', color: '#2196F3',
    border: '1px solid #90caf9',
    fontSize: '13px', fontWeight: 600,
    padding: '3px 12px', borderRadius: '20px',
  },

  layout: { display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' },

  listHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  listHeadText: { color: '#888', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  clearBtn: {
    display: 'flex', alignItems: 'center', gap: '5px',
    background: 'none', border: 'none', color: '#e53935',
    fontSize: '13px', cursor: 'pointer',
  },
  items: { display: 'flex', flexDirection: 'column', gap: '10px' },
  continueShopping: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    color: '#2196F3', fontSize: '13px', fontWeight: 500, marginTop: '16px',
  },

  summary: {
    background: '#fff', border: '1.5px solid #e3f2fd',
    borderRadius: '16px', padding: '24px',
    position: 'sticky', top: '80px',
    boxShadow: '0 4px 20px rgba(33,150,243,0.07)',
  },
  summaryTitle: { color: '#000', fontSize: '17px', fontWeight: 700, margin: '0 0 20px' },
  summaryRows: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '14px' },
  sRow: { display: 'flex', justifyContent: 'space-between' },
  sLabel: { color: '#777', fontSize: '14px' },
  sVal: { color: '#000', fontSize: '14px', fontWeight: 500 },
  freeLabel: { color: '#2e7d32', fontSize: '14px', fontWeight: 700 },
  freeNote: {
    color: '#2e7d32', fontSize: '12px',
    background: '#e8f5e9', border: '1px solid #a5d6a7',
    padding: '7px 12px', borderRadius: '8px', margin: 0,
  },
  freeNoteGray: {
    color: '#777', fontSize: '12px',
    background: '#f0f8ff', border: '1px solid #bbdefb',
    padding: '7px 12px', borderRadius: '8px', margin: 0,
  },
  divider: { borderTop: '1px solid #e3f2fd', margin: '16px 0' },
  totalRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
  totalLabel: { color: '#000', fontSize: '16px', fontWeight: 700 },
  totalVal: { color: '#2196F3', fontSize: '22px', fontWeight: 800 },

  checkoutBtn: {
    width: '100%', padding: '14px',
    background: '#2196F3', color: '#fff',
    border: 'none', borderRadius: '10px',
    fontSize: '16px', fontWeight: 700, cursor: 'pointer',
    marginBottom: '12px',
    boxShadow: '0 4px 16px rgba(33,150,243,0.3)',
  },
  secure: { color: '#aaa', fontSize: '12px', textAlign: 'center', margin: 0 },

  empty: {
    minHeight: '70vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '40px',
  },
  emptyIcon: {
    width: '90px', height: '90px',
    background: '#e3f2fd', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { color: '#000', fontSize: '22px', fontWeight: 700, margin: 0 },
  emptySub: { color: '#777', fontSize: '14px', margin: 0 },
  shopBtn: {
    marginTop: '8px', padding: '12px 32px',
    background: '#2196F3', color: '#fff',
    borderRadius: '10px', fontWeight: 700,
    boxShadow: '0 4px 14px rgba(33,150,243,0.3)',
  },
}

export default Cart
