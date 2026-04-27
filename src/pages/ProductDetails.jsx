// ============================================================
// ProductDetails Page — white + blue theme
// ============================================================

import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { FiShoppingCart, FiArrowLeft, FiStar, FiTruck, FiRefreshCw, FiShield, FiMinus, FiPlus, FiUser, FiMessageSquare, FiShoppingBag, FiHeart } from 'react-icons/fi'
import {
  getProductById, getProductReviews,
  trackProductView, getSimilarProducts, startConversation,
  checkWishlist, addToWishlist, removeFromWishlist,
} from '../firebase/firestore'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { formatPrice, imgFallback, formatDate } from '../utils/helpers'
import { FullPageLoader } from '../components/Loader'
import RecommendationCarousel from '../components/RecommendationCarousel'
import toast from 'react-hot-toast'

const StarRow = ({ value, onChange, size = 26 }) => (
  <div style={{ display: 'flex', gap: '4px' }}>
    {[1,2,3,4,5].map(n => (
      <button
        key={n}
        type="button"
        onClick={() => onChange && onChange(n)}
        style={{ background: 'none', border: 'none', cursor: onChange ? 'pointer' : 'default', padding: '2px' }}
      >
        <FiStar
          size={size}
          fill={n <= value ? '#f59e0b' : 'none'}
          color={n <= value ? '#f59e0b' : '#ddd'}
        />
      </button>
    ))}
  </div>
)

