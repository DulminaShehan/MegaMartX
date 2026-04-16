// ============================================================
// ProductDetails Page — white + blue theme
// ============================================================

import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { FiShoppingCart, FiArrowLeft, FiStar, FiTruck, FiRefreshCw, FiShield, FiMinus, FiPlus } from 'react-icons/fi'
import { getProductById } from '../firebase/firestore'
import { useCart } from '../context/CartContext'
import { formatPrice, imgFallback, formatDate } from '../utils/helpers'
import { FullPageLoader } from '../components/Loader'

const ProductDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [imgErr, setImgErr] = useState(false)

  useEffect(() => {
    getProductById(id)
      .then(data => { if (!data) navigate('/shop', { replace: true }); else setProduct(data) })
      .catch(() => navigate('/shop', { replace: true }))
      .finally(() => setLoading(false))
  }, [id, navigate])

  if (loading) return <FullPageLoader />
  if (!product) return null

  const discount = product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : null

  return (
    <div style={s.page}>
      <div style={s.container}>
        <button style={s.back} onClick={() => navigate(-1)}>
          <FiArrowLeft size={15} /> Back
        </button>

        {/* Breadcrumb */}
        <div style={s.breadcrumb}>
          <Link to="/" style={s.breadLink}>Home</Link>
          <span style={s.breadSep}>/</span>
          <Link to="/shop" style={s.breadLink}>Shop</Link>
          <span style={s.breadSep}>/</span>
          <span style={s.breadCurrent}>{product.title}</span>
        </div>

        <div style={s.layout}>
          {/* Image */}
          <div style={s.imgCol}>
            <div style={s.imgBox}>
              <img
                src={imgErr ? imgFallback(600, 500) : (product.imageUrl || imgFallback(600, 500))}
                alt={product.title}
                style={s.img}
                onError={() => setImgErr(true)}
              />
              {discount && <span style={s.discBadge}>-{discount}% OFF</span>}
            </div>
          </div>

          {/* Info */}
          <div style={s.infoCol}>
            <div style={s.catRow}>
              <Link to={`/shop?category=${encodeURIComponent(product.category)}`} style={s.catTag}>
                {product.category}
              </Link>
              <span style={s.sellerTag}>by {product.sellerName || 'MegaMartX'}</span>
            </div>

            <h1 style={s.title}>{product.title}</h1>

            {/* Stars */}
            <div style={s.stars}>
              {[1,2,3,4,5].map(n => (
                <FiStar key={n} size={16}
                  fill={n <= (product.rating || 4) ? '#f59e0b' : 'none'}
                  color={n <= (product.rating || 4) ? '#f59e0b' : '#ddd'} />
              ))}
              <span style={s.ratingVal}>{product.rating || 4}.0</span>
              <span style={s.ratingCount}>({product.reviews || 0} reviews)</span>
            </div>

            {/* Price */}
            <div style={s.priceRow}>
              <span style={s.price}>{formatPrice(product.price)}</span>
              {product.originalPrice > product.price && (
                <>
                  <span style={s.original}>{formatPrice(product.originalPrice)}</span>
                  <span style={s.savePill}>Save {discount}%</span>
                </>
              )}
            </div>

            <p style={s.desc}>{product.description}</p>

            {product.stock !== undefined && (
              <div style={product.stock > 0 ? s.inStock : s.outStock}>
                {product.stock > 0 ? `✓ In Stock (${product.stock} left)` : '✗ Out of Stock'}
              </div>
            )}

            {/* Qty + Cart */}
            <div style={s.addRow}>
              <div style={s.qtyControl}>
                <button style={s.qtyBtn} onClick={() => setQty(q => Math.max(1, q - 1))}><FiMinus size={14} /></button>
                <span style={s.qtyVal}>{qty}</span>
                <button style={s.qtyBtn} onClick={() => setQty(q => q + 1)}><FiPlus size={14} /></button>
              </div>
              <button style={s.cartBtn} onClick={() => addToCart(product, qty)}>
                <FiShoppingCart size={17} /> Add to Cart
              </button>
            </div>

            {/* Trust */}
            <div style={s.trustRow}>
              {[
                { icon: FiTruck,     text: 'Free delivery over $50' },
                { icon: FiRefreshCw, text: '30-day returns' },
                { icon: FiShield,    text: 'Secure checkout' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} style={s.trustItem}>
                  <Icon size={13} color="#2196F3" />
                  <span>{text}</span>
                </div>
              ))}
            </div>

            <p style={s.listedDate}>Listed on {formatDate(product.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  page: { background: '#fff', minHeight: '80vh', padding: '32px 0 64px' },
  container: { maxWidth: '1100px', margin: '0 auto', padding: '0 20px' },
  back: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: '#f0f8ff', border: '1px solid #bbdefb',
    borderRadius: '8px', color: '#555',
    fontSize: '13px', padding: '8px 14px',
    cursor: 'pointer', marginBottom: '16px',
  },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '28px' },
  breadLink: { color: '#2196F3', fontSize: '13px' },
  breadSep: { color: '#bbb', fontSize: '13px' },
  breadCurrent: { color: '#555', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' },

  layout: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'start' },

  imgCol: {},
  imgBox: {
    position: 'relative', borderRadius: '16px',
    overflow: 'hidden', background: '#f0f8ff',
    border: '1px solid #e3f2fd',
    boxShadow: '0 8px 32px rgba(33,150,243,0.08)',
  },
  img: { width: '100%', display: 'block', maxHeight: '460px', objectFit: 'cover' },
  discBadge: {
    position: 'absolute', top: '14px', left: '14px',
    background: '#e53935', color: '#fff',
    fontSize: '12px', fontWeight: 700,
    padding: '4px 12px', borderRadius: '20px',
  },

  infoCol: { display: 'flex', flexDirection: 'column', gap: '18px' },
  catRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  catTag: {
    background: '#e3f2fd', color: '#2196F3',
    border: '1px solid #90caf9',
    fontSize: '12px', fontWeight: 600,
    padding: '4px 12px', borderRadius: '20px',
  },
  sellerTag: { color: '#888', fontSize: '13px' },

  title: { color: '#000', fontSize: '26px', fontWeight: 700, margin: 0, lineHeight: 1.3 },

  stars: { display: 'flex', alignItems: 'center', gap: '3px' },
  ratingVal: { color: '#f59e0b', fontWeight: 700, fontSize: '14px', marginLeft: '6px' },
  ratingCount: { color: '#aaa', fontSize: '13px' },

  priceRow: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  price: { color: '#2196F3', fontSize: '32px', fontWeight: 800 },
  original: { color: '#bbb', fontSize: '18px', textDecoration: 'line-through' },
  savePill: {
    background: '#e3f2fd', color: '#1565C0',
    border: '1px solid #90caf9',
    fontSize: '12px', fontWeight: 700,
    padding: '3px 10px', borderRadius: '20px',
  },

  desc: { color: '#555', fontSize: '14px', lineHeight: '1.75', margin: 0 },

  inStock: {
    display: 'inline-flex', alignItems: 'center',
    background: '#e8f5e9', color: '#2e7d32',
    border: '1px solid #a5d6a7',
    fontSize: '13px', fontWeight: 600,
    padding: '6px 14px', borderRadius: '8px',
  },
  outStock: {
    display: 'inline-flex', alignItems: 'center',
    background: '#fff0f0', color: '#e53935',
    border: '1px solid #fecaca',
    fontSize: '13px', fontWeight: 600,
    padding: '6px 14px', borderRadius: '8px',
  },

  addRow: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' },
  qtyControl: {
    display: 'flex', alignItems: 'center', gap: '14px',
    border: '1.5px solid #bbdefb', borderRadius: '10px',
    padding: '9px 14px', background: '#f0f8ff',
  },
  qtyBtn: {
    background: 'none', border: 'none',
    color: '#2196F3', cursor: 'pointer', display: 'flex', padding: 0,
  },
  qtyVal: { color: '#000', fontSize: '16px', fontWeight: 700, minWidth: '24px', textAlign: 'center' },
  cartBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    padding: '12px 28px', background: '#2196F3', color: '#fff',
    border: 'none', borderRadius: '10px',
    fontSize: '15px', fontWeight: 700, cursor: 'pointer',
    flex: 1, boxShadow: '0 4px 16px rgba(33,150,243,0.3)',
  },

  trustRow: {
    display: 'flex', flexWrap: 'wrap', gap: '12px',
    padding: '14px 16px', background: '#f0f8ff',
    border: '1px solid #e3f2fd', borderRadius: '10px',
  },
  trustItem: { display: 'flex', alignItems: 'center', gap: '6px', color: '#555', fontSize: '12px' },
  listedDate: { color: '#aaa', fontSize: '12px', margin: 0 },
}

export default ProductDetails
