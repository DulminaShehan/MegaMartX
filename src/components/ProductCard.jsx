// ============================================================
// ProductCard — white card with light blue accents
// ============================================================

import { Link, useNavigate } from 'react-router-dom'
import { FiShoppingCart, FiStar, FiHeart, FiZap } from 'react-icons/fi'
import { useCart } from '../context/CartContext'
import { formatPrice, truncate, imgFallback } from '../utils/helpers'

const ProductCard = ({ product }) => {
  const { addToCart } = useCart()
  const navigate = useNavigate()

  const handleAdd = (e) => {
    e.preventDefault()
    addToCart(product)
  }

  const handleBuyNow = (e) => {
    e.preventDefault()
    addToCart(product)
    navigate('/checkout')
  }

  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null

  return (
    <Link to={`/product/${product.id}`} style={s.card}>
      {/* Image */}
      <div style={s.imgBox}>
        <img
          src={product.imageUrl || imgFallback(400, 300)}
          alt={product.title}
          style={s.img}
          onError={(e) => { e.target.src = imgFallback(400, 300) }}
          loading="lazy"
        />
        {discount && <span style={s.discountBadge}>-{discount}%</span>}
        <button style={s.wishlist} onClick={(e) => e.preventDefault()} title="Wishlist">
          <FiHeart size={15} />
        </button>
      </div>

      {/* Body */}
      <div style={s.body}>
        <p style={s.category}>{product.category}</p>
        <h3 style={s.title}>{truncate(product.title, 52)}</h3>

        {/* Stars */}
        <div style={s.stars}>
          {[1,2,3,4,5].map(n => (
            <FiStar key={n} size={11}
              fill={n <= (product.rating || 4) ? '#f59e0b' : 'none'}
              color={n <= (product.rating || 4) ? '#f59e0b' : '#ccc'} />
          ))}
          <span style={s.ratingText}>({product.reviews || 0})</span>
        </div>

        {/* Price */}
        <div style={s.priceRow}>
          <span style={s.price}>{formatPrice(product.price)}</span>
          {product.originalPrice > product.price && (
            <span style={s.original}>{formatPrice(product.originalPrice)}</span>
          )}
        </div>

        {/* CTA */}
        <div style={s.ctaRow}>
          <button style={s.cartBtn} onClick={handleAdd}>
            <FiShoppingCart size={13} />
            Add to Cart
          </button>
          <button style={s.buyBtn} onClick={handleBuyNow}>
            <FiZap size={13} />
            Buy Now
          </button>
        </div>
      </div>
    </Link>
  )
}

const s = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    background: '#ffffff',
    border: '1px solid #e3f2fd',
    borderRadius: '14px',
    overflow: 'hidden',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'transform .2s, box-shadow .2s',
    boxShadow: '0 2px 8px rgba(33,150,243,0.06)',
    cursor: 'pointer',
  },
  imgBox: {
    position: 'relative',
    paddingTop: '68%',
    background: '#f0f8ff',
    overflow: 'hidden',
  },
  img: {
    position: 'absolute',
    inset: 0, width: '100%', height: '100%',
    objectFit: 'cover',
    transition: 'transform .35s',
  },
  discountBadge: {
    position: 'absolute',
    top: '10px', left: '10px',
    background: '#e53935',
    color: '#fff',
    fontSize: '11px', fontWeight: 700,
    padding: '3px 9px',
    borderRadius: '20px',
  },
  wishlist: {
    position: 'absolute',
    top: '10px', right: '10px',
    background: '#fff',
    border: '1px solid #e3f2fd',
    borderRadius: '8px',
    width: '30px', height: '30px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#aaa',
    boxShadow: '0 2px 6px rgba(0,0,0,.06)',
  },
  body: {
    padding: '14px 16px',
    display: 'flex', flexDirection: 'column', gap: '7px',
    flex: 1,
  },
  category: {
    color: '#2196F3',
    fontSize: '11px', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.5px',
    margin: 0,
  },
  title: { color: '#000', fontSize: '14px', fontWeight: 600, margin: 0, lineHeight: '1.4' },
  stars: { display: 'flex', alignItems: 'center', gap: '2px' },
  ratingText: { color: '#aaa', fontSize: '11px', marginLeft: '4px' },
  priceRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  price: { color: '#2196F3', fontSize: '17px', fontWeight: 800 },
  original: { color: '#bbb', fontSize: '12px', textDecoration: 'line-through' },
  ctaRow: {
    display: 'flex', gap: '7px', marginTop: '2px',
  },
  cartBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
    padding: '9px 0',
    background: '#2196F3',
    color: '#fff',
    border: 'none', borderRadius: '8px',
    fontSize: '12px', fontWeight: 600,
    cursor: 'pointer',
    flex: 1,
    transition: 'background .2s',
  },
  buyBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
    padding: '9px 0',
    background: '#ff6f00',
    color: '#fff',
    border: 'none', borderRadius: '8px',
    fontSize: '12px', fontWeight: 600,
    cursor: 'pointer',
    flex: 1,
    transition: 'background .2s',
  },
}

export default ProductCard
