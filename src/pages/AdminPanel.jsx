// ============================================================
// Admin Panel — white + blue theme
// ============================================================

import { useState, useEffect } from 'react'
import { FiUsers, FiPackage, FiShoppingBag, FiTrash2, FiShield } from 'react-icons/fi'
import { getAllUsers, getAllProducts, getAllOrders, deleteProduct, updateUserRole, updateOrderStatus } from '../firebase/firestore'
import { deleteProductImage } from '../firebase/storage'
import { formatPrice, formatDate, STATUS_COLORS, imgFallback } from '../utils/helpers'
import { FullPageLoader } from '../components/Loader'
import toast from 'react-hot-toast'

const TABS = ['Dashboard', 'Users', 'Products', 'Orders']

const AdminPanel = () => {
  const [tab, setTab]         = useState('Dashboard')
  const [users, setUsers]     = useState([])
  const [products, setProds]  = useState([])
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getAllUsers(), getAllProducts(), getAllOrders()])
      .then(([u, p, o]) => { setUsers(u); setProds(p); setOrders(o) })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  const delProduct = async (p) => {
    if (!window.confirm(`Delete "${p.title}"?`)) return
    try {
      await deleteProduct(p.id)
      if (p.imagePath) await deleteProductImage(p.imagePath).catch(() => {})
      setProds(x => x.filter(i => i.id !== p.id)); toast.success('Deleted')
    } catch { toast.error('Failed to delete') }
  }

  const changeRole = async (uid, role) => {
    try { await updateUserRole(uid, role); setUsers(u => u.map(x => x.id === uid ? { ...x, role } : x)); toast.success('Role updated') }
    catch { toast.error('Failed') }
  }

  const changeStatus = async (id, status) => {
    try { await updateOrderStatus(id, status); setOrders(o => o.map(x => x.id === id ? { ...x, status } : x)); toast.success('Updated') }
    catch { toast.error('Failed') }
  }

  if (loading) return <FullPageLoader />
  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0)

  return (
    <div style={s.page}>
      <div style={s.container}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <h1 style={s.title}>Admin Panel</h1>
            <p style={s.sub}>Full platform management</p>
          </div>
          <div style={s.adminBadge}><FiShield size={13} /> Admin</div>
        </div>

        {/* Tabs */}
        <div style={s.tabBar}>
          {TABS.map(t => (
            <button key={t} style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {/* ── Dashboard ── */}
        {tab === 'Dashboard' && (
          <div>
            <div style={s.statsGrid}>
              {[
                { icon: FiUsers,       label: 'Total Users',    val: users.length,            color: '#2196F3' },
                { icon: FiPackage,     label: 'Total Products', val: products.length,         color: '#f59e0b' },
                { icon: FiShoppingBag, label: 'Total Orders',   val: orders.length,           color: '#10b981' },
                { icon: FiShield,      label: 'Total Revenue',  val: formatPrice(totalRevenue), color: '#7c3aed' },
              ].map(({ icon: Icon, label, val, color }) => (
                <div key={label} style={s.statCard}>
                  <div style={{ ...s.statIcon, background: color + '18', color }}><Icon size={22} /></div>
                  <p style={s.statVal}>{val}</p>
                  <p style={s.statLabel}>{label}</p>
                </div>
              ))}
            </div>
            <div style={s.box}>
              <h3 style={s.boxTitle}>Recent Orders</h3>
              <OrderTable orders={orders.slice(0, 5)} onStatus={changeStatus} />
            </div>
          </div>
        )}

        {/* ── Users ── */}
        {tab === 'Users' && (
          <div style={s.box}>
            <h3 style={s.boxTitle}>{users.length} Registered Users</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={s.table}>
                <thead><tr>{['Name','Email','Role','Joined','Change Role'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={s.tr}>
                      <td style={s.td}>
                        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                          <div style={s.avatar}>{u.name?.[0]?.toUpperCase() || '?'}</div>
                          <span style={{ fontWeight:500 }}>{u.name || 'N/A'}</span>
                        </div>
                      </td>
                      <td style={s.td}>{u.email}</td>
                      <td style={s.td}><span style={{ ...s.roleBadge, ...roleStyle(u.role) }}>{u.role || 'user'}</span></td>
                      <td style={s.td}>{formatDate(u.createdAt)}</td>
                      <td style={s.td}>
                        <select style={s.roleSelect} value={u.role || 'user'} onChange={e => changeRole(u.id, e.target.value)}>
                          <option value="user">User</option>
                          <option value="seller">Seller</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Products ── */}
        {tab === 'Products' && (
          <div style={s.box}>
            <h3 style={s.boxTitle}>{products.length} Products</h3>
            <div style={s.pList}>
              {products.map(p => (
                <div key={p.id} style={s.pRow}>
                  <img src={p.imageUrl || imgFallback(60,60)} alt={p.title} style={s.pThumb} onError={e => { e.target.src = imgFallback(60,60) }} />
                  <div style={s.pInfo}>
                    <p style={s.pTitle}>{p.title}</p>
                    <p style={s.pMeta}>{p.category} · {p.sellerName}</p>
                    <p style={s.pPrice}>{formatPrice(p.price)}</p>
                  </div>
                  <button style={s.delBtn} onClick={() => delProduct(p)}><FiTrash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Orders ── */}
        {tab === 'Orders' && (
          <div style={s.box}>
            <h3 style={s.boxTitle}>{orders.length} Orders</h3>
            <OrderTable orders={orders} onStatus={changeStatus} />
          </div>
        )}
      </div>
    </div>
  )
}

const OrderTable = ({ orders, onStatus }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '680px' }}>
      <thead>
        <tr>{['Order ID','Customer','Items','Total','Date','Status'].map(h => (
          <th key={h} style={{ textAlign:'left', padding:'10px 14px', color:'#888', fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'1px solid #e3f2fd' }}>{h}</th>
        ))}</tr>
      </thead>
      <tbody>
        {orders.map(o => (
          <tr key={o.id} style={{ borderBottom:'1px solid #f0f8ff' }}>
            <td style={{ padding:'12px 14px', color:'#aaa', fontSize:'12px' }}>#{o.id.slice(-8).toUpperCase()}</td>
            <td style={{ padding:'12px 14px' }}>
              <p style={{ margin:0, color:'#000', fontSize:'13px', fontWeight:500 }}>{o.userName}</p>
              <p style={{ margin:0, color:'#aaa', fontSize:'11px' }}>{o.userEmail}</p>
            </td>
            <td style={{ padding:'12px 14px', color:'#555', fontSize:'13px' }}>{o.items?.length || 0} item(s)</td>
            <td style={{ padding:'12px 14px', color:'#2196F3', fontWeight:700, fontSize:'13px' }}>{formatPrice(o.total)}</td>
            <td style={{ padding:'12px 14px', color:'#aaa', fontSize:'12px' }}>{formatDate(o.createdAt)}</td>
            <td style={{ padding:'12px 14px' }}>
              <select
                style={{ background:'#f0f8ff', border:`1px solid ${STATUS_COLORS[o.status] || '#bbdefb'}`, borderRadius:'7px', color: STATUS_COLORS[o.status] || '#555', fontSize:'12px', padding:'5px 8px', cursor:'pointer' }}
                value={o.status || 'pending'}
                onChange={e => onStatus(o.id, e.target.value)}
              >
                {['pending','processing','shipped','delivered','cancelled'].map(st => (
                  <option key={st} value={st}>{st.charAt(0).toUpperCase() + st.slice(1)}</option>
                ))}
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const roleStyle = (role) => ({
  admin:  { background:'#fce4ec', color:'#c62828', border:'1px solid #ef9a9a' },
  seller: { background:'#e8f5e9', color:'#2e7d32', border:'1px solid #a5d6a7' },
  user:   { background:'#e3f2fd', color:'#1565C0', border:'1px solid #90caf9' },
}[role] || { background:'#e3f2fd', color:'#1565C0', border:'1px solid #90caf9' })

const s = {
  page: { background:'#fff', minHeight:'100vh', padding:'32px 0 64px' },
  container: { maxWidth:'1200px', margin:'0 auto', padding:'0 20px' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'16px', marginBottom:'24px' },
  title: { color:'#000', fontSize:'26px', fontWeight:700, margin:'0 0 4px' },
  sub: { color:'#777', fontSize:'14px', margin:0 },
  adminBadge: { display:'flex', alignItems:'center', gap:'6px', background:'#e3f2fd', color:'#1565C0', border:'1px solid #90caf9', borderRadius:'20px', padding:'6px 14px', fontSize:'13px', fontWeight:600 },
  tabBar: { display:'flex', gap:'4px', borderBottom:'1.5px solid #e3f2fd', marginBottom:'28px' },
  tab: { padding:'10px 20px', background:'none', border:'none', color:'#888', fontSize:'14px', cursor:'pointer', borderBottom:'2px solid transparent', marginBottom:'-1.5px', fontWeight:500 },
  tabActive: { color:'#2196F3', borderBottom:'2px solid #2196F3', fontWeight:700 },
  statsGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'16px', marginBottom:'28px' },
  statCard: { background:'#fff', border:'1px solid #e3f2fd', borderRadius:'14px', padding:'20px', display:'flex', flexDirection:'column', gap:'8px', boxShadow:'0 2px 10px rgba(33,150,243,0.06)' },
  statIcon: { width:'44px', height:'44px', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center' },
  statVal: { color:'#000', fontSize:'22px', fontWeight:700, margin:0 },
  statLabel: { color:'#777', fontSize:'12px', margin:0 },
  box: { background:'#fff', border:'1px solid #e3f2fd', borderRadius:'14px', padding:'20px', boxShadow:'0 2px 10px rgba(33,150,243,0.05)' },
  boxTitle: { color:'#000', fontSize:'16px', fontWeight:700, margin:'0 0 16px' },
  table: { width:'100%', borderCollapse:'collapse' },
  th: { textAlign:'left', padding:'10px 14px', color:'#888', fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'1px solid #e3f2fd' },
  tr: { borderBottom:'1px solid #f0f8ff' },
  td: { padding:'12px 14px', color:'#000', fontSize:'13px', verticalAlign:'middle' },
  avatar: { width:'30px', height:'30px', borderRadius:'50%', background:'#e3f2fd', color:'#2196F3', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:700, flexShrink:0 },
  roleBadge: { padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:600 },
  roleSelect: { background:'#f0f8ff', border:'1px solid #bbdefb', borderRadius:'7px', color:'#000', fontSize:'12px', padding:'5px 8px', cursor:'pointer' },
  pList: { display:'flex', flexDirection:'column', gap:'10px' },
  pRow: { display:'flex', alignItems:'center', gap:'14px', padding:'12px', background:'#f9fcff', border:'1px solid #e3f2fd', borderRadius:'10px' },
  pThumb: { width:'52px', height:'52px', objectFit:'cover', borderRadius:'8px', background:'#e3f2fd', flexShrink:0 },
  pInfo: { flex:1, minWidth:0 },
  pTitle: { color:'#000', fontSize:'13px', fontWeight:600, margin:'0 0 3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  pMeta: { color:'#888', fontSize:'11px', margin:'0 0 3px' },
  pPrice: { color:'#2196F3', fontSize:'13px', fontWeight:700, margin:0 },
  delBtn: { background:'#fff0f0', border:'1px solid #fecaca', borderRadius:'8px', color:'#e53935', cursor:'pointer', padding:'8px', display:'flex', flexShrink:0 },
}

export default AdminPanel
