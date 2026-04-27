// ============================================================
// RecommendationCarousel — horizontal scroll product carousel
// ============================================================

import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { FiChevronLeft, FiChevronRight, FiArrowRight, FiShoppingCart, FiStar } from 'react-icons/fi'
import { useCart } from '../context/CartContext'
import { formatPrice, imgFallback } from '../utils/helpers'

const CARD_W = 200   // width in px each card occupies including gap

const RecommendationCarousel = ({ title, subtitle, products = [], loading = false, viewAllLink = '/shop' }) => {
  const scrollRef = useRef(null)
  const { addToCart } = useCart()

  const scroll = (dir) => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir * CARD_W * 3, behavior: 'smooth' })
  }

  if (!loading && products.length === 0) return null

  return (
    <section style={s.section}>
      <div style={s.container}>
        <div style={s.head}>
          <div>
            <h2 style={s.title}>{title}</h2>
            {subtitle && <p style={s.sub}>{subtitle}</p>}
          </div>
          <div style={s.headRight}>
            <button style={s.arrowBtn} onClick={() => scroll(-1)} aria-label="scroll left">
              <FiChevronLeft size={18} />
            </button>
            <button style={s.arrowBtn} onClick={() => scroll(1)} aria-label="scroll right">
              <FiChevronRight size={18} />
            </button>
            <Link to={viewAllLink} style={s.viewAll}>
              View All <FiArrowRight size={13} />
            </Link>
          </div>
        </div>

        {loading ? (
          <div style={s.skeletonRow}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={s.skeleton} />
            ))}
          </div>
        ) : (
          <div style={s.track} ref={scrollRef}>
            {products.map(p => (
              <ProductMiniCard key={p.id} product={p} onAddToCart={addToCart} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

const ProductMiniCard = ({ product: p, onAddToCart }) => {
  const discount = p.originalPrice > p.price
    ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : null

  return (
    <div style={s.card}>
      <Link to={`/product/${p.id}`} style={s.imgLink}>
        <div style={s.imgWrap}>
          <img
            src={p.imageUrl || imgFallback(220, 180)}
            alt={p.title}
            style={s.img}
            onError={e => { e.target.src = imgFallback(220, 180) }}
          />
          {discount && <span style={s.badge}>-{discount}%</span>}
        </div>
      </Link>

      <div style={s.info}>
        <p style={s.cat}>{p.category}</p>
        <Link to={`/product/${p.id}`} style={s.name}>{p.title}</Link>

        <div style={s.stars}>
          {[1,2,3,4,5].map(n => (
            <FiStar key={n} size={11}
              fill={n <= 4 ? '#f59e0b' : 'none'}
              color={n <= 4 ? '#f59e0b' : '#ddd'} />
          ))}
        </div>

        <div style={s.priceRow}>
          <span style={s.price}>{formatPrice(p.price)}</span>
          {p.originalPrice > p.price && (
            <span style={s.original}>{formatPrice(p.originalPrice)}</span>
          )}
        </div>

        <button style={s.cartBtn} onClick={() => onAddToCart(p, 1)}>
          <FiShoppingCart size={13} /> Add
        </button>
      </div>
    </div>
  )
}

const s = {
  section: { padding: '40px 0', background: '#fff' },
  container: { maxWidth: '1280px', margin: '0 auto', padding: '0 20px' },
  head: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-end', marginBottom: '18px',
  },
  title: { color: '#000', fontSize: '20px', fontWeight: 700, margin: '0 0 3px' },
  sub:   { color: '#888', fontSize: '13px', margin: 0 },
  headRight: { display: 'flex', alignItems: 'center', gap: '8px' },
  arrowBtn: {
    width: '32px', height: '32px', borderRadius: '50%',
    border: '1.5px solid #bbdefb', background: '#f0f8ff',
    color: '#2196F3', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  viewAll: {
    display: 'flex', alignItems: 'center', gap: '4px',
    color: '#2196F3', fontSize: '13px', fontWeight: 600,
    padding: '6px 14px', borderRadius: '8px',
    background: '#e3f2fd', border: '1px solid #bbdefb',
  },

  // Scroll track
  track: {
    display: 'flex', gap: '14px',
    overflowX: 'auto', paddingBottom: '8px',
    scrollbarWidth: 'none',
  },

  // Skeleton loader
  skeletonRow: { display: 'flex', gap: '14px' },
  skeleton: {
    flexShrink: 0, width: '186px', height: '280px',
    borderRadius: '14px',
    background: 'linear-gradient(90deg, #f0f8ff 25%, #e3f2fd 50%, #f0f8ff 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
  },

  // Card
  card: {
    flexShrink: 0, width: '186px',
    border: '1.5px solid #e3f2fd', borderRadius: '14px',
    overflow: 'hidden', background: '#fff',
    boxShadow: '0 2px 10px rgba(33,150,243,0.06)',
    transition: 'box-shadow .2s, transform .2s',
  },
  imgLink: { display: 'block' },
  imgWrap: { position: 'relative', background: '#f0f8ff', height: '140px', overflow: 'hidden' },
  img: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  badge: {
    position: 'absolute', top: '8px', left: '8px',
    background: '#e53935', color: '#fff',
    fontSize: '10px', fontWeight: 700,
    padding: '2px 7px', borderRadius: '10px',
  },

  info: { padding: '10px 12px 12px' },
  cat:  { color: '#90caf9', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' },
  name: {
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
    overflow: 'hidden', color: '#000', fontSize: '12px', fontWeight: 600,
    lineHeight: 1.4, margin: '0 0 5px',
  },
  stars: { display: 'flex', gap: '1px', margin: '0 0 7px' },
  priceRow: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' },
  price:    { color: '#2196F3', fontSize: '14px', fontWeight: 800 },
  original: { color: '#bbb', fontSize: '11px', textDecoration: 'line-through' },
  cartBtn: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
    padding: '7px 0', background: '#e3f2fd', color: '#2196F3',
    border: '1px solid #bbdefb', borderRadius: '8px',
    fontSize: '12px', fontWeight: 700, cursor: 'pointer',
  },
}

export default RecommendationCarousel
