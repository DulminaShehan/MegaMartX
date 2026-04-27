// ============================================================
// StoreFront — public seller store page  (/store/:sellerUid)
// ============================================================

import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  FiStar, FiPackage, FiUsers, FiMapPin, FiHeart,
  FiShoppingBag, FiArrowLeft, FiCalendar, FiMessageSquare,
} from 'react-icons/fi'
import {
  getStoreProfile, toggleFollowStore, getFollowStatus, startConversation,
} from '../firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { formatPrice, imgFallback, formatDate } from '../utils/helpers'
import { FullPageLoader } from '../components/Loader'
import ProductCard from '../components/ProductCard'
import toast from 'react-hot-toast'

const StoreFront = () => {
  const { sellerUid }      = useParams()
  const { currentUser }    = useAuth()
  const navigate           = useNavigate()

  const [store,     setStore]     = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [following, setFollowing] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)
  const [msgBusy,   setMsgBusy]   = useState(false)
  const [imgErr,    setImgErr]    = useState(false)

  useEffect(() => {
    getStoreProfile(sellerUid)
      .then(data => {
        setStore(data)
        if (currentUser && currentUser.uid !== sellerUid) {
          getFollowStatus(sellerUid)
            .then(d => setFollowing(d.following))
            .catch(() => {})
        }
      })
      .catch(() => navigate('/shop', { replace: true }))
      .finally(() => setLoading(false))
  }, [sellerUid, currentUser])

  const handleFollow = async () => {
    if (!currentUser) { toast.error('Login to follow stores'); return navigate('/login') }
    setFollowBusy(true)
    try {
      const res = await toggleFollowStore(sellerUid)
      setFollowing(res.following)
      setStore(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          followerCount: prev.stats.followerCount + (res.following ? 1 : -1),
        },
      }))
      toast.success(res.following ? 'Store followed!' : 'Unfollowed')
    } catch { toast.error('Could not update follow') }
    finally { setFollowBusy(false) }
  }

  const handleMessage = async () => {
    if (!currentUser) { toast.error('Login to message sellers'); return navigate('/login') }
    if (currentUser.uid === sellerUid) return toast.error('That\'s your own store')
    setMsgBusy(true)
    try {
      const conv = await startConversation({
        sellerId:   sellerUid,
        sellerName: store.seller.storeName,
        productId:  '',
        productTitle: '',
      })
      navigate(`/messages/${conv.id}`)
    } catch { toast.error('Could not start conversation') }
    finally { setMsgBusy(false) }
  }

  if (loading) return <FullPageLoader />
  if (!store)  return null

  const { seller, profile, stats, products } = store
  const isOwner = currentUser?.uid === sellerUid

  return (
    <div style={s.page}>

      {/* ── Banner ── */}
      <div style={s.banner}>
        {profile.bannerUrl && !imgErr ? (
          <img
            src={profile.bannerUrl}
            alt="Store banner"
            style={s.bannerImg}
            onError={() => setImgErr(true)}
          />
        ) : (
          <div style={s.bannerDefault} />
        )}
        <div style={s.bannerOverlay} />
      </div>

      {/* ── Store header ── */}
      <div style={s.headerWrap}>
        <div style={s.container}>
          <div style={s.storeHeader}>
            {/* Avatar */}
            <div style={s.avatarWrap}>
              {seller.photoURL
                ? <img src={seller.photoURL} alt={seller.storeName} style={s.avatar} />
                : <div style={s.avatarFallback}>{seller.storeName?.[0]?.toUpperCase() || 'S'}</div>
              }
            </div>

            {/* Info */}
            <div style={s.storeInfo}>
              <h1 style={s.storeName}>{seller.storeName}</h1>
              <p style={s.realName}>by {seller.name}</p>
              {profile.location && (
                <div style={s.locationRow}>
                  <FiMapPin size={12} color="#90caf9" />
                  <span style={s.locationText}>{profile.location}</span>
                </div>
              )}
              <div style={s.statsRow}>
                {[
                  { icon: FiPackage,  val: stats.productCount,   label: 'Products' },
                  { icon: FiUsers,    val: stats.followerCount,   label: 'Followers' },
                  { icon: FiStar,     val: stats.avgRating ?? '—', label: `${stats.reviewCount} Reviews` },
                  { icon: FiCalendar, val: formatDate(seller.createdAt), label: 'Joined' },
                ].map(({ icon: Icon, val, label }) => (
                  <div key={label} style={s.stat}>
                    <Icon size={13} color="#2196F3" />
                    <span style={s.statVal}>{val}</span>
                    <span style={s.statLabel}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={s.actions}>
              {!isOwner && (
                <>
                  <button
                    style={{ ...s.followBtn, ...(following ? s.followingBtn : {}) }}
                    onClick={handleFollow}
                    disabled={followBusy}
                  >
                    <FiHeart size={14} fill={following ? '#2196F3' : 'none'} />
                    {following ? 'Following' : 'Follow Store'}
                  </button>
                  <button style={s.msgBtn} onClick={handleMessage} disabled={msgBusy}>
                    <FiMessageSquare size={14} />
                    {msgBusy ? '…' : 'Message'}
                  </button>
                </>
              )}
              {isOwner && (
                <Link to="/seller?tab=storefront" style={s.editBtn}>
                  Edit Store
                </Link>
              )}
            </div>
          </div>

          {/* Bio */}
          {profile.bio && <p style={s.bio}>{profile.bio}</p>}
        </div>
      </div>

      {/* ── Products ── */}
      <div style={s.productsSection}>
        <div style={s.container}>
          <div style={s.sectionHead}>
            <div>
              <h2 style={s.sectionTitle}>
                <FiShoppingBag size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#2196F3' }} />
                All Products
              </h2>
              <p style={s.sectionSub}>{stats.productCount} product{stats.productCount !== 1 ? 's' : ''} listed</p>
            </div>
          </div>

          {products.length === 0 ? (
            <div style={s.empty}>
              <FiPackage size={36} color="#bbb" />
              <p style={s.emptyText}>No products listed yet</p>
            </div>
          ) : (
            <div style={s.grid}>
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>

      {/* ── Back nav ── */}
      <div style={s.container}>
        <button style={s.back} onClick={() => navigate(-1)}>
          <FiArrowLeft size={14} /> Back
        </button>
      </div>
    </div>
  )
}

const s = {
  page: { background: '#fff', minHeight: '80vh' },

  // Banner
  banner: { position: 'relative', height: '200px', overflow: 'hidden', background: '#e3f2fd' },
  bannerImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  bannerDefault: { width: '100%', height: '100%', background: 'linear-gradient(135deg, #1565C0 0%, #2196F3 60%, #42a5f5 100%)' },
  bannerOverlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.18)' },

  // Store header block
  headerWrap: { background: '#fff', borderBottom: '1px solid #e3f2fd', boxShadow: '0 2px 16px rgba(33,150,243,0.07)' },
  container:  { maxWidth: '1200px', margin: '0 auto', padding: '0 20px' },

  storeHeader: {
    display: 'flex', alignItems: 'flex-start', gap: '24px',
    padding: '0 0 24px', flexWrap: 'wrap',
    marginTop: '-40px',
  },

  // Avatar
  avatarWrap: { flexShrink: 0 },
  avatar: {
    width: '88px', height: '88px', borderRadius: '50%',
    border: '4px solid #fff', boxShadow: '0 4px 16px rgba(33,150,243,0.18)',
    objectFit: 'cover',
  },
  avatarFallback: {
    width: '88px', height: '88px', borderRadius: '50%',
    border: '4px solid #fff', boxShadow: '0 4px 16px rgba(33,150,243,0.18)',
    background: 'linear-gradient(135deg, #2196F3, #1565C0)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontSize: '32px', fontWeight: 800,
  },

  storeInfo: { flex: 1, minWidth: '240px', paddingTop: '16px' },
  storeName: { color: '#000', fontSize: '24px', fontWeight: 800, margin: '0 0 3px' },
  realName:  { color: '#888', fontSize: '13px', margin: '0 0 6px' },
  locationRow: { display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '12px' },
  locationText: { color: '#888', fontSize: '13px' },

  statsRow: { display: 'flex', gap: '20px', flexWrap: 'wrap' },
  stat:     { display: 'flex', alignItems: 'center', gap: '5px' },
  statVal:  { color: '#000', fontSize: '13px', fontWeight: 700 },
  statLabel:{ color: '#888', fontSize: '12px' },

  actions: { display: 'flex', gap: '10px', paddingTop: '52px', flexShrink: 0, flexWrap: 'wrap' },
  followBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '9px 18px', background: '#e3f2fd', color: '#2196F3',
    border: '1.5px solid #90caf9', borderRadius: '10px',
    fontSize: '13px', fontWeight: 700, cursor: 'pointer',
  },
  followingBtn: { background: '#2196F3', color: '#fff', border: '1.5px solid #1565C0' },
  msgBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '9px 18px', background: '#fff', color: '#2196F3',
    border: '1.5px solid #bbdefb', borderRadius: '10px',
    fontSize: '13px', fontWeight: 700, cursor: 'pointer',
  },
  editBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '9px 18px', background: '#2196F3', color: '#fff',
    border: 'none', borderRadius: '10px',
    fontSize: '13px', fontWeight: 700,
    boxShadow: '0 3px 12px rgba(33,150,243,0.3)',
  },

  bio: { color: '#555', fontSize: '14px', lineHeight: 1.7, margin: '0 0 24px', maxWidth: '640px' },

  // Products section
  productsSection: { padding: '40px 0 64px' },
  sectionHead: { marginBottom: '24px' },
  sectionTitle: { color: '#000', fontSize: '20px', fontWeight: 700, margin: '0 0 4px' },
  sectionSub:   { color: '#888', fontSize: '13px', margin: 0 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '20px',
  },
  empty: {
    textAlign: 'center', padding: '60px',
    color: '#aaa', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
  },
  emptyText: { fontSize: '15px', margin: 0 },

  back: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: 'none', border: 'none', color: '#2196F3',
    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
    padding: '0 0 32px',
  },
}

export default StoreFront
