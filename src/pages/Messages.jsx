// ============================================================
// Messages — conversation inbox (buyer & seller)
// ============================================================

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiMessageSquare, FiChevronRight, FiUser, FiPackage } from 'react-icons/fi'
import { getUserConversations } from '../firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { formatDate } from '../utils/helpers'
import { FullPageLoader } from '../components/Loader'

const Messages = () => {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [convs, setConvs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUserConversations(currentUser.uid)
      .then(setConvs)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [currentUser.uid])

  if (loading) return <FullPageLoader />

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.header}>
          <div style={s.headerIcon}><FiMessageSquare size={22} color="#2196F3" /></div>
          <div>
            <h1 style={s.title}>Messages</h1>
            <p style={s.sub}>{convs.length} conversation{convs.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {convs.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyIcon}><FiMessageSquare size={40} color="#2196F3" /></div>
            <h3 style={s.emptyTitle}>No messages yet</h3>
            <p style={s.emptySub}>
              Start a conversation by clicking "Message Seller" on any product page.
            </p>
            <Link to="/shop" style={s.shopBtn}>Browse Products</Link>
          </div>
        ) : (
          <div style={s.list}>
            {convs.map(c => {
              const isBuyer       = c.buyerId === currentUser.uid
              const otherName     = isBuyer ? c.sellerName : c.buyerName
              const lastIsMine    = c.lastSenderId === currentUser.uid
              return (
                <button key={c.id} style={s.card} onClick={() => navigate(`/messages/${c.id}`)}>
                  <div style={s.avatar}>
                    <FiUser size={18} color="#2196F3" />
                  </div>
                  <div style={s.cardBody}>
                    <div style={s.cardTop}>
                      <span style={s.name}>{otherName || 'User'}</span>
                      <span style={s.date}>{formatDate(c.updatedAt)}</span>
                    </div>
                    {c.productTitle && (
                      <div style={s.productChip}>
                        <FiPackage size={11} />
                        {c.productTitle.slice(0, 40)}{c.productTitle.length > 40 ? '…' : ''}
                      </div>
                    )}
                    <p style={s.preview}>
                      {lastIsMine ? 'You: ' : ''}
                      {c.lastMessage || 'Start a conversation…'}
                    </p>
                  </div>
                  <FiChevronRight size={16} color="#bbb" style={{ flexShrink: 0 }} />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  page:      { background: '#fff', minHeight: '80vh', padding: '40px 0 64px' },
  container: { maxWidth: '680px', margin: '0 auto', padding: '0 20px' },

  header: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' },
  headerIcon: {
    width: '48px', height: '48px', borderRadius: '14px',
    background: '#e3f2fd', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  title: { color: '#000', fontSize: '24px', fontWeight: 800, margin: '0 0 2px' },
  sub:   { color: '#888', fontSize: '13px', margin: 0 },

  list: { display: 'flex', flexDirection: 'column', gap: '10px' },
  card: {
    display: 'flex', alignItems: 'center', gap: '14px',
    padding: '16px', background: '#fff',
    border: '1.5px solid #e3f2fd', borderRadius: '14px',
    cursor: 'pointer', textAlign: 'left', width: '100%',
    boxShadow: '0 2px 10px rgba(33,150,243,0.05)',
    transition: 'border-color .15s, box-shadow .15s',
  },
  avatar: {
    width: '44px', height: '44px', borderRadius: '50%',
    background: '#e3f2fd', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTop:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' },
  name:     { color: '#000', fontSize: '14px', fontWeight: 700 },
  date:     { color: '#bbb', fontSize: '11px', flexShrink: 0 },
  productChip: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    background: '#e3f2fd', color: '#2196F3',
    fontSize: '11px', fontWeight: 600,
    padding: '2px 8px', borderRadius: '6px', marginBottom: '5px',
  },
  preview: {
    color: '#888', fontSize: '13px', margin: 0,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },

  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '64px 24px', gap: '14px', textAlign: 'center',
  },
  emptyIcon: {
    width: '80px', height: '80px', borderRadius: '50%',
    background: '#e3f2fd', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { color: '#000', fontSize: '20px', fontWeight: 700, margin: 0 },
  emptySub:   { color: '#888', fontSize: '14px', margin: 0, maxWidth: '340px', lineHeight: 1.6 },
  shopBtn: {
    padding: '12px 32px', background: '#2196F3', color: '#fff',
    borderRadius: '10px', fontWeight: 700, fontSize: '14px',
    boxShadow: '0 4px 14px rgba(33,150,243,0.28)',
  },
}

export default Messages
