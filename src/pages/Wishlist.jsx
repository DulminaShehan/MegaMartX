// ============================================================
// Wishlist Page — /wishlist
// ============================================================

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  FiHeart, FiShoppingCart, FiTrash2, FiArrowLeft,
  FiBell, FiBellOff,
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { getWishlist, removeFromWishlist } from '../firebase/firestore'
import { formatPrice, imgFallback } from '../utils/helpers'
import toast from 'react-hot-toast'

const Wishlist = () => {
  const { currentUser } = useAuth()
  const { addToCart }   = useCart()
  const [items,    setItems]   = useState([])
  const [loading,  setLoading] = useState(true)
  const [removing, setRemoving] = useState(null)

  useEffect(() => {
    if (!currentUser) return
    getWishlist(currentUser.uid)
      .then(setItems)
      .catch(() => toast.error('Failed to load wishlist'))
      .finally(() => setLoading(false))
  }, [currentUser])

  const handleRemove = async (productId) => {
    setRemoving(productId)
    try {
      await removeFromWishlist(currentUser.uid, productId)
      setItems(prev => prev.filter(i => i.productId !== productId))
      toast.success('Removed from wishlist')
    } catch {
      toast.error('Failed to remove')
    } finally {
      setRemoving(null)
    }
  }

  const handleAddToCart = (item) => {
    addToCart({
      id:         item.productId,
      title:      item.title,
      price:      item.price,
      imageUrl:   item.imageUrl,
      sellerUid:  item.sellerUid,
      sellerName: item.sellerName,
    })
    toast.success('Added to cart!')
  }

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.header}>
          <Link to="/shop" style={s.backLink}>
            <FiArrowLeft size={14} /> Back to Shop
          </Link>
          <h1 style={s.title}>
            <FiHeart size={22} color="#e53935" fill="#e53935" style={{ verticalAlign: 'middle', marginRight: '10px' }} />
            My Wishlist
          </h1>
          <p style={s.sub}>{items.length} saved item{items.length !== 1 ? 's' : ''}</p>
        </div>

        {loading ? (
          <div style={s.grid}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ ...s.card, height: '320px', background: '#f0f8ff', animation: 'shimmer 1.4s infinite' }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div style={s.empty}>
            <FiHeart size={52} color="#e3f2fd" />
            <h2 style={s.emptyTitle}>Your wishlist is empty</h2>
            <p style={s.emptySub}>Save products you love — we'll alert you when prices drop.</p>
            <Link to="/shop" style={s.shopBtn}>Browse Products</Link>
          </div>
        ) : (
          <div style={s.grid}>
            {items.map(item => (
              <div key={item.id} style={s.card}>
                <div style={item.notifyOnDrop ? s.alertBadgeOn : s.alertBadgeOff}>
                  {item.notifyOnDrop
                    ? <><FiBell size={11} /> Price Alerts On</>
                    : <><FiBellOff size={11} /> Alerts Off</>}
                </div>

                <Link to={`/product/${item.productId}`}>
                  <img
                    src={item.imageUrl || imgFallback()}
                    alt={item.title}
                    style={s.img}
                    onError={e => { e.target.src = imgFallback() }}
                  />
                </Link>

                <div style={s.info}>
                  <p style={s.cat}>{item.category}</p>
                  <Link to={`/product/${item.productId}`} style={s.name}>{item.title}</Link>
                  <div style={s.priceRow}>
                    <span style={s.price}>{formatPrice(item.price)}</span>
                    {item.originalPrice > item.price && (
                      <span style={s.origPrice}>{formatPrice(item.originalPrice)}</span>
                    )}
                    {item.discount > 0 && (
                      <span style={s.discBadge}>-{item.discount}%</span>
                    )}
                  </div>
                  {item.stock === 0 && <p style={s.oos}>Out of Stock</p>}
                </div>

                <div style={s.actions}>
                  <button
                    style={{ ...s.cartBtn, opacity: item.stock === 0 ? 0.5 : 1 }}
                    onClick={() => item.stock > 0 && handleAddToCart(item)}
                    disabled={item.stock === 0}
                  >
                    <FiShoppingCart size={14} /> Add to Cart
                  </button>
                  <button
                    style={s.removeBtn}
                    onClick={() => handleRemove(item.productId)}
                    disabled={removing === item.productId}
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Wishlist

const s = {
  page:      { background: '#fff', minHeight: '80vh', padding: '40px 0 72px' },
  container: { maxWidth: '1100px', margin: '0 auto', padding: '0 20px' },

  header:   { marginBottom: '32px' },
  backLink: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    color: '#2196F3', fontSize: '13px', fontWeight: 600, marginBottom: '10px',
  },
  title: { color: '#000', fontSize: '26px', fontWeight: 800, margin: '0 0 4px' },
  sub:   { color: '#888', fontSize: '14px', margin: 0 },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
    gap: '20px',
  },

  card: {
    border: '1.5px solid #e3f2fd', borderRadius: '16px',
    overflow: 'hidden', background: '#fff',
    boxShadow: '0 2px 12px rgba(33,150,243,0.06)',
    display: 'flex', flexDirection: 'column',
    position: 'relative',
  },

  alertBadgeOn: {
    position: 'absolute', top: '10px', left: '10px', zIndex: 1,
    background: '#e8f5e9', color: '#2e7d32',
    fontSize: '11px', fontWeight: 600,
    padding: '3px 8px', borderRadius: '20px',
    display: 'flex', alignItems: 'center', gap: '4px',
  },
  alertBadgeOff: {
    position: 'absolute', top: '10px', left: '10px', zIndex: 1,
    background: '#f5f5f5', color: '#999',
    fontSize: '11px', fontWeight: 600,
    padding: '3px 8px', borderRadius: '20px',
    display: 'flex', alignItems: 'center', gap: '4px',
  },

  img: {
    width: '100%', height: '180px', objectFit: 'cover',
    background: '#e3f2fd', display: 'block',
  },

  info:      { padding: '14px 14px 8px', flex: 1 },
  cat:       { color: '#2196F3', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 5px' },
  name: {
    color: '#000', fontSize: '14px', fontWeight: 700,
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
    overflow: 'hidden', textDecoration: 'none', lineHeight: 1.4, margin: '0 0 10px',
  },
  priceRow:  { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' },
  price:     { color: '#2196F3', fontSize: '16px', fontWeight: 800 },
  origPrice: { color: '#aaa', fontSize: '13px', textDecoration: 'line-through' },
  discBadge: {
    background: '#e8f5e9', color: '#2e7d32',
    fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px',
  },
  oos: { color: '#e53935', fontSize: '11px', fontWeight: 600, margin: '4px 0 0' },

  actions: { display: 'flex', gap: '8px', padding: '0 14px 14px' },
  cartBtn: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    padding: '9px', background: '#2196F3', color: '#fff',
    border: 'none', borderRadius: '10px', fontWeight: 700,
    fontSize: '13px', cursor: 'pointer',
  },
  removeBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '38px', height: '38px',
    background: '#fff5f5', color: '#e53935',
    border: '1.5px solid #ffcdd2', borderRadius: '10px', cursor: 'pointer', flexShrink: 0,
  },

  empty: {
    textAlign: 'center', padding: '80px 20px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
  },
  emptyTitle: { color: '#000', fontSize: '20px', fontWeight: 700, margin: 0 },
  emptySub:   { color: '#888', fontSize: '14px', margin: 0, maxWidth: '340px' },
  shopBtn: {
    marginTop: '6px', padding: '12px 28px',
    background: '#2196F3', color: '#fff',
    borderRadius: '10px', fontWeight: 700,
    textDecoration: 'none', fontSize: '14px',
  },
}
