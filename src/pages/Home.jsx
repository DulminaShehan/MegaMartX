// ============================================================
// Home Page — white + light blue theme
// ============================================================

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRight } from 'react-icons/fi'
import HeroSection from '../components/HeroSection'
import CategoryBar from '../components/CategoryBar'
import ProductCard from '../components/ProductCard'
import RecommendationCarousel from '../components/RecommendationCarousel'
import { FullPageLoader } from '../components/Loader'
import {
  getAllProducts, getPersonalisedRecs, getTrendingProducts,
} from '../firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { CATEGORIES } from '../utils/helpers'

const getCatEmoji = (cat) => ({
  Electronics:'📱', Fashion:'👗', 'Home & Living':'🏠',
  Sports:'⚽', Beauty:'💄', Books:'📚', Toys:'🧸',
  Grocery:'🛒', Automotive:'🚗',
}[cat] || '🛍️')

const Home = () => {
  const { currentUser } = useAuth()
  const [products,    setProducts]    = useState([])
  const [filtered,    setFiltered]    = useState([])
  const [selectedCat, setSelectedCat] = useState('All')
  const [loading,     setLoading]     = useState(true)

  const [recs,        setRecs]        = useState([])
  const [recsLoading, setRecsLoading] = useState(false)
  const [trending,    setTrending]    = useState([])
  const [trendLoad,   setTrendLoad]   = useState(true)

  useEffect(() => {
    getAllProducts()
      .then(data => { setProducts(data); setFiltered(data.slice(0, 12)) })
      .catch(console.error)
      .finally(() => setLoading(false))

    // Trending — always visible
    getTrendingProducts()
      .then(setTrending)
      .catch(() => {})
      .finally(() => setTrendLoad(false))
  }, [])

  // Personalised recs — only when logged in
  useEffect(() => {
    if (!currentUser) return
    setRecsLoading(true)
    getPersonalisedRecs(currentUser.uid)
      .then(setRecs)
      .catch(() => {})
      .finally(() => setRecsLoading(false))
  }, [currentUser])

  const handleCategory = (cat) => {
    setSelectedCat(cat)
    setFiltered(cat === 'All' ? products.slice(0, 12) : products.filter(p => p.category === cat).slice(0, 12))
  }

  return (
    <div style={{ background: '#fff' }}>
      <HeroSection />
      <CategoryBar selected={selectedCat} onSelect={handleCategory} />

      {/* ── Personalised Recommendations (logged-in users with history) ── */}
      {currentUser && (recs.length > 0 || recsLoading) && (
        <RecommendationCarousel
          title="Recommended for You"
          subtitle="Based on your purchase &amp; browsing history"
          products={recs}
          loading={recsLoading}
          viewAllLink="/shop"
        />
      )}

      {/* ── Featured Products ── */}
      <section style={s.section}>
        <div style={s.container}>
          <div style={s.sectionHead}>
            <div>
              <h2 style={s.sectionTitle}>{selectedCat === 'All' ? 'Featured Products' : selectedCat}</h2>
              <p style={s.sectionSub}>Handpicked products just for you</p>
            </div>
            <Link to="/shop" style={s.viewAll}>View All <FiArrowRight size={14} /></Link>
          </div>

          {loading ? <FullPageLoader /> : filtered.length === 0 ? (
            <div style={s.empty}>
              <p style={s.emptyText}>No products yet.</p>
              <Link to="/shop" style={s.emptyLink}>Browse All</Link>
            </div>
          ) : (
            <div style={s.grid}>{filtered.map(p => <ProductCard key={p.id} product={p} />)}</div>
          )}
        </div>
      </section>

      {/* ── Trending Now ── */}
      <div style={{ background: '#f0f8ff' }}>
        <RecommendationCarousel
          title="Trending Now"
          subtitle="Most viewed in the last 30 days"
          products={trending}
          loading={trendLoad}
          viewAllLink="/shop"
        />
      </div>

      {/* ── CTA Banner ── */}
      <section style={s.banner}>
        <div style={s.bannerInner}>
          <div style={s.bannerLeft}>
            <p style={s.bannerEye}>Join MegaMartX Today</p>
            <h2 style={s.bannerTitle}>Start Selling Your Products Online</h2>
            <p style={s.bannerSub}>Reach thousands of customers. Set up your store in minutes with zero upfront costs.</p>
            <Link to="/register" style={s.bannerBtn}>Create Seller Account <FiArrowRight size={15} /></Link>
          </div>
          <div style={s.bannerRight}>
            <div style={s.bannerCard}>
              <p style={s.bannerStat}>5,000+</p>
              <p style={s.bannerStatLabel}>Active Sellers</p>
            </div>
            <div style={s.bannerCard}>
              <p style={s.bannerStat}>$2M+</p>
              <p style={s.bannerStatLabel}>Monthly Sales</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Category Grid ── */}
      <section style={{ ...s.section, background: '#f0f8ff' }}>
        <div style={s.container}>
          <div style={s.sectionHead}>
            <div>
              <h2 style={s.sectionTitle}>Shop by Category</h2>
              <p style={s.sectionSub}>Find exactly what you're looking for</p>
            </div>
          </div>
          <div style={s.catGrid}>
            {CATEGORIES.slice(1).map(cat => (
              <Link key={cat} to={`/shop?category=${encodeURIComponent(cat)}`} style={s.catCard}>
                <span style={s.catEmoji}>{getCatEmoji(cat)}</span>
                <span style={s.catName}>{cat}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

const s = {
  section: { padding: '56px 0', background: '#fff' },
  container: { maxWidth: '1280px', margin: '0 auto', padding: '0 20px' },
  sectionHead: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-end', marginBottom: '28px',
  },
  sectionTitle: { color: '#000', fontSize: '24px', fontWeight: 700, margin: '0 0 4px' },
  sectionSub: { color: '#777', fontSize: '14px', margin: 0 },
  viewAll: {
    display: 'flex', alignItems: 'center', gap: '5px',
    color: '#2196F3', fontSize: '14px', fontWeight: 600,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '20px',
  },
  empty: { textAlign: 'center', padding: '48px', color: '#888' },
  emptyText: { marginBottom: '12px', fontSize: '15px' },
  emptyLink: { color: '#2196F3', fontWeight: 600 },

  banner: {
    background: 'linear-gradient(135deg, #1565C0 0%, #2196F3 60%, #42a5f5 100%)',
    padding: '56px 20px',
  },
  bannerInner: {
    maxWidth: '1100px', margin: '0 auto',
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', gap: '40px', flexWrap: 'wrap',
  },
  bannerLeft: { flex: 1, maxWidth: '540px' },
  bannerEye: {
    color: 'rgba(255,255,255,0.75)', fontSize: '12px',
    fontWeight: 700, letterSpacing: '1.5px',
    textTransform: 'uppercase', margin: '0 0 10px',
  },
  bannerTitle: { color: '#fff', fontSize: '28px', fontWeight: 800, margin: '0 0 12px', lineHeight: 1.25 },
  bannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: '15px', margin: '0 0 24px', lineHeight: 1.65 },
  bannerBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    padding: '13px 28px', background: '#fff', color: '#1565C0',
    borderRadius: '10px', fontWeight: 700, fontSize: '15px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
  },
  bannerRight: { display: 'flex', gap: '16px', flexWrap: 'wrap' },
  bannerCard: {
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: '14px', padding: '20px 28px', textAlign: 'center',
  },
  bannerStat: { color: '#fff', fontSize: '28px', fontWeight: 800, margin: '0 0 4px' },
  bannerStatLabel: { color: 'rgba(255,255,255,0.8)', fontSize: '13px', margin: 0 },

  catGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '14px', marginTop: '24px',
  },
  catCard: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '10px',
    padding: '22px 12px',
    background: '#fff',
    border: '1.5px solid #bbdefb',
    borderRadius: '14px',
    transition: 'all .2s',
    boxShadow: '0 2px 8px rgba(33,150,243,0.06)',
  },
  catEmoji: { fontSize: '30px' },
  catName: { color: '#000', fontSize: '12px', fontWeight: 600, textAlign: 'center' },
}

export default Home
