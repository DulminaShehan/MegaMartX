// ============================================================
// HeroSection — white + light blue modern banner
// ============================================================

import { Link } from 'react-router-dom'
import { FiArrowRight, FiShield, FiTruck, FiRefreshCw, FiStar } from 'react-icons/fi'

const HeroSection = () => (
  <>
    {/* ── Main Hero ── */}
    <section style={s.hero}>
      <div style={s.container}>

        {/* Left content */}
        <div style={s.content}>
          <div style={s.pill}>
            <FiStar size={12} fill="#2196F3" color="#2196F3" />
            <span>Trusted by 200,000+ customers</span>
          </div>
          <h1 style={s.heading}>
            Shop Smarter,<br />
            <span style={s.blue}>Live Better</span>
          </h1>
          <p style={s.sub}>
            Discover thousands of products from verified sellers.
            Fast delivery, easy returns and unbeatable prices — all in one place.
          </p>
          <div style={s.ctas}>
            <Link to="/shop" style={s.primaryBtn}>
              Shop Now <FiArrowRight size={16} />
            </Link>
            <Link to="/register" style={s.secondaryBtn}>
              Become a Seller
            </Link>
          </div>

          {/* Mini stats */}
          <div style={s.miniStats}>
            {[['50K+','Products'],['5K+','Sellers'],['200K+','Customers']].map(([val,label]) => (
              <div key={label} style={s.miniStat}>
                <span style={s.miniVal}>{val}</span>
                <span style={s.miniLabel}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right illustration */}
        <div style={s.illustration}>
          <div style={s.illustrationBg}>
            <div style={s.card1}>
              <div style={s.cardImg}>📱</div>
              <div>
                <p style={s.cardTitle}>New Arrival</p>
                <p style={s.cardPrice}>$299.99</p>
              </div>
              <div style={s.addDot}>+</div>
            </div>
            <div style={s.card2}>
              <span style={s.tag}>🔥 Hot Deal</span>
              <span style={s.discount}>-40% OFF</span>
            </div>
            <div style={s.card3}>
              <FiTruck size={16} color="#2196F3" />
              <span style={s.delivText}>Free Delivery</span>
            </div>
            {/* Decorative circles */}
            <div style={s.circle1} />
            <div style={s.circle2} />
          </div>
        </div>
      </div>
    </section>

    {/* ── Trust strip ── */}
    <section style={s.trustStrip}>
      <div style={s.trustContainer}>
        {[
          { icon: FiTruck,      title: 'Free Shipping',   sub: 'On orders over $50' },
          { icon: FiRefreshCw,  title: 'Easy Returns',    sub: '30-day return policy' },
          { icon: FiShield,     title: 'Secure Payment',  sub: 'SSL encrypted checkout' },
        ].map(({ icon: Icon, title, sub }) => (
          <div key={title} style={s.trustItem}>
            <div style={s.trustIconWrap}><Icon size={20} color="#2196F3" /></div>
            <div>
              <p style={s.trustTitle}>{title}</p>
              <p style={s.trustSub}>{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  </>
)

const s = {
  hero: {
    background: 'linear-gradient(135deg, #ffffff 0%, #e3f2fd 60%, #bbdefb 100%)',
    padding: '72px 20px 64px',
    overflow: 'hidden',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '48px',
  },
  content: { flex: 1, maxWidth: '540px' },

  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: '#e3f2fd',
    border: '1px solid #90caf9',
    borderRadius: '20px',
    padding: '5px 14px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#1565C0',
    marginBottom: '20px',
  },
  heading: {
    fontSize: 'clamp(32px, 5vw, 52px)',
    fontWeight: 800,
    color: '#000',
    lineHeight: 1.15,
    margin: '0 0 18px',
  },
  blue: { color: '#2196F3' },
  sub: {
    color: '#555',
    fontSize: '16px',
    lineHeight: '1.75',
    margin: '0 0 28px',
    maxWidth: '440px',
  },
  ctas: { display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '36px' },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '13px 28px',
    background: '#2196F3',
    color: '#fff',
    borderRadius: '10px',
    fontWeight: 700,
    fontSize: '15px',
    boxShadow: '0 4px 16px rgba(33,150,243,0.35)',
    transition: 'transform .2s, box-shadow .2s',
  },
  secondaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '13px 28px',
    background: '#fff',
    color: '#2196F3',
    border: '2px solid #2196F3',
    borderRadius: '10px',
    fontWeight: 600,
    fontSize: '15px',
    transition: 'all .2s',
  },
  miniStats: { display: 'flex', gap: '28px' },
  miniStat: { display: 'flex', flexDirection: 'column', gap: '2px' },
  miniVal: { color: '#2196F3', fontSize: '20px', fontWeight: 800 },
  miniLabel: { color: '#777', fontSize: '12px' },

  // Illustration
  illustration: { flexShrink: 0, width: '340px' },
  illustrationBg: {
    position: 'relative',
    width: '320px',
    height: '320px',
    background: 'linear-gradient(135deg, #e3f2fd, #ffffff)',
    borderRadius: '32px',
    border: '1px solid #bbdefb',
    boxShadow: '0 20px 60px rgba(33,150,243,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle1: {
    position: 'absolute',
    width: '220px', height: '220px',
    borderRadius: '50%',
    border: '2px dashed #bbdefb',
  },
  circle2: {
    position: 'absolute',
    width: '140px', height: '140px',
    borderRadius: '50%',
    background: 'rgba(33,150,243,0.07)',
  },
  card1: {
    position: 'absolute',
    top: '30px', left: '20px',
    background: '#fff',
    border: '1px solid #e3f2fd',
    borderRadius: '14px',
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    boxShadow: '0 4px 16px rgba(33,150,243,0.1)',
    zIndex: 2,
  },
  cardImg: { fontSize: '28px' },
  cardTitle: { color: '#555', fontSize: '11px', margin: 0 },
  cardPrice: { color: '#2196F3', fontSize: '14px', fontWeight: 700, margin: 0 },
  addDot: {
    width: '24px', height: '24px',
    background: '#2196F3', color: '#fff',
    borderRadius: '50%', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontSize: '18px', fontWeight: 700,
    marginLeft: '4px',
  },
  card2: {
    position: 'absolute',
    bottom: '50px', right: '16px',
    background: '#fff',
    border: '1px solid #e3f2fd',
    borderRadius: '12px',
    padding: '10px 14px',
    display: 'flex', flexDirection: 'column', gap: '4px',
    boxShadow: '0 4px 16px rgba(33,150,243,0.1)',
    zIndex: 2,
  },
  tag: { fontSize: '12px', color: '#555' },
  discount: { fontSize: '18px', fontWeight: 800, color: '#e53935' },
  card3: {
    position: 'absolute',
    bottom: '20px', left: '30px',
    background: '#e3f2fd',
    borderRadius: '10px',
    padding: '8px 14px',
    display: 'flex', alignItems: 'center', gap: '7px',
    zIndex: 2,
  },
  delivText: { color: '#1565C0', fontSize: '12px', fontWeight: 600 },

  // Trust strip
  trustStrip: {
    background: '#ffffff',
    borderTop: '1px solid #e3f2fd',
    borderBottom: '1px solid #e3f2fd',
  },
  trustContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  trustItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '20px 40px',
    borderRight: '1px solid #e3f2fd',
    flex: '1 1 200px',
  },
  trustIconWrap: {
    width: '42px', height: '42px',
    background: '#e3f2fd',
    borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  trustTitle: { color: '#000', fontWeight: 600, fontSize: '14px', margin: '0 0 2px' },
  trustSub: { color: '#777', fontSize: '12px', margin: 0 },
}

export default HeroSection
