// ============================================================
// AdminPanel — sidebar layout with 6 sections
// Dashboard | Users | Admins | Products | Orders | API Keys
// Protected: JWT role === 'admin'
// ============================================================

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  FiBarChart2, FiUsers, FiShield, FiPackage, FiShoppingBag, FiKey,
  FiTrash2, FiPlus, FiCopy, FiCheck, FiEye, FiEyeOff,
  FiMenu, FiX, FiLock, FiMail, FiUser, FiRefreshCw,
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { formatPrice, formatDate, STATUS_COLORS, imgFallback } from '../utils/helpers'
import { FullPageLoader } from '../components/Loader'
import toast from 'react-hot-toast'

const BASE      = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const TOKEN_KEY = 'megamartx_token'

const api = async (method, path, body) => {
  const token = localStorage.getItem(TOKEN_KEY)
  const opts  = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res  = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    const msg  = data?.error || res.statusText || 'Request failed'
    throw new Error(`${res.status} ${msg}`)
  }
  return res.json()
}

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: FiBarChart2  },
  { key: 'users',     label: 'Users',     icon: FiUsers      },
  { key: 'admins',    label: 'Admins',    icon: FiShield     },
  { key: 'products',  label: 'Products',  icon: FiPackage    },
  { key: 'orders',    label: 'Orders',    icon: FiShoppingBag },
  { key: 'apikeys',   label: 'API Keys',  icon: FiKey        },
]