const ProductDetails = () => {
  const { id }            = useParams()
  const navigate          = useNavigate()
  const { addToCart }     = useCart()
  const { currentUser }   = useAuth()

  const [product,        setProduct]        = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [qty,            setQty]            = useState(1)
  const [imgErr,         setImgErr]         = useState(false)
  const [similar,        setSimilar]        = useState([])
  const [similarLoad,    setSimilarLoad]    = useState(true)
  const [msgBusy,        setMsgBusy]        = useState(false)

  const [reviewData,     setReviewData]     = useState(null)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [wishlisted,     setWishlisted]     = useState(false)
  const [wishBusy,       setWishBusy]       = useState(false)

  useEffect(() => {
    getProductById(id)
      .then(data => {
        if (!data) navigate('/shop', { replace: true })
        else {
          setProduct(data)
          trackProductView(data.id, data.category)
        }
      })
      .catch(() => navigate('/shop', { replace: true }))
      .finally(() => setLoading(false))
  }, [id, navigate])

  // Check wishlist status when user + product are known
  useEffect(() => {
    if (!currentUser || !id) return
    checkWishlist(currentUser.uid, id)
      .then(d => setWishlisted(d.wishlisted))
      .catch(() => {})
  }, [currentUser, id])

  useEffect(() => {
    if (!id) return
    setReviewsLoading(true)
    getProductReviews(id)
      .then(setReviewData)
      .catch(() => {})
      .finally(() => setReviewsLoading(false))

    setSimilarLoad(true)
    getSimilarProducts(id)
      .then(setSimilar)
      .catch(() => {})
      .finally(() => setSimilarLoad(false))
  }, [id])

  const handleToggleWishlist = async () => {
    if (!currentUser) { toast.error('Login to save to wishlist'); return navigate('/login') }
    setWishBusy(true)
    try {
      if (wishlisted) {
        await removeFromWishlist(currentUser.uid, product.id)
        setWishlisted(false)
        toast.success('Removed from wishlist')
      } else {
        await addToWishlist(product.id, true)
        setWishlisted(true)
        toast.success('Saved to wishlist! We\'ll notify you on price drops.')
      }
    } catch { toast.error('Could not update wishlist') }
    finally { setWishBusy(false) }
  }

  const handleMessageSeller = async () => {
    if (!currentUser) { toast.error('Login to message seller'); return navigate('/login') }
    if (!product) return
    if (currentUser.uid === product.sellerUid) return toast.error("That's your own product")
    setMsgBusy(true)
    try {
      const conv = await startConversation({
        sellerId:     product.sellerUid,
        sellerName:   product.sellerName,
        productId:    product.id,
        productTitle: product.title,
      })
      navigate(`/messages/${conv.id}`)
    } catch { toast.error('Could not start conversation') }
    finally { setMsgBusy(false) }
  }

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
          {/* Image — */}
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

            {/* Wishlist */}
            <button
              style={{
                ...s.wishlistBtn,
                background: wishlisted ? '#fff5f5' : '#f9fcff',
                border: wishlisted ? '1.5px solid #ffcdd2' : '1.5px solid #e3f2fd',
                color:  wishlisted ? '#e53935' : '#555',
              }}
              onClick={handleToggleWishlist}
              disabled={wishBusy}
            >
              <FiHeart size={15} fill={wishlisted ? '#e53935' : 'none'} color={wishlisted ? '#e53935' : '#555'} />
              {wishlisted ? 'Saved to Wishlist' : 'Add to Wishlist'}
              {wishlisted && <span style={{ fontSize: '11px', color: '#888', marginLeft: '4px' }}>· Price alerts on</span>}
            </button>

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

            {/* Seller actions */}
            <div style={s.sellerActions}>
              {product.sellerUid && currentUser?.uid !== product.sellerUid && (
                <button style={s.msgSellerBtn} onClick={handleMessageSeller} disabled={msgBusy}>
                  <FiMessageSquare size={14} />
                  {msgBusy ? 'Opening…' : 'Message Seller'}
                </button>
              )}
              {product.sellerUid && (
                <Link to={`/store/${product.sellerUid}`} style={s.viewStoreBtn}>
                  <FiShoppingBag size={14} />
                  View Store
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ── Reviews section ── */}
        <div style={s.reviewsSection}>
          <div style={s.reviewsHeader}>
            <div>
              <h2 style={s.reviewsTitle}>Customer Reviews</h2>
              {reviewData && reviewData.total > 0 && (
                <div style={s.ratingOverview}>
                  <span style={s.bigRating}>{reviewData.avgRating?.toFixed(1)}</span>
                  <div>
                    <StarRow value={Math.round(reviewData.avgRating || 0)} />
                    <p style={s.totalReviews}>{reviewData.total} review{reviewData.total !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {reviewsLoading && <p style={s.reviewMsg}>Loading reviews…</p>}

          {!reviewsLoading && (!reviewData || reviewData.total === 0) && (
            <div style={s.noReviews}>
              <FiStar size={32} color="#ddd" />
              <p style={{ margin: '8px 0 0', color: '#aaa', fontSize: '14px' }}>No reviews yet. Be the first to review after delivery!</p>
            </div>
          )}

          {!reviewsLoading && reviewData && reviewData.reviews.length > 0 && (
            <div style={s.reviewList}>
              {reviewData.reviews.map(r => (
                <div key={r.id} style={s.reviewCard}>
                  <div style={s.reviewTop}>
                    <div style={s.reviewAvatar}>{r.userName?.[0]?.toUpperCase() || <FiUser size={14} />}</div>
                    <div style={{ flex: 1 }}>
                      <div style={s.reviewMeta}>
                        <span style={s.reviewerName}>{r.userName || 'Customer'}</span>
                        <span style={s.reviewDate}>{formatDate(r.createdAt)}</span>
                      </div>
                      <StarRow value={r.rating} size={14} />
                    </div>
                    <div style={s.ratingBadge}>{r.rating}.0</div>
                  </div>
                  {r.comment && <p style={s.reviewComment}>{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Similar Products ── */}
      {(similar.length > 0 || similarLoad) && (
        <div style={{ borderTop: '2px solid #e3f2fd', paddingTop: '8px' }}>
          <RecommendationCarousel
            title="Similar Products"
            subtitle={product.category ? `More in ${product.category}` : 'You might also like'}
            products={similar}
            loading={similarLoad}
            viewAllLink={`/shop?category=${encodeURIComponent(product.category)}`}
          />
        </div>
      )}

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

  wishlistBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    padding: '10px 18px', borderRadius: '10px',
    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
    marginBottom: '4px', width: '100%', justifyContent: 'center',
    transition: 'all .2s',
  },

  sellerActions: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  msgSellerBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '7px',
    padding: '10px 20px', background: '#f0f8ff', color: '#2196F3',
    border: '1.5px solid #90caf9', borderRadius: '10px',
    fontSize: '13px', fontWeight: 700, cursor: 'pointer',
  },
  viewStoreBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '7px',
    padding: '10px 20px', background: '#fff', color: '#555',
    border: '1.5px solid #ddd', borderRadius: '10px',
    fontSize: '13px', fontWeight: 600,
  },

  // Reviews
  reviewsSection: {
    marginTop: '56px',
    borderTop: '2px solid #e3f2fd',
    paddingTop: '36px',
  },
  reviewsHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: '24px', flexWrap: 'wrap', gap: '12px',
  },
  reviewsTitle: { color: '#000', fontSize: '20px', fontWeight: 700, margin: '0 0 12px' },
  ratingOverview: { display: 'flex', alignItems: 'center', gap: '14px' },
  bigRating: { fontSize: '48px', fontWeight: 800, color: '#f59e0b', lineHeight: 1 },
  totalReviews: { color: '#888', fontSize: '12px', margin: '4px 0 0' },
  reviewMsg:  { color: '#aaa', fontSize: '14px' },
  noReviews: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '40px', background: '#f8faff',
    border: '1.5px dashed #e3f2fd', borderRadius: '14px', textAlign: 'center',
  },
  reviewList: { display: 'flex', flexDirection: 'column', gap: '14px' },
  reviewCard: {
    background: '#fff', border: '1.5px solid #e3f2fd',
    borderRadius: '14px', padding: '18px 20px',
    boxShadow: '0 2px 10px rgba(33,150,243,0.04)',
  },
  reviewTop: { display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' },
  reviewAvatar: {
    width: '38px', height: '38px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #2196F3, #1565C0)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '15px', fontWeight: 700, flexShrink: 0,
  },
  reviewMeta: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' },
  reviewerName: { color: '#000', fontSize: '14px', fontWeight: 600 },
  reviewDate:   { color: '#aaa', fontSize: '12px' },
  ratingBadge: {
    background: '#fff3cd', color: '#856404',
    border: '1px solid #ffc107',
    borderRadius: '8px', padding: '3px 9px',
    fontSize: '13px', fontWeight: 700, flexShrink: 0,
  },
  reviewComment: {
    color: '#444', fontSize: '14px', lineHeight: 1.7,
    margin: 0, paddingLeft: '50px',
  },
}

export default ProductDetails
