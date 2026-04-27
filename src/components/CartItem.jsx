// ============================================================
// CartItem — white card row with blue qty controls
// ============================================================

import { FiTrash2, FiMinus, FiPlus } from 'react-icons/fi'
import { useCart } from '../context/CartContext'
import { formatPrice, imgFallback } from '../utils/helpers'

const CartItem = ({ item }) => {
  const { updateQuantity, removeFromCart } = useCart()

  return (
    <div style={s.row}>
      <img
        src={item.imageUrl || imgFallback(100, 100)}
        alt={item.title}
        style={s.img}
        onError={(e) => { e.target.src = imgFallback(100, 100) }}
      />

      <div style={s.info}>
        <p style={s.title}>{item.title}</p>
        <p style={s.seller}>Sold by {item.sellerName || 'MegaMartX'}</p>
        {(item.color || item.size) && (
          <div style={s.variantRow}>
            {item.color && <span style={s.variantBadge}>{item.color}</span>}
            {item.size  && <span style={s.variantBadge}>{item.size}</span>}
          </div>
        )}
        <p style={s.price}>{formatPrice(item.price)}</p>
      </div>

      {/* Qty */}
      <div style={s.qtyWrap}>
        <button style={s.qtyBtn} onClick={() => updateQuantity(item.variantKey, item.quantity - 1)}>
          <FiMinus size={12} />
        </button>
        <span style={s.qty}>{item.quantity}</span>
        <button style={s.qtyBtn} onClick={() => updateQuantity(item.variantKey, item.quantity + 1)}>
          <FiPlus size={12} />
        </button>
      </div>

      <span style={s.subtotal}>{formatPrice(item.price * item.quantity)}</span>

      <button style={s.removeBtn} onClick={() => removeFromCart(item.variantKey)} title="Remove">
        <FiTrash2 size={16} />
      </button>
    </div>
  )
}

const s = {
  row: {
    display: 'flex', alignItems: 'center', gap: '16px',
    padding: '16px',
    background: '#ffffff',
    border: '1px solid #e3f2fd',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(33,150,243,0.05)',
  },
  img: {
    width: '78px', height: '78px',
    objectFit: 'cover', borderRadius: '10px',
    background: '#f0f8ff', flexShrink: 0,
    border: '1px solid #e3f2fd',
  },
  info: { flex: 1, minWidth: 0 },
  title: {
    color: '#000', fontSize: '14px', fontWeight: 600,
    margin: '0 0 4px',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  seller: { color: '#888', fontSize: '12px', margin: '0 0 4px' },
  variantRow: { display: 'flex', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' },
  variantBadge: {
    background: '#e3f2fd', color: '#1565C0',
    border: '1px solid #90caf9',
    fontSize: '11px', fontWeight: 600,
    padding: '2px 8px', borderRadius: '10px',
  },
  price: { color: '#2196F3', fontSize: '14px', fontWeight: 700, margin: 0 },

  qtyWrap: {
    display: 'flex', alignItems: 'center', gap: '12px',
    border: '1.5px solid #bbdefb', borderRadius: '10px',
    padding: '6px 10px', background: '#f0f8ff',
  },
  qtyBtn: {
    background: 'none', border: 'none',
    color: '#2196F3', cursor: 'pointer',
    display: 'flex', padding: 0,
  },
  qty: { color: '#000', fontSize: '14px', fontWeight: 700, minWidth: '20px', textAlign: 'center' },

  subtotal: { color: '#000', fontSize: '15px', fontWeight: 800, minWidth: '72px', textAlign: 'right', flexShrink: 0 },
  removeBtn: {
    background: '#fff0f0', border: '1px solid #fecaca',
    borderRadius: '8px', color: '#e53935',
    cursor: 'pointer', padding: '7px',
    display: 'flex', flexShrink: 0,
  },
}

export default CartItem