const roleBadgeStyle = (role) => ({
  admin:  { background: '#fce4ec', color: '#c62828', border: '1px solid #ef9a9a' },
  seller: { background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7' },
  user:   { background: '#e3f2fd', color: '#1565c0', border: '1px solid #90caf9' },
}[role] || { background: '#e3f2fd', color: '#1565c0', border: '1px solid #90caf9' })

const METHOD_COLORS = {
  GET:    '#1565C0',
  POST:   '#2e7d32',
  PUT:    '#e65100',
  DELETE: '#c62828',
}

const API_DOCS = [
  {
    method:  'GET',
    path:    '/api/v1/ping',
    desc:    'Verify your key works',
    example: `curl http://localhost:5000/api/v1/ping \\
  -H "X-API-Key: YOUR_KEY"`,
  },
  {
    method:  'GET',
    path:    '/api/v1/products',
    desc:    'List products  (params: search, category, minPrice, maxPrice, limit, offset)',
    example: `curl "http://localhost:5000/api/v1/products?limit=10&search=phone" \\
  -H "X-API-Key: YOUR_KEY"`,
  },
  {
    method:  'GET',
    path:    '/api/v1/products/:id',
    desc:    'Get a single product by ID',
    example: `curl http://localhost:5000/api/v1/products/PRODUCT_ID \\
  -H "X-API-Key: YOUR_KEY"`,
  },
  {
    method:  'GET',
    path:    '/api/v1/orders',
    desc:    'List orders  (params: userId, status, limit, offset)',
    example: `curl "http://localhost:5000/api/v1/orders?status=pending" \\
  -H "X-API-Key: YOUR_KEY"`,
  },
  {
    method:  'GET',
    path:    '/api/v1/orders/:id',
    desc:    'Get a single order with all items',
    example: `curl http://localhost:5000/api/v1/orders/ORDER_ID \\
  -H "X-API-Key: YOUR_KEY"`,
  },
  {
    method:  'POST',
    path:    '/api/v1/orders',
    desc:    'Create a new order programmatically',
    example: `curl -X POST http://localhost:5000/api/v1/orders \\
  -H "X-API-Key: YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "userId":        "user-uid",
    "userName":      "John Doe",
    "userEmail":     "john@example.com",
    "address":       "123 Main St, City",
    "phone":         "+1 555 000 0000",
    "paymentMethod": "COD",
    "items": [
      { "productId": "pid", "title": "Widget", "price": 29.99,
        "quantity": 2, "imageUrl": "", "sellerName": "Shop A" }
    ]
  }'`,
  },
  {
    method:  'PUT',
    path:    '/api/v1/orders/:id/status',
    desc:    'Update order status  (pending · processing · shipped · delivered · cancelled)',
    example: `curl -X PUT http://localhost:5000/api/v1/orders/ORDER_ID/status \\
  -H "X-API-Key: YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "status": "shipped" }'`,
  },
]

// ── Main component ────────────────────────────────────────────
const AdminPanel = () => {
  const { currentUser } = useAuth()
  const [searchParams]  = useSearchParams()

  const [section,     setSection]     = useState(searchParams.get('section') || 'dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile,    setIsMobile]    = useState(window.innerWidth < 768)

  // Data per section
  const [stats,    setStats]    = useState(null)
  const [users,    setUsers]    = useState([])
  const [admins,   setAdmins]   = useState([])
  const [products, setProducts] = useState([])
  const [orders,   setOrders]   = useState([])
  const [apiKeys,  setApiKeys]  = useState([])

  const [usersError, setUsersError] = useState(null)

  const initSection = searchParams.get('section') || 'dashboard'
  const [loading, setLoading] = useState({
    stats: true,
    users:    initSection === 'users',
    admins:   initSection === 'admins',
    products: initSection === 'products',
    orders:   initSection === 'orders',
    apikeys:  initSection === 'apikeys',
  })
  const fetched = useRef(new Set())

  // Create-admin form
  const [adminForm,   setAdminForm]   = useState({ name: '', email: '', password: '' })
  const [showAdminPw, setShowAdminPw] = useState(false)
  const [adminBusy,   setAdminBusy]   = useState(false)

  // API Key
  const [keyLabel, setKeyLabel] = useState('')
  const [keyBusy,  setKeyBusy]  = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  // User filter
  const [roleFilter, setRoleFilter] = useState('all')

  // ── Responsive sidebar ──────────────────────────────────────
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setSidebarOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ── Fetch stats on mount ────────────────────────────────────
  useEffect(() => {
    api('GET', '/api/admin/stats')
      .then(d => { setStats(d); fetched.current.add('stats') })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(l => ({ ...l, stats: false })))
  }, [])

  // ── Load users (always fresh — no cache) ────────────────────
  const loadUsers = async () => {
    setLoading(l => ({ ...l, users: true }))
    setUsersError(null)
    try {
      const d = await api('GET', '/api/admin/users')
      setUsers(Array.isArray(d) ? d : [])
    } catch (err) {
      setUsersError(err.message)
      toast.error('Failed to load users: ' + err.message)
    } finally {
      setLoading(l => ({ ...l, users: false }))
    }
  }

  useEffect(() => {
    if (section === 'users') loadUsers()
  }, [section])

  // ── Lazy-fetch for other sections ───────────────────────────
  const fetchSection = async (name) => {
    if (name === 'users') return          // handled by loadUsers
    if (fetched.current.has(name)) return
    setLoading(l => ({ ...l, [name]: true }))
    try {
      switch (name) {
        case 'admins': {
          const d = await api('GET', '/api/admin/users?role=admin')
          setAdmins(d); break
        }
        case 'products': {
          const d = await api('GET', '/api/products')
          setProducts(d); break
        }
        case 'orders': {
          const d = await api('GET', '/api/orders')
          setOrders(d); break
        }
        case 'apikeys': {
          const d = await api('GET', '/api/admin/api-keys')
          setApiKeys(d); break
        }
        default: break
      }
      fetched.current.add(name)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(l => ({ ...l, [name]: false }))
    }
  }

  useEffect(() => {
    if (section !== 'dashboard' && section !== 'users') fetchSection(section)
  }, [section])

  const refreshSection = (name) => {
    if (name === 'users') { loadUsers(); return }
    fetched.current.delete(name)
    fetchSection(name)
  }

  const navTo = (s) => { setSection(s); setSidebarOpen(false) }

  // ── Handlers ────────────────────────────────────────────────
  const handleRoleChange = async (uid, role) => {
    try {
      await api('PUT', `/api/admin/users/${uid}/role`, { role })
      setUsers(u => u.map(x => x.uid === uid ? { ...x, role } : x))
      setAdmins(a => a.filter(x => x.uid !== uid))
      toast.success('Role updated')
    } catch (err) { toast.error(err.message) }
  }

  const handleDeleteUser = async (uid, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return
    try {
      await api('DELETE', `/api/admin/users/${uid}`)
      setUsers(u => u.filter(x => x.uid !== uid))
      setAdmins(a => a.filter(x => x.uid !== uid))
      toast.success('User deleted')
    } catch (err) { toast.error(err.message) }
  }

  const handleCreateAdmin = async (e) => {
    e.preventDefault()
    const { name, email, password } = adminForm
    if (!name || !email || !password) { toast.error('All fields are required'); return }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setAdminBusy(true)
    try {
      const newAdmin = await api('POST', '/api/admin/create-admin', adminForm)
      setAdmins(a => [newAdmin, ...a])
      setAdminForm({ name: '', email: '', password: '' })
      // Refresh stats
      const fresh = await api('GET', '/api/admin/stats')
      setStats(fresh)
      toast.success(`Admin "${name}" created`)
    } catch (err) { toast.error(err.message) }
    finally { setAdminBusy(false) }
  }

  const handleDeleteProduct = async (p) => {
    if (!window.confirm(`Delete "${p.title}"?`)) return
    try {
      await api('DELETE', `/api/products/${p.id}`)
      setProducts(x => x.filter(i => i.id !== p.id))
      toast.success('Product deleted')
    } catch (err) { toast.error(err.message) }
  }

  const handleOrderStatus = async (id, status) => {
    try {
      await api('PUT', `/api/orders/${id}/status`, { status })
      setOrders(o => o.map(x => x.id === id ? { ...x, status } : x))
      toast.success('Status updated')
    } catch (err) { toast.error(err.message) }
  }

  const handleGenerateKey = async () => {
    setKeyBusy(true)
    try {
      const key = await api('POST', '/api/admin/api-keys', { label: keyLabel })
      setApiKeys(k => [key, ...k])
      setKeyLabel('')
      toast.success('API key generated')
    } catch (err) { toast.error(err.message) }
    finally { setKeyBusy(false) }
  }

  const handleDeleteKey = async (id) => {
    if (!window.confirm('Delete this API key? Any services using it will lose access.')) return
    try {
      await api('DELETE', `/api/admin/api-keys/${id}`)
      setApiKeys(k => k.filter(x => x.id !== id))
      toast.success('API key deleted')
    } catch (err) { toast.error(err.message) }
  }

  const handleCopyKey = (id, key) => {
    navigator.clipboard.writeText(key).catch(() => {})
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    toast.success('Copied to clipboard')
  }

  if (loading.stats && !stats) return <FullPageLoader />

  const filteredUsers = roleFilter === 'all'
    ? users
    : users.filter(u => u.role === roleFilter)

  const sidebarStyle = isMobile
    ? { ...s.sidebar, ...s.sidebarFixed, ...(sidebarOpen ? s.sidebarSlideIn : {}) }
    : { ...s.sidebar, ...s.sidebarDesktop }

  const currentNav = NAV.find(n => n.key === section)

  // ── Render ──────────────────────────────────────────────────
  return (
    <div style={{ ...s.shell, ...(isMobile ? {} : s.shellDesktop) }}>
      <style>{`
        @keyframes spin    { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes shimmer { from { background-position: 200% 0 } to { background-position: -200% 0 } }
      `}</style>

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div style={s.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside style={sidebarStyle}>
        <div style={s.sidebarLogo}>
          <FiShield size={18} color="#2196F3" />
          <span style={s.sidebarLogoText}>Admin Panel</span>
          {isMobile && (
            <button style={s.sidebarClose} onClick={() => setSidebarOpen(false)}>
              <FiX size={18} />
            </button>
          )}
        </div>

        <nav style={s.sidebarNav}>
          {NAV.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              style={{ ...s.navItem, ...(section === key ? s.navItemActive : {}) }}
              onClick={() => navTo(key)}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div style={s.sidebarFooter}>
          <div style={s.sidebarUser}>
            <div style={s.sidebarAvatar}>
              {currentUser?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={s.sidebarUserName}>{currentUser?.name || 'Admin'}</p>
              <p style={s.sidebarUserRole}>Administrator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={s.main}>

        {/* Top bar */}
        <div style={s.topBar}>
          <button style={s.hamburger} onClick={() => setSidebarOpen(p => !p)}>
            <FiMenu size={20} />
          </button>
          <h1 style={s.pageTitle}>{currentNav?.label || 'Admin'}</h1>
          <div style={s.adminBadge}><FiShield size={12} /> Admin</div>
        </div>

        {/* ─── Dashboard ───────────────────────────────────────── */}
        {section === 'dashboard' && (
          <div style={s.content}>
            <div style={s.statsGrid}>
              {[
                { label: 'Total Users',    val: stats?.totalUsers    ?? 0, color: '#2196F3', bg: '#e3f2fd' },
                { label: 'Sellers',        val: stats?.totalSellers  ?? 0, color: '#10b981', bg: '#d1fae5' },
                { label: 'Buyers',         val: stats?.totalBuyers   ?? 0, color: '#f59e0b', bg: '#fef3c7' },
                { label: 'Admins',         val: stats?.totalAdmins   ?? 0, color: '#ef4444', bg: '#fee2e2' },
                { label: 'Products',       val: stats?.totalProducts ?? 0, color: '#8b5cf6', bg: '#ede9fe' },
                { label: 'Orders',         val: stats?.totalOrders   ?? 0, color: '#0891b2', bg: '#e0f2fe' },
              ].map(({ label, val, color, bg }) => (
                <div key={label} style={s.statCard}>
                  <div style={{ ...s.statIconBox, background: bg }}>
                    <span style={{ ...s.statVal, color }}>{val}</span>
                  </div>
                  <p style={s.statLabel}>{label}</p>
                </div>
              ))}
            </div>

            {/* Revenue highlight */}
            <div style={s.revenueCard}>
              <div>
                <p style={s.revenueLabel}>Total Revenue</p>
                <p style={s.revenueVal}>{formatPrice(stats?.totalRevenue ?? 0)}</p>
              </div>
              <FiShoppingBag size={36} color="rgba(255,255,255,0.5)" />
            </div>
          </div>
        )}

        {/* ─── Users ───────────────────────────────────────────── */}
        {section === 'users' && (
          <div style={s.content}>

            {/* Section header */}
            <div style={s.sectionHeader}>
              <div>
                <h2 style={s.sectionTitle}>Registered Users</h2>
                <p style={s.sectionSub}>
                  {stats
                    ? `${stats.totalUsers} total · ${stats.totalBuyers} buyers · ${stats.totalSellers} sellers · ${stats.totalAdmins} admins`
                    : 'Loading counts…'}
                </p>
              </div>
              <button
                style={s.refreshBtn}
                onClick={() => refreshSection('users')}
                disabled={loading.users}
                title="Reload user list"
              >
                <FiRefreshCw size={14} style={{ animation: loading.users ? 'spin 1s linear infinite' : 'none' }} />
                {loading.users ? 'Loading…' : 'Refresh'}
              </button>
            </div>

            {/* Role breakdown cards — always visible from stats */}
            <div style={s.roleCards}>
              {[
                { label: 'Total Users',  val: stats?.totalUsers   ?? '…', color: '#1565C0', bg: '#e3f2fd', border: '#90caf9' },
                { label: 'Buyers',       val: stats?.totalBuyers  ?? '…', color: '#2e7d32', bg: '#e8f5e9', border: '#a5d6a7' },
                { label: 'Sellers',      val: stats?.totalSellers ?? '…', color: '#e65100', bg: '#fff3e0', border: '#ffcc80' },
                { label: 'Admins',       val: stats?.totalAdmins  ?? '…', color: '#c62828', bg: '#fce4ec', border: '#ef9a9a' },
              ].map(({ label, val, color, bg, border }) => (
                <div key={label} style={{ ...s.roleCard, background: bg, border: `1.5px solid ${border}` }}>
                  <span style={{ ...s.roleCardVal, color }}>{val}</span>
                  <span style={{ ...s.roleCardLabel, color }}>{label}</span>
                </div>
              ))}
            </div>

            {/* Role filter */}
            <div style={s.filterBar}>
              <span style={s.filterLabel}>Filter:</span>
              {['all', 'user', 'seller', 'admin'].map(r => (
                <button
                  key={r}
                  style={{ ...s.filterBtn, ...(roleFilter === r ? s.filterBtnActive : {}) }}
                  onClick={() => setRoleFilter(r)}
                >
                  {r === 'all' ? 'All' : r.charAt(0).toUpperCase() + r.slice(1)}
                  {r !== 'all' && (
                    <span style={{ ...s.filterCount, ...(roleFilter === r ? { background: 'rgba(255,255,255,0.3)' } : {}) }}>
                      {users.filter(u => u.role === r).length}
                    </span>
                  )}
                </button>
              ))}
              <span style={{ marginLeft: 'auto', color: '#aaa', fontSize: '12px' }}>
                {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Error state */}
            {usersError && !loading.users && (
              <div style={s.errorCard}>
                <div style={{ flex: 1 }}>
                  <strong>Failed to load user list:</strong> {usersError}
                  {usersError.toLowerCase().includes('not found') && (
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#b71c1c' }}>
                      The server may need a restart — run <code style={{ background: '#ffd7d7', padding: '1px 5px', borderRadius: '3px' }}>node server/index.js</code> again.
                    </p>
                  )}
                </div>
                <button style={s.retryBtn} onClick={loadUsers}>Retry</button>
              </div>
            )}

            {/* Loading skeleton */}
            {loading.users && (
              <div style={s.skeletonWrap}>
                {[1,2,3,4].map(i => (
                  <div key={i} style={s.skeletonRow}>
                    <div style={{ ...s.skeleton, width: '32px', height: '32px', borderRadius: '50%' }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ ...s.skeleton, width: '140px', height: '12px' }} />
                      <div style={{ ...s.skeleton, width: '200px', height: '10px' }} />
                    </div>
                    <div style={{ ...s.skeleton, width: '60px', height: '22px', borderRadius: '20px' }} />
                    <div style={{ ...s.skeleton, width: '80px', height: '12px' }} />
                    <div style={{ ...s.skeleton, width: '90px', height: '28px' }} />
                  </div>
                ))}
              </div>
            )}

            {/* Data table */}
            {!loading.users && !usersError && (
              <div style={{ overflowX: 'auto' }}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {['User', 'Email', 'Role', 'Joined', 'Change Role', ''].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.uid} style={s.tr}>
                        <td style={s.td}>
                          <div style={s.userCell}>
                            <div style={s.avatar}>{u.name?.[0]?.toUpperCase() || '?'}</div>
                            <span style={{ fontWeight: 500 }}>{u.name || 'N/A'}</span>
                          </div>
                        </td>
                        <td style={s.td}>{u.email}</td>
                        <td style={s.td}>
                          <span style={{ ...s.badge, ...roleBadgeStyle(u.role) }}>{u.role || 'user'}</span>
                        </td>
                        <td style={s.td}>{formatDate(u.createdAt)}</td>
                        <td style={s.td}>
                          <select
                            style={s.select}
                            value={u.role || 'user'}
                            onChange={e => handleRoleChange(u.uid, e.target.value)}
                            disabled={u.uid === currentUser?.uid}
                          >
                            <option value="user">User</option>
                            <option value="seller">Seller</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td style={s.td}>
                          {u.uid !== currentUser?.uid && (
                            <button style={s.deleteBtn} onClick={() => handleDeleteUser(u.uid, u.name)}>
                              <FiTrash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={6} style={s.emptyCell}>
                          {users.length === 0 ? 'No users registered yet' : 'No users match this filter'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── Admins ──────────────────────────────────────────── */}
        {section === 'admins' && (
          <div style={{ ...s.content, ...s.twoCol }}>

            {/* Create admin form */}
            <div style={s.card}>
              <h3 style={s.cardTitle}><FiPlus size={15} /> Create Admin Account</h3>
              <form onSubmit={handleCreateAdmin} style={s.form}>
                <div style={s.field}>
                  <label style={s.label}>Full Name</label>
                  <div style={s.inputWrap}>
                    <FiUser size={14} color="#2196F3" />
                    <input
                      style={s.input}
                      placeholder="Admin Name"
                      value={adminForm.name}
                      onChange={e => setAdminForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Email Address</label>
                  <div style={s.inputWrap}>
                    <FiMail size={14} color="#2196F3" />
                    <input
                      style={s.input}
                      type="email"
                      placeholder="admin@megamartx.com"
                      value={adminForm.email}
                      onChange={e => setAdminForm(f => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Password</label>
                  <div style={s.inputWrap}>
                    <FiLock size={14} color="#2196F3" />
                    <input
                      style={s.input}
                      type={showAdminPw ? 'text' : 'password'}
                      placeholder="Min. 6 characters"
                      value={adminForm.password}
                      onChange={e => setAdminForm(f => ({ ...f, password: e.target.value }))}
                    />
                    <button type="button" style={s.eyeBtn} onClick={() => setShowAdminPw(p => !p)}>
                      {showAdminPw ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  style={{ ...s.primaryBtn, opacity: adminBusy ? 0.7 : 1 }}
                  disabled={adminBusy}
                >
                  {adminBusy ? 'Creating…' : 'Create Admin Account'}
                </button>
              </form>
            </div>

            {/* Admin list */}
            <div style={s.card}>
              <h3 style={s.cardTitle}><FiShield size={15} /> All Admins ({admins.length})</h3>
              {loading.admins ? (
                <p style={s.loadingMsg}>Loading…</p>
              ) : admins.length === 0 ? (
                <p style={s.emptyMsg}>No admin accounts found</p>
              ) : (
                <div style={s.adminList}>
                  {admins.map(a => (
                    <div key={a.uid} style={s.adminRow}>
                      <div style={s.avatar}>{a.name?.[0]?.toUpperCase() || 'A'}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={s.adminName}>{a.name}</p>
                        <p style={s.adminEmail}>{a.email}</p>
                      </div>
                      <span style={{ ...s.badge, ...roleBadgeStyle('admin') }}>admin</span>
                      {a.uid !== currentUser?.uid && (
                        <button style={s.deleteBtn} onClick={() => handleDeleteUser(a.uid, a.name)}>
                          <FiTrash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Products ────────────────────────────────────────── */}
        {section === 'products' && (
          <div style={s.content}>
            {loading.products ? (
              <p style={s.loadingMsg}>Loading products…</p>
            ) : products.length === 0 ? (
              <div style={s.emptyCard}>No products listed yet</div>
            ) : (
              <>
                <p style={s.sectionCount}>{products.length} product{products.length !== 1 ? 's' : ''}</p>
                <div style={s.productGrid}>
                  {products.map(p => (
                    <div key={p.id} style={s.productCard}>
                      <img
                        src={p.imageUrl || imgFallback(200, 140)}
                        alt={p.title}
                        style={s.productImg}
                        onError={e => { e.target.src = imgFallback(200, 140) }}
                      />
                      <div style={s.productInfo}>
                        <p style={s.productTitle}>{p.title}</p>
                        <p style={s.productMeta}>{p.category} · {p.sellerName}</p>
                        <div style={s.productBottom}>
                          <span style={s.productPrice}>{formatPrice(p.price)}</span>
                          <span style={s.stockBadge}>Stock: {p.stock}</span>
                        </div>
                        <button style={s.deleteProductBtn} onClick={() => handleDeleteProduct(p)}>
                          <FiTrash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── Orders ──────────────────────────────────────────── */}
        {section === 'orders' && (
          <div style={s.content}>
            {loading.orders ? (
              <p style={s.loadingMsg}>Loading orders…</p>
            ) : orders.length === 0 ? (
              <div style={s.emptyCard}>No orders placed yet</div>
            ) : (
              <>
                <p style={s.sectionCount}>{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
                <div style={{ overflowX: 'auto' }}>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        {['Order ID', 'Customer', 'Items', 'Total', 'Payment', 'Date', 'Status'].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(o => (
                        <tr key={o.id} style={s.tr}>
                          <td style={s.td}>
                            <span style={s.mono}>#{o.id.slice(-8).toUpperCase()}</span>
                          </td>
                          <td style={s.td}>
                            <p style={{ margin: 0, fontWeight: 500, fontSize: '13px' }}>{o.userName}</p>
                            <p style={{ margin: 0, color: '#aaa', fontSize: '11px' }}>{o.userEmail}</p>
                          </td>
                          <td style={s.td}>{o.items?.length || 0}</td>
                          <td style={s.td}>
                            <span style={{ color: '#2196F3', fontWeight: 700 }}>{formatPrice(o.total)}</span>
                          </td>
                          <td style={s.td}>
                            <span style={{
                              ...s.badge,
                              background: o.paymentMethod === 'CARD' ? '#e3f2fd' : '#e8f5e9',
                              color:      o.paymentMethod === 'CARD' ? '#1565c0' : '#2e7d32',
                              border:     `1px solid ${o.paymentMethod === 'CARD' ? '#90caf9' : '#a5d6a7'}`,
                            }}>
                              {o.paymentMethod === 'CARD' ? '💳 Card' : '📦 COD'}
                            </span>
                          </td>
                          <td style={s.td}>{formatDate(o.createdAt)}</td>
                          <td style={s.td}>
                            <select
                              style={{
                                ...s.select,
                                color:  STATUS_COLORS[o.status] || '#555',
                                border: `1px solid ${STATUS_COLORS[o.status] || '#bbdefb'}`,
                              }}
                              value={o.status || 'pending'}
                              onChange={e => handleOrderStatus(o.id, e.target.value)}
                            >
                              {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(st => (
                                <option key={st} value={st}>{st.charAt(0).toUpperCase() + st.slice(1)}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── API Keys ────────────────────────────────────────── */}
        {section === 'apikeys' && (
          <div style={s.content}>

            {/* Generate row */}
            <div style={s.card}>
              <h3 style={s.cardTitle}><FiKey size={15} /> Generate New API Key</h3>
              <div style={s.keyGenRow}>
                <div style={{ ...s.inputWrap, flex: 1 }}>
                  <FiKey size={14} color="#2196F3" />
                  <input
                    style={s.input}
                    placeholder="Key label (e.g. Mobile App, Partner API)"
                    value={keyLabel}
                    onChange={e => setKeyLabel(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleGenerateKey()}
                  />
                </div>
                <button
                  style={{ ...s.primaryBtn, opacity: keyBusy ? 0.7 : 1, whiteSpace: 'nowrap' }}
                  onClick={handleGenerateKey}
                  disabled={keyBusy}
                >
                  <FiRefreshCw size={14} />
                  {keyBusy ? 'Generating…' : 'Generate Key'}
                </button>
              </div>
            </div>

            {/* Keys table */}
            {loading.apikeys ? (
              <p style={s.loadingMsg}>Loading API keys…</p>
            ) : apiKeys.length === 0 ? (
              <div style={s.emptyCard}>No API keys yet — generate one above.</div>
            ) : (
              <div style={{ overflowX: 'auto', marginTop: '16px' }}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {['#', 'Label', 'API Key', 'Created', 'Actions'].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {apiKeys.map((k, i) => (
                      <tr key={k.id} style={s.tr}>
                        <td style={{ ...s.td, color: '#aaa', width: '36px' }}>{i + 1}</td>
                        <td style={s.td}>
                          {k.label
                            ? <span style={{ fontWeight: 500 }}>{k.label}</span>
                            : <span style={{ color: '#aaa', fontStyle: 'italic' }}>No label</span>
                          }
                        </td>
                        <td style={s.td}>
                          <div style={s.keyCell}>
                            <code style={s.keyCode}>{k.apiKey}</code>
                            <button
                              style={s.copyBtn}
                              onClick={() => handleCopyKey(k.id, k.apiKey)}
                              title="Copy key"
                            >
                              {copiedId === k.id
                                ? <FiCheck size={13} color="#10b981" />
                                : <FiCopy  size={13} />
                              }
                            </button>
                          </div>
                        </td>
                        <td style={s.td}>{formatDate(k.createdAt)}</td>
                        <td style={s.td}>
                          <button style={s.deleteBtn} onClick={() => handleDeleteKey(k.id)}>
                            <FiTrash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── API Reference docs ───────────────────────────── */}
            <div style={{ marginTop: '28px' }}>
              <h3 style={{ color: '#000', fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>
                How to use your API key
              </h3>
              <p style={{ color: '#777', fontSize: '13px', margin: '0 0 16px' }}>
                Send your key in the <code style={s.inlineCode}>X-API-Key</code> header with every request.
                Base URL: <code style={s.inlineCode}>http://localhost:5000</code>
              </p>

              {API_DOCS.map(doc => (
                <div key={doc.path} style={s.docBlock}>
                  <div style={s.docHead}>
                    <span style={{ ...s.methodBadge, background: METHOD_COLORS[doc.method] }}>
                      {doc.method}
                    </span>
                    <code style={s.docPath}>{doc.path}</code>
                    <span style={s.docDesc}>{doc.desc}</span>
                  </div>

                  <pre style={s.docPre}>{doc.example}</pre>
                </div>
              ))}
            </div>

          </div>
        )}
      </main>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────
const SIDEBAR_W = '240px'

const s = {
  // Shell
  shell: {
    display: 'flex',
    minHeight: 'calc(100vh - 66px)',
    background: '#f8faff',
    position: 'relative',
  },
  shellDesktop: {},

  // Overlay (mobile)
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.35)',
    zIndex: 299,
  },

  // Sidebar shared
  sidebar: {
    width: SIDEBAR_W,
    background: '#fff',
    borderRight: '1px solid #e3f2fd',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '2px 0 12px rgba(33,150,243,0.06)',
    flexShrink: 0,
  },
  // Desktop: in-flow
  sidebarDesktop: {
    position: 'sticky',
    top: '66px',
    height: 'calc(100vh - 66px)',
    overflowY: 'auto',
  },
  // Mobile: fixed off-screen
  sidebarFixed: {
    position: 'fixed',
    top: 0, left: 0, bottom: 0,
    zIndex: 300,
    transform: 'translateX(-100%)',
    transition: 'transform .25s ease',
  },
  sidebarSlideIn: { transform: 'translateX(0)' },

  sidebarLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '18px 18px 14px',
    borderBottom: '1px solid #e3f2fd',
    fontWeight: 800,
    fontSize: '15px',
    color: '#000',
  },
  sidebarLogoText: { flex: 1, color: '#000', fontWeight: 800 },
  sidebarClose: {
    background: 'none', border: 'none', color: '#888',
    cursor: 'pointer', padding: '4px', display: 'flex',
  },
  sidebarNav: {
    flex: 1,
    padding: '10px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '10px',
    width: '100%', padding: '10px 13px',
    background: 'none', border: 'none',
    borderRadius: '9px', color: '#555',
    fontSize: '13px', fontWeight: 500,
    cursor: 'pointer', textAlign: 'left',
    transition: 'background .15s, color .15s',
  },
  navItemActive: {
    background: '#e3f2fd', color: '#2196F3', fontWeight: 700,
  },
  sidebarFooter: {
    padding: '12px 14px',
    borderTop: '1px solid #e3f2fd',
  },
  sidebarUser: { display: 'flex', alignItems: 'center', gap: '10px' },
  sidebarAvatar: {
    width: '32px', height: '32px', borderRadius: '50%',
    background: '#2196F3', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '13px', fontWeight: 700, flexShrink: 0,
  },
  sidebarUserName: { color: '#000', fontSize: '12px', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sidebarUserRole: { color: '#aaa', fontSize: '11px', margin: '1px 0 0' },

  // Main content
  main: {
    flex: 1, minWidth: 0,
    paddingBottom: '60px',
  },
  topBar: {
    position: 'sticky', top: 0, zIndex: 100,
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '0 20px', height: '58px',
    background: '#fff',
    borderBottom: '1px solid #e3f2fd',
    boxShadow: '0 2px 8px rgba(33,150,243,0.05)',
  },
  hamburger: {
    background: 'none', border: 'none',
    color: '#555', cursor: 'pointer',
    padding: '6px', borderRadius: '8px',
    display: 'flex', flexShrink: 0,
  },
  pageTitle: {
    flex: 1, color: '#000',
    fontSize: '17px', fontWeight: 700, margin: 0,
  },
  adminBadge: {
    display: 'flex', alignItems: 'center', gap: '5px',
    background: '#e3f2fd', color: '#1565c0',
    border: '1px solid #90caf9', borderRadius: '20px',
    padding: '5px 12px', fontSize: '12px', fontWeight: 600,
    whiteSpace: 'nowrap',
  },

  content: { padding: '20px' },

  // Dashboard stats
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '14px',
    marginBottom: '16px',
  },
  statCard: {
    background: '#fff',
    border: '1px solid #e3f2fd',
    borderRadius: '14px',
    padding: '18px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    boxShadow: '0 2px 8px rgba(33,150,243,0.05)',
  },
  statIconBox: {
    width: '52px', height: '52px',
    borderRadius: '12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  statVal:   { fontSize: '22px', fontWeight: 800, margin: 0, lineHeight: 1 },
  statLabel: { color: '#777', fontSize: '12px', margin: 0 },

  revenueCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'linear-gradient(135deg, #2196F3 0%, #1565C0 100%)',
    borderRadius: '16px',
    padding: '22px 24px',
    boxShadow: '0 6px 20px rgba(33,150,243,0.3)',
  },
  revenueLabel: { color: 'rgba(255,255,255,0.8)', fontSize: '13px', margin: '0 0 6px', fontWeight: 500 },
  revenueVal:   { color: '#fff', fontSize: '30px', fontWeight: 800, margin: 0 },

  // Role breakdown cards
  roleCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    marginBottom: '20px',
  },
  roleCard: {
    borderRadius: '12px',
    padding: '16px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  roleCardVal:   { fontSize: '28px', fontWeight: 800, lineHeight: 1 },
  roleCardLabel: { fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8 },

  // Section header (title + refresh)
  sectionHeader: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: '18px', gap: '12px', flexWrap: 'wrap',
  },
  sectionTitle: { color: '#000', fontSize: '18px', fontWeight: 700, margin: 0 },
  sectionSub:   { color: '#888', fontSize: '12px', margin: '4px 0 0' },
  refreshBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '7px 14px',
    background: '#f0f8ff', border: '1.5px solid #bbdefb',
    borderRadius: '8px', color: '#1565C0',
    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
    whiteSpace: 'nowrap', flexShrink: 0,
  },

  // Filter bar
  filterBar: {
    display: 'flex', alignItems: 'center',
    gap: '8px', marginBottom: '16px', flexWrap: 'wrap',
  },
  filterLabel:     { color: '#555', fontSize: '13px', fontWeight: 500 },
  filterBtn: {
    display: 'flex', alignItems: 'center', gap: '5px',
    padding: '6px 14px',
    background: '#f0f8ff', border: '1.5px solid #e3f2fd',
    borderRadius: '20px', color: '#555',
    fontSize: '12px', fontWeight: 500, cursor: 'pointer',
  },
  filterBtnActive: { background: '#2196F3', color: '#fff', borderColor: '#2196F3' },
  filterCount: {
    background: 'rgba(0,0,0,0.08)',
    borderRadius: '10px', padding: '1px 6px', fontSize: '11px',
  },

  // Table
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '580px' },
  th: {
    textAlign: 'left', padding: '10px 14px',
    color: '#888', fontSize: '11px',
    textTransform: 'uppercase', letterSpacing: '0.5px',
    borderBottom: '1.5px solid #e3f2fd', whiteSpace: 'nowrap',
  },
  tr:       { borderBottom: '1px solid #f0f8ff' },
  td:       { padding: '11px 14px', color: '#000', fontSize: '13px', verticalAlign: 'middle' },
  userCell: { display: 'flex', alignItems: 'center', gap: '10px' },
  avatar: {
    width: '30px', height: '30px', borderRadius: '50%',
    background: '#e3f2fd', color: '#2196F3',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', fontWeight: 700, flexShrink: 0,
  },
  badge: {
    display: 'inline-block',
    padding: '3px 10px', borderRadius: '20px',
    fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap',
  },
  select: {
    background: '#f0f8ff', border: '1px solid #bbdefb',
    borderRadius: '7px', color: '#000',
    fontSize: '12px', padding: '5px 8px', cursor: 'pointer',
  },
  deleteBtn: {
    background: '#fff0f0', border: '1px solid #fecaca',
    borderRadius: '7px', color: '#e53935',
    cursor: 'pointer', padding: '6px', display: 'flex',
  },
  emptyCell: { padding: '28px', textAlign: 'center', color: '#aaa', fontSize: '13px' },

  // Error + skeleton
  errorCard: {
    display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
    background: '#fff0f0', border: '1px solid #fecaca',
    borderRadius: '10px', padding: '14px 16px',
    color: '#c62828', fontSize: '13px', marginBottom: '14px',
  },
  retryBtn: {
    marginLeft: 'auto', padding: '6px 14px',
    background: '#e53935', color: '#fff',
    border: 'none', borderRadius: '7px',
    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
  },
  skeletonWrap: { display: 'flex', flexDirection: 'column', gap: '10px' },
  skeletonRow: {
    display: 'flex', alignItems: 'center', gap: '16px',
    padding: '10px 14px',
    background: '#fff', border: '1px solid #f0f8ff', borderRadius: '8px',
  },
  skeleton: {
    background: 'linear-gradient(90deg, #e3f2fd 25%, #bbdefb 50%, #e3f2fd 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
    borderRadius: '4px',
    flexShrink: 0,
  },
  emptyCard: {
    background: '#f0f8ff', border: '1px solid #e3f2fd',
    borderRadius: '12px', padding: '36px',
    textAlign: 'center', color: '#aaa', fontSize: '14px',
  },
  emptyMsg:    { color: '#aaa', fontSize: '13px', textAlign: 'center', padding: '20px 0', margin: 0 },
  loadingMsg:  { color: '#aaa', fontSize: '13px', textAlign: 'center', padding: '28px', margin: 0 },
  sectionCount: { color: '#555', fontSize: '13px', margin: '0 0 14px' },
  mono: { fontFamily: 'monospace', fontSize: '12px', color: '#555' },

  // Admin section
  twoCol: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
    gap: '18px',
  },
  card: {
    background: '#fff', border: '1px solid #e3f2fd',
    borderRadius: '14px', padding: '20px',
    boxShadow: '0 2px 8px rgba(33,150,243,0.05)',
  },
  cardTitle: {
    color: '#000', fontSize: '14px', fontWeight: 700,
    margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '7px',
  },
  form:  { display: 'flex', flexDirection: 'column', gap: '13px' },
  field: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { color: '#000', fontSize: '12px', fontWeight: 600 },
  inputWrap: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: '#f0f8ff', border: '1.5px solid #bbdefb',
    borderRadius: '9px', padding: '0 10px',
  },
  input: {
    flex: 1, background: 'none', border: 'none', outline: 'none',
    color: '#000', fontSize: '13px', padding: '10px 0',
  },
  eyeBtn: {
    background: 'none', border: 'none', color: '#aaa',
    cursor: 'pointer', display: 'flex', padding: 0, flexShrink: 0,
  },
  primaryBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
    padding: '11px 18px',
    background: 'linear-gradient(135deg, #2196F3 0%, #1565C0 100%)',
    color: '#fff', border: 'none', borderRadius: '9px',
    fontSize: '13px', fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 3px 10px rgba(33,150,243,0.25)',
  },
  adminList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  adminRow: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 12px',
    background: '#f9fcff', border: '1px solid #e3f2fd',
    borderRadius: '10px',
  },
  adminName:  { color: '#000', fontSize: '13px', fontWeight: 600, margin: 0 },
  adminEmail: { color: '#aaa', fontSize: '11px', margin: '2px 0 0' },

  // Products
  productGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
    gap: '14px',
  },
  productCard: {
    background: '#fff', border: '1px solid #e3f2fd',
    borderRadius: '12px', overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(33,150,243,0.05)',
  },
  productImg:    { width: '100%', height: '130px', objectFit: 'cover', background: '#e3f2fd', display: 'block' },
  productInfo:   { padding: '12px' },
  productTitle:  { color: '#000', fontSize: '13px', fontWeight: 600, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  productMeta:   { color: '#aaa', fontSize: '11px', margin: '0 0 8px' },
  productBottom: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' },
  productPrice:  { color: '#2196F3', fontSize: '14px', fontWeight: 700 },
  stockBadge:    { color: '#555', fontSize: '11px', background: '#f0f8ff', padding: '2px 7px', borderRadius: '6px' },
  deleteProductBtn: {
    display: 'flex', alignItems: 'center', gap: '5px',
    width: '100%', padding: '7px 10px',
    background: '#fff0f0', border: '1px solid #fecaca',
    borderRadius: '7px', color: '#e53935',
    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
    justifyContent: 'center',
  },

  // API Keys
  keyGenRow: {
    display: 'flex', gap: '10px',
    flexWrap: 'wrap',
  },
  keyCell: { display: 'flex', alignItems: 'center', gap: '8px' },
  keyCode: {
    background: '#f0f8ff', border: '1px solid #e3f2fd',
    borderRadius: '6px', padding: '4px 8px',
    fontSize: '11px', fontFamily: 'monospace', color: '#1565c0',
    maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis',
    whiteSpace: 'nowrap', display: 'block',
  },
  copyBtn: {
    background: '#f0f8ff', border: '1px solid #e3f2fd',
    borderRadius: '6px', cursor: 'pointer',
    padding: '5px', display: 'flex', flexShrink: 0, color: '#555',
  },

  // API Docs
  inlineCode: {
    background: '#f0f8ff', border: '1px solid #e3f2fd',
    borderRadius: '4px', padding: '1px 6px',
    fontSize: '12px', fontFamily: 'monospace', color: '#1565C0',
  },
  docBlock: {
    marginBottom: '14px',
    border: '1px solid #e3f2fd',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  docHead: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 14px',
    background: '#f8faff',
    borderBottom: '1px solid #e3f2fd',
    flexWrap: 'wrap',
  },
  methodBadge: {
    color: '#fff', fontSize: '11px', fontWeight: 800,
    padding: '3px 9px', borderRadius: '5px',
    letterSpacing: '0.5px', flexShrink: 0,
  },
  docPath: {
    fontFamily: 'monospace', fontSize: '13px', fontWeight: 600,
    color: '#000', flexShrink: 0,
  },
  docDesc: { color: '#666', fontSize: '12px' },
  docPre: {
    margin: 0,
    padding: '12px 16px',
    background: '#0d1117',
    color: '#e6edf3',
    fontSize: '12px',
    fontFamily: 'monospace',
    lineHeight: 1.7,
    overflowX: 'auto',
    whiteSpace: 'pre',
  },
}

export default AdminPanel
