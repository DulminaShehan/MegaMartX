// ============================================================
// Rewards Page — /rewards
// ============================================================

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowLeft, FiStar, FiArrowUp, FiArrowDown, FiShoppingBag } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { getRewardBalance } from '../firebase/firestore'
import { formatDate } from '../utils/helpers'
import toast from 'react-hot-toast'

const RewardsPage = () => {
  const { currentUser } = useAuth()
  const [data,    setData]    = useState({ points: 0, transactions: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) return
    getRewardBalance(currentUser.uid)
      .then(setData)
      .catch(() => toast.error('Failed to load rewards'))
      .finally(() => setLoading(false))
  }, [currentUser])

  const dollarValue = (data.points / 100).toFixed(2)

  return (
    <div style={s.page}>
      <div style={s.container}>
        <Link to="/" style={s.backLink}><FiArrowLeft size={14} /> Back to Home</Link>

        {/* Balance hero */}
        <div style={s.heroCard}>
          <div style={s.heroLeft}>
            <p style={s.heroLabel}>Your Reward Points</p>
            <div style={s.pointsRow}>
              <FiStar size={34} color="#f59e0b" fill="#f59e0b" />
              <span style={s.pointsNum}>{loading ? '—' : data.points.toLocaleString()}</span>
              <span style={s.pointsUnit}>pts</span>
            </div>
            <p style={s.dollarVal}>{loading ? '' : `≈ $${dollarValue} redeemable value`}</p>
            <Link to="/checkout" style={s.redeemBtn}>Redeem at Checkout →</Link>
          </div>

          <div style={s.heroRight}>
            <div style={s.ruleBox}>
              <p style={s.ruleTitle}>How it works</p>
              <div style={s.ruleItem}><span style={s.ruleIcon}>🛍️</span><span>Earn <strong>1 pt per $1</strong> on every order</span></div>
              <div style={s.ruleItem}><span style={s.ruleIcon}>💰</span><span><strong>100 pts = $1</strong> off at checkout</span></div>
              <div style={s.ruleItem}><span style={s.ruleIcon}>✨</span><span>Redeem up to <strong>50%</strong> of order value</span></div>
              <div style={s.ruleItem}><span style={s.ruleIcon}>🔔</span><span>Points never expire</span></div>
            </div>
          </div>
        </div>

        {/* History */}
        <h2 style={s.sectionTitle}>Points History</h2>

        {loading ? (
          <div style={s.skeleton} />
        ) : data.transactions.length === 0 ? (
          <div style={s.empty}>
            <FiShoppingBag size={42} color="#e3f2fd" />
            <p style={s.emptyText}>No transactions yet. Place an order to start earning!</p>
            <Link to="/shop" style={s.shopBtn}>Shop Now</Link>
          </div>
        ) : (
          <div style={s.txList}>
            {data.transactions.map(tx => (
              <div key={tx.id} style={s.txRow}>
                <div style={{
                  ...s.txIcon,
                  background: tx.type === 'earned' ? '#e8f5e9' : '#fff3e0',
                  color:      tx.type === 'earned' ? '#2e7d32'  : '#e65100',
                }}>
                  {tx.type === 'earned' ? <FiArrowUp size={16} /> : <FiArrowDown size={16} />}
                </div>
                <div style={s.txInfo}>
                  <p style={s.txDesc}>{tx.description || (tx.type === 'earned' ? 'Points earned' : 'Points redeemed')}</p>
                  <p style={s.txDate}>{formatDate(tx.createdAt)}</p>
                </div>
                <span style={{
                  ...s.txPts,
                  color: tx.type === 'earned' ? '#2e7d32' : '#e65100',
                }}>
                  {tx.type === 'earned' ? '+' : '-'}{tx.points} pts
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default RewardsPage

const s = {
  page:      { background: '#fff', minHeight: '80vh', padding: '36px 0 72px' },
  container: { maxWidth: '720px', margin: '0 auto', padding: '0 20px' },

  backLink: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    color: '#2196F3', fontSize: '13px', fontWeight: 600, marginBottom: '24px',
  },

  heroCard: {
    background: 'linear-gradient(135deg, #1565C0 0%, #2196F3 60%, #42A5F5 100%)',
    borderRadius: '20px', padding: '32px',
    display: 'flex', gap: '24px', marginBottom: '36px',
    flexWrap: 'wrap',
    boxShadow: '0 8px 32px rgba(33,150,243,0.30)',
  },
  heroLeft:   { flex: 1, minWidth: '180px' },
  heroLabel:  { color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600, margin: '0 0 10px' },
  pointsRow:  { display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' },
  pointsNum:  { color: '#fff', fontSize: '54px', fontWeight: 900, lineHeight: 1 },
  pointsUnit: { color: 'rgba(255,255,255,0.7)', fontSize: '20px', fontWeight: 600 },
  dollarVal:  { color: 'rgba(255,255,255,0.85)', fontSize: '14px', margin: '0 0 16px', fontWeight: 500 },
  redeemBtn: {
    display: 'inline-block', padding: '9px 18px',
    background: '#fff', color: '#1565C0',
    borderRadius: '10px', fontWeight: 700, fontSize: '13px',
    textDecoration: 'none',
  },

  heroRight: { flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center' },
  ruleBox: {
    background: 'rgba(255,255,255,0.15)',
    borderRadius: '14px', padding: '18px', width: '100%',
  },
  ruleTitle: { color: '#fff', fontSize: '13px', fontWeight: 700, margin: '0 0 12px' },
  ruleItem:  { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'rgba(255,255,255,0.9)', fontSize: '13px' },
  ruleIcon:  { fontSize: '16px', flexShrink: 0 },

  sectionTitle: { color: '#000', fontSize: '18px', fontWeight: 700, margin: '0 0 16px' },

  skeleton: {
    height: '200px', borderRadius: '12px',
    background: 'linear-gradient(90deg, #f0f8ff 25%, #e3f2fd 50%, #f0f8ff 75%)',
    backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
  },

  empty: {
    textAlign: 'center', padding: '48px 20px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
    border: '1.5px dashed #e3f2fd', borderRadius: '16px',
  },
  emptyText: { color: '#888', fontSize: '14px', margin: 0, maxWidth: '320px' },
  shopBtn: {
    padding: '10px 24px', background: '#2196F3', color: '#fff',
    borderRadius: '10px', fontWeight: 700, textDecoration: 'none', fontSize: '14px',
  },

  txList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  txRow: {
    display: 'flex', alignItems: 'center', gap: '14px',
    padding: '14px 16px', border: '1.5px solid #e3f2fd',
    borderRadius: '12px', background: '#fff',
  },
  txIcon: {
    width: '38px', height: '38px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  txInfo:  { flex: 1, minWidth: 0 },
  txDesc: {
    color: '#000', fontSize: '14px', fontWeight: 600, margin: '0 0 2px',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  txDate:  { color: '#aaa', fontSize: '12px', margin: 0 },
  txPts:   { fontSize: '15px', fontWeight: 800, flexShrink: 0 },
}
