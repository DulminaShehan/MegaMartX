// ============================================================
// Seller Dashboard — Sidebar layout
// Sections: Dashboard (stats) | Add Product | My Products | Orders
// Image upload via multer  ·  API calls via axios
// ============================================================

import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import {
  FiGrid, FiPlus, FiPackage, FiShoppingBag,
  FiEdit2, FiTrash2, FiUpload, FiX, FiCheck,
  FiDollarSign, FiPercent, FiTag, FiInfo, FiLayers,
  FiTruck, FiClock, FiAlertCircle, FiBox,
  FiChevronDown, FiChevronUp, FiLogOut, FiImage,
  FiGlobe, FiSave, FiMapPin, FiExternalLink, FiBarChart2,
  FiTrendingUp, FiAward,
} from 'react-icons/fi'
import {
  addProduct, updateProduct, deleteProduct,
  getSellerProducts, getSellerOrders, updateOrderStatus,
  getStoreProfile, updateStoreProfile, getSellerAnalytics,
  getProductById, uploadMultipleImages,
} from '../firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { formatPrice, formatDate, CATEGORIES, STATUS_COLORS, imgFallback } from '../utils/helpers'
import { FullPageLoader } from '../components/Loader'
import toast from 'react-hot-toast'

const API    = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const CATS   = CATEGORIES.filter(c => c !== 'All')

// ── Blank form state ──────────────────────────────────────────
const BLANK = {
  name: '', description: '', category: 'Electronics',
  price: '', discount: '', stock: '',
  colors: [],         // e.g. ['Red', 'Blue']
  sizes:  [],         // e.g. ['S', 'M', 'L']
  variantStocks: {},  // { 'Red|S': 5, 'Red|M': 3, ... }
}

const PRESET_COLORS = ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Gray', 'Purple', 'Orange', 'Brown', 'Navy']
const PRESET_SIZES_CLOTHING = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
const PRESET_SIZES_SHOE     = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45']

// ── Nav items ─────────────────────────────────────────────────
const NAV = [
  { id: 'dashboard',  label: 'Dashboard',   icon: FiGrid },
  { id: 'add',        label: 'Add Product', icon: FiPlus },
  { id: 'products',   label: 'My Products', icon: FiPackage },
  { id: 'orders',     label: 'Orders',      icon: FiShoppingBag },
  { id: 'analytics',  label: 'Analytics',   icon: FiBarChart2 },
  { id: 'storefront', label: 'My Store',    icon: FiGlobe },
]

// Tracking statuses available to sellers
const SELLER_STATUSES = ['pending', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled']
const STATUS_LABELS   = {
  pending: 'Pending', packed: 'Packed', shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled',
}

// ─────────────────────────────────────────────────────────────
const SellerDashboard = () => {
  const { currentUser, userProfile, logout } = useAuth()

  const [view, setView]           = useState('dashboard')
  const [products, setProducts]   = useState([])
  const [orders, setOrders]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [saving,  setSaving]      = useState(false)
  const [editItem, setEditItem]   = useState(null)
  const [form, setForm]           = useState(BLANK)
  const [imgFiles, setImgFiles]   = useState([null, null, null])   // up to 3 files
  const [previews, setPreviews]   = useState(['', '', ''])          // URL previews
  const [dragOver, setDragOver]   = useState(null)                  // slot index
  const [expanded, setExpanded]   = useState(null)
  const [colorInput, setColorInput] = useState('')
  const [sizeInput, setSizeInput]   = useState('')
  const fileRef0 = useRef(null)
  const fileRef1 = useRef(null)
  const fileRef2 = useRef(null)
  const fileRefs = [fileRef0, fileRef1, fileRef2]

  // Storefront state
  const [storeForm, setStoreForm]   = useState({ storeName: '', bio: '', bannerUrl: '', location: '' })
  const [storeSaving, setStoreSaving] = useState(false)

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState(null)
  const [analyticsLoad, setAnalyticsLoad] = useState(false)

  // ── Load seller data ────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      getSellerProducts(currentUser.uid),
      getSellerOrders(currentUser.uid).catch(() => []),
    ])
      .then(([prods, ords]) => { setProducts(prods); setOrders(ords) })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false))
  }, [currentUser.uid])

  const reloadProducts = async () => {
    const p = await getSellerProducts(currentUser.uid)
    setProducts(p)
  }

  // ── Computed final price ────────────────────────────────────
  const calcFinal = () => {
    const p = parseFloat(form.price)
    const d = parseFloat(form.discount) || 0
    if (!p || p <= 0) return null
    return +(p - p * d / 100).toFixed(2)
  }

  // ── Image helpers ───────────────────────────────────────────
  const processImage = (slot, file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Select an image file'); return }
    if (file.size > 5 * 1024 * 1024)    { toast.error('Image must be under 5 MB'); return }
    setImgFiles(prev => { const n = [...prev]; n[slot] = file; return n })
    setPreviews(prev => { const n = [...prev]; n[slot] = URL.createObjectURL(file); return n })
  }
  const onFilePick  = (slot, e) => processImage(slot, e.target.files[0])
  const onDrop      = (slot, e) => { e.preventDefault(); setDragOver(null); processImage(slot, e.dataTransfer.files[0]) }
  const onDragOver  = (slot, e) => { e.preventDefault(); setDragOver(slot) }
  const onDragLeave = () => setDragOver(null)
  const removeSlot  = (slot) => {
    setImgFiles(prev  => { const n = [...prev];  n[slot] = null; return n })
    setPreviews(prev => { const n = [...prev]; n[slot] = '';   return n })
  }

  // ── Color helpers ────────────────────────────────────────────
  const addColor = (c) => {
    const val = (c || colorInput).trim()
    if (!val) return
    if (form.colors.includes(val)) { setColorInput(''); return }
    setForm(f => ({ ...f, colors: [...f.colors, val] }))
    setColorInput('')
  }
  const removeColor = (c) => {
    setForm(f => {
      const newStocks = { ...f.variantStocks }
      f.sizes.forEach(sz => { delete newStocks[`${c}|${sz}`] })
      return { ...f, colors: f.colors.filter(x => x !== c), variantStocks: newStocks }
    })
  }

  // ── Size helpers ─────────────────────────────────────────────
  const addSize = (sz) => {
    const val = (sz || sizeInput).trim()
    if (!val) return
    if (form.sizes.includes(val)) { setSizeInput(''); return }
    setForm(f => ({ ...f, sizes: [...f.sizes, val] }))
    setSizeInput('')
  }
  const removeSize = (sz) => {
    setForm(f => {
      const newStocks = { ...f.variantStocks }
      f.colors.forEach(c => { delete newStocks[`${c}|${sz}`] })
      return { ...f, sizes: f.sizes.filter(x => x !== sz), variantStocks: newStocks }
    })
  }

  const setVariantStock = (color, size, val) => {
    setForm(f => ({
      ...f,
      variantStocks: { ...f.variantStocks, [`${color}|${size}`]: val },
    }))
  }

  // ── Open edit form ──────────────────────────────────────────
  const openEdit = async (p) => {
    setEditItem(p)
    setView('add')
    // Fetch full product (with variants + images)
    try {
      const full = await getProductById(p.id)
      const colors = [...new Set((full.variants || []).map(v => v.color).filter(Boolean))]
      const sizes  = [...new Set((full.variants || []).map(v => v.size).filter(Boolean))]
      const variantStocks = {}
      for (const v of (full.variants || [])) {
        if (v.color !== undefined && v.size !== undefined) {
          variantStocks[`${v.color}|${v.size}`] = String(v.stock)
        }
      }
      const imgUrls = (full.images || []).map(img => img.imageUrl)
      while (imgUrls.length < 3) imgUrls.push('')
      setPreviews(imgUrls.slice(0, 3))
      setImgFiles([null, null, null])
      setForm({
        name:        full.title       || '',
        description: full.description || '',
        category:    full.category    || 'Electronics',
        price:       full.price       || '',
        discount:    full.discount    || '',
        stock:       full.stock       || '',
        colors,
        sizes,
        variantStocks,
      })
    } catch {
      // fallback without variant data
      setPreviews([p.imageUrl || '', '', ''])
      setImgFiles([null, null, null])
      setForm({
        name:        p.title       || '',
        description: p.description || '',
        category:    p.category    || 'Electronics',
        price:       p.price       || '',
        discount:    p.discount    || '',
        stock:       p.stock       || '',
        colors: [], sizes: [], variantStocks: {},
      })
    }
  }

  const resetForm = () => {
    setForm(BLANK)
    setEditItem(null)
    setImgFiles([null, null, null])
    setPreviews(['', '', ''])
    setColorInput('')
    setSizeInput('')
  }

  // ── Save product ────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim())               { toast.error('Product name is required'); return }
    if (!form.description.trim())        { toast.error('Description is required');  return }
    if (!form.price || isNaN(form.price)){ toast.error('Enter a valid price');      return }
    if (previews.every(p => !p) && imgFiles.every(f => !f)) {
      toast.error('Upload at least one product image'); return
    }

    setSaving(true)
    try {
      // Upload any new files
      const newFiles = imgFiles.filter(Boolean)
      let uploadedUrls = []
      if (newFiles.length > 0) {
        const result = await uploadMultipleImages(newFiles)
        uploadedUrls = result.urls || []
      }

      // Build final images array: slot order preserved
      const finalImages = []
      let uploadIdx = 0
      for (let i = 0; i < 3; i++) {
        if (imgFiles[i]) {
          if (uploadedUrls[uploadIdx]) {
            finalImages.push({ url: uploadedUrls[uploadIdx] })
            uploadIdx++
          }
        } else if (previews[i]) {
          finalImages.push({ url: previews[i] })
        }
      }

      // Build variants
      const variants = []
      for (const c of form.colors) {
        for (const sz of form.sizes) {
          variants.push({ color: c, size: sz, stock: parseInt(form.variantStocks[`${c}|${sz}`]) || 0 })
        }
      }

      const primaryImageUrl = finalImages[0]?.url || ''
      const fp = calcFinal()
      const payload = {
        title:         form.name.trim(),
        description:   form.description.trim(),
        category:      form.category,
        brand:         '',
        price:         parseFloat(form.price),
        originalPrice: parseFloat(form.price),
        discount:      parseFloat(form.discount) || 0,
        finalPrice:    fp,
        stock:         parseInt(form.stock) || 0,
        imageUrl:      primaryImageUrl,
        sellerUid:     currentUser.uid,
        sellerName:    userProfile?.name  || currentUser.displayName || 'Seller',
        storeName:     userProfile?.storeName || '',
        variants,
        images: finalImages,
      }

      if (editItem) {
        await updateProduct(editItem.id, payload)
        toast.success('Product updated!')
      } else {
        await addProduct(payload)
        toast.success('Product added!')
      }

      resetForm()
      await reloadProducts()
      setView('products')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete product ──────────────────────────────────────────
  const handleDelete = async (p) => {
    if (!window.confirm(`Delete "${p.title}"?`)) return
    try {
      await deleteProduct(p.id)
      setProducts(prev => prev.filter(x => x.id !== p.id))
      toast.success('Product deleted')
    } catch { toast.error('Failed to delete') }
  }

  // ── Update order status ─────────────────────────────────────
  const handleStatus = async (orderId, status) => {
    try {
      await updateOrderStatus(orderId, status)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
      toast.success(`Status updated: ${STATUS_LABELS[status] || status}`)
    } catch { toast.error('Failed to update') }
  }

  // ── Load analytics when switching to that tab ───────────────
  const handleViewAnalytics = async () => {
    setView('analytics')
    if (analyticsData) return   // already loaded
    setAnalyticsLoad(true)
    try {
      const d = await getSellerAnalytics(currentUser.uid)
      setAnalyticsData(d)
    } catch { toast.error('Failed to load analytics') }
    finally { setAnalyticsLoad(false) }
  }

  // ── Load storefront when switching to that tab ───────────────
  const handleViewStorefront = async () => {
    setView('storefront')
    try {
      const data = await getStoreProfile(currentUser.uid)
      setStoreForm({
        storeName: data.seller.storeName || '',
        bio:       data.profile.bio      || '',
        bannerUrl: data.profile.bannerUrl|| '',
        location:  data.profile.location || '',
      })
    } catch {
      setStoreForm(f => ({ ...f, storeName: userProfile?.storeName || '' }))
    }
  }

  // ── Save storefront ──────────────────────────────────────────
  const handleStoreSave = async (e) => {
    e.preventDefault()
    setStoreSaving(true)
    try {
      await updateStoreProfile(currentUser.uid, storeForm)
      toast.success('Store profile updated!')
    } catch { toast.error('Failed to save store') }
    finally { setStoreSaving(false) }
  }

  if (loading) return <FullPageLoader />

  // ── Aggregated stats ────────────────────────────────────────
  const catalogueValue = products.reduce((s, p) => s + (parseFloat(p.price) * (parseInt(p.stock) || 1)), 0)
  const pendingCount   = orders.filter(o => o.status === 'pending').length
  const onDiscount     = products.filter(p => parseFloat(p.discount) > 0).length

  return (
    <div style={s.root} className="sd-root">

      {/* ══════════════════════════════════════════════════
          SIDEBAR
      ══════════════════════════════════════════════════ */}
      <aside style={s.sidebar} className="sd-sidebar">

        {/* Brand */}
        <div style={s.brand} className="sd-brand">
          <span style={s.brandText}>Mega<span style={s.brandBlue}>Mart</span>X</span>
          <span style={s.brandBadge}>Seller</span>
        </div>

        {/* Seller info */}
        <div style={s.sellerCard} className="sd-seller-card">
          <div style={s.avatar}>{(userProfile?.name || 'S')[0].toUpperCase()}</div>
          <div style={{ minWidth: 0 }}>
            <div style={s.sellerName}>{userProfile?.name || 'Seller'}</div>
            <div style={s.storeName}>{userProfile?.storeName || 'My Store'}</div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={s.nav} className="sd-nav">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              style={{ ...s.navItem, ...(view === id ? s.navActive : {}) }}
              className="sd-nav-item"
              onClick={() => {
                if (id === 'add')        { resetForm(); setView(id); return }
                if (id === 'storefront') { handleViewStorefront(); return }
                if (id === 'analytics')  { handleViewAnalytics(); return }
                setView(id)
              }}
            >
              <Icon size={16} />
              <span style={s.navLabel} className="sd-nav-label">{label}</span>
              {id === 'orders' && pendingCount > 0 && (
                <span style={s.navBadge}>{pendingCount}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Logout at bottom */}
        <button style={s.logoutBtn} className="sd-logout" onClick={logout}>
          <FiLogOut size={15} /> Sign Out
        </button>
      </aside>

      {/* ══════════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════════ */}
      <main style={s.main}>

        {/* ── Dashboard home ── */}
        {view === 'dashboard' && (
          <div>
            <div style={s.pageHead}>
              <h1 style={s.pageTitle}>Dashboard</h1>
              <p style={s.pageSub}>Welcome back, <strong>{userProfile?.name || 'Seller'}</strong>!</p>
            </div>

            {/* Stats */}
            <div style={s.statsGrid}>
              {[
                { label: 'Total Products', value: products.length,         icon: FiPackage,   color: '#2196F3' },
                { label: 'Catalogue Value',value: formatPrice(catalogueValue), icon: FiDollarSign, color: '#10b981' },
                { label: 'Total Orders',   value: orders.length,           icon: FiShoppingBag, color: '#8b5cf6' },
                { label: 'Pending Orders', value: pendingCount,            icon: FiClock,     color: '#f59e0b' },
                { label: 'On Discount',    value: onDiscount,              icon: FiPercent,   color: '#ef4444' },
              ].map(stat => (
                <div key={stat.label} style={s.statCard}>
                  <div style={{ ...s.statIcon, background: stat.color + '18' }}>
                    <stat.icon size={20} color={stat.color} />
                  </div>
                  <div>
                    <div style={s.statValue}>{stat.value}</div>
                    <div style={s.statLabel}>{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div style={s.quickRow}>
              <button style={s.quickBtn} onClick={() => { resetForm(); setView('add') }}>
                <FiPlus size={16} /> Add New Product
              </button>
              <button style={{ ...s.quickBtn, ...s.quickBtnOutline }} onClick={() => setView('orders')}>
                <FiShoppingBag size={16} /> View Orders
              </button>
            </div>

            {/* Recent products */}
            {products.length > 0 && (
              <div style={s.section}>
                <h3 style={s.sectionTitle}>Recent Products</h3>
                <div style={s.recentGrid}>
                  {products.slice(0, 4).map(p => (
                    <div key={p.id} style={s.recentCard}>
                      <img
                        src={p.imageUrl || imgFallback()}
                        alt={p.title}
                        style={s.recentImg}
                        onError={e => { e.target.src = imgFallback() }}
                      />
                      <div style={s.recentInfo}>
                        <div style={s.recentTitle}>{p.title}</div>
                        <div style={s.recentPrice}>{formatPrice(p.price)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Add / Edit Product ── */}
        {view === 'add' && (
          <div>
            <div style={s.pageHead}>
              <h1 style={s.pageTitle}>{editItem ? 'Edit Product' : 'Add New Product'}</h1>
              <p style={s.pageSub}>{editItem ? `Editing: ${editItem.title}` : 'Fill in the details below'}</p>
            </div>

            <form onSubmit={handleSubmit} style={s.form}>

              {/* ── Multi-image upload ── */}
              <div style={s.formCard}>
                <div style={s.cardHead}><FiImage size={15} /> Product Images (up to 3)</div>
                <p style={{ color: '#888', fontSize: '12px', margin: '0 0 14px' }}>
                  First image is the main/primary image shown on listings.
                </p>
                <div style={s.imgSlotsRow}>
                  {[0, 1, 2].map(slot => (
                    <div key={slot} style={{ flex: 1 }}>
                      {slot === 0 && (
                        <div style={s.primaryBadge}>Main Image</div>
                      )}
                      <div
                        style={{
                          ...s.dropZone,
                          ...(dragOver === slot ? s.dropZoneActive : {}),
                          minHeight: '130px',
                        }}
                        onClick={() => fileRefs[slot].current?.click()}
                        onDrop={e => onDrop(slot, e)}
                        onDragOver={e => onDragOver(slot, e)}
                        onDragLeave={onDragLeave}
                      >
                        {previews[slot] ? (
                          <div style={s.previewWrap}>
                            <img src={previews[slot]} alt={`Image ${slot + 1}`} style={s.previewImg} />
                            <button
                              type="button"
                              style={s.removeImg}
                              onClick={e => { e.stopPropagation(); removeSlot(slot) }}
                            >
                              <FiX size={13} />
                            </button>
                          </div>
                        ) : (
                          <div style={s.dropContent}>
                            <FiUpload size={22} color="#90caf9" />
                            <p style={{ ...s.dropText, fontSize: '12px' }}>
                              {slot === 0 ? 'Main image' : `Image ${slot + 1}`}
                            </p>
                            <p style={s.dropHint}>PNG/JPG/WEBP · 5 MB</p>
                          </div>
                        )}
                      </div>
                      <input
                        ref={fileRefs[slot]}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => onFilePick(slot, e)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Product info ── */}
              <div style={s.formCard}>
                <div style={s.cardHead}><FiInfo size={15} /> Product Information</div>
                <div style={s.formGrid}>

                  <div style={{ gridColumn: '1 / -1', ...s.field }}>
                    <label style={s.label}>Product Name <span style={s.req}>*</span></label>
                    <input
                      style={s.input}
                      name="name"
                      placeholder="e.g. Wireless Bluetooth Headphones"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      maxLength={200}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1', ...s.field }}>
                    <label style={s.label}>Description <span style={s.req}>*</span></label>
                    <textarea
                      style={{ ...s.input, height: '100px', resize: 'vertical' }}
                      name="description"
                      placeholder="Describe your product in detail…"
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      maxLength={1000}
                    />
                    <div style={s.charCount}>{form.description.length} / 1000</div>
                  </div>

                </div>
              </div>

              {/* ── Category & Stock ── */}
              <div style={s.formCard}>
                <div style={s.cardHead}><FiLayers size={15} /> Category &amp; Stock</div>
                <div style={s.formGrid}>

                  <div style={s.field}>
                    <label style={s.label}>Category <span style={s.req}>*</span></label>
                    <select
                      style={s.input}
                      value={form.category}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    >
                      {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div style={s.field}>
                    <label style={s.label}>
                      Base Stock {form.colors.length > 0 && form.sizes.length > 0 ? '(set per-variant below)' : ''}
                    </label>
                    <input
                      style={s.input}
                      type="number"
                      name="stock"
                      placeholder="0"
                      min="0"
                      value={form.stock}
                      onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                    />
                  </div>

                </div>
              </div>

              {/* ── Pricing & Discount ── */}
              <div style={s.formCard}>
                <div style={s.cardHead}><FiDollarSign size={15} /> Pricing &amp; Discount</div>
                <div style={s.formGrid}>

                  <div style={s.field}>
                    <label style={s.label}>Price (USD) <span style={s.req}>*</span></label>
                    <div style={s.inputWrap}>
                      <span style={s.inputPre}>$</span>
                      <input
                        style={{ ...s.input, borderLeft: 'none', borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                        type="number"
                        name="price"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div style={s.field}>
                    <label style={s.label}>Discount (%)</label>
                    <div style={s.inputWrap}>
                      <input
                        style={{ ...s.input, borderRight: 'none', borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                        type="number"
                        name="discount"
                        placeholder="0"
                        min="0"
                        max="100"
                        value={form.discount}
                        onChange={e => setForm(f => ({ ...f, discount: e.target.value }))}
                      />
                      <span style={s.inputSuf}>%</span>
                    </div>
                  </div>

                  {calcFinal() !== null && (
                    <div style={{ ...s.field, gridColumn: '1 / -1' }}>
                      <div style={s.finalPriceBox}>
                        <FiCheck size={14} color="#2e7d32" />
                        <span>Final Price:</span>
                        <strong style={{ color: '#2196F3', fontSize: '18px' }}>
                          {formatPrice(calcFinal())}
                        </strong>
                        {parseFloat(form.discount) > 0 && (
                          <span style={s.saveBadge}>
                            Save {formatPrice(parseFloat(form.price) - calcFinal())} ({form.discount}% off)
                          </span>
                        )}
                      </div>
                      <div style={s.formulaNote}>Final Price = Price − (Price × Discount / 100)</div>
                    </div>
                  )}

                </div>
              </div>

              {/* ── Colors ── */}
              <div style={s.formCard}>
                <div style={s.cardHead}><FiTag size={15} /> Colors (optional)</div>
                {/* Presets */}
                <div style={s.presetRow}>
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c} type="button"
                      style={{
                        ...s.presetChip,
                        background: form.colors.includes(c) ? '#2196F3' : '#e3f2fd',
                        color:      form.colors.includes(c) ? '#fff'    : '#1565C0',
                        border:     form.colors.includes(c) ? '1.5px solid #2196F3' : '1.5px solid #90caf9',
                      }}
                      onClick={() => form.colors.includes(c) ? removeColor(c) : addColor(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                {/* Custom input */}
                <div style={s.tagInputRow}>
                  <input
                    style={{ ...s.input, flex: 1 }}
                    placeholder="Custom color…"
                    value={colorInput}
                    onChange={e => setColorInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addColor())}
                  />
                  <button type="button" style={s.tagAddBtn} onClick={() => addColor()}>Add</button>
                </div>
                {/* Selected chips */}
                {form.colors.length > 0 && (
                  <div style={s.chipRow}>
                    {form.colors.map(c => (
                      <span key={c} style={s.chip}>
                        {c}
                        <button type="button" style={s.chipX} onClick={() => removeColor(c)}><FiX size={11} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Sizes ── */}
              <div style={s.formCard}>
                <div style={s.cardHead}><FiBox size={15} /> Sizes (optional)</div>
                {/* Clothing presets */}
                <p style={{ color: '#888', fontSize: '11px', margin: '0 0 6px', fontWeight: 600 }}>CLOTHING</p>
                <div style={s.presetRow}>
                  {PRESET_SIZES_CLOTHING.map(sz => (
                    <button
                      key={sz} type="button"
                      style={{
                        ...s.presetChip,
                        background: form.sizes.includes(sz) ? '#2196F3' : '#e3f2fd',
                        color:      form.sizes.includes(sz) ? '#fff'    : '#1565C0',
                        border:     form.sizes.includes(sz) ? '1.5px solid #2196F3' : '1.5px solid #90caf9',
                      }}
                      onClick={() => form.sizes.includes(sz) ? removeSize(sz) : addSize(sz)}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
                {/* Shoe presets */}
                <p style={{ color: '#888', fontSize: '11px', margin: '10px 0 6px', fontWeight: 600 }}>SHOES / EU</p>
                <div style={s.presetRow}>
                  {PRESET_SIZES_SHOE.map(sz => (
                    <button
                      key={sz} type="button"
                      style={{
                        ...s.presetChip,
                        background: form.sizes.includes(sz) ? '#2196F3' : '#e3f2fd',
                        color:      form.sizes.includes(sz) ? '#fff'    : '#1565C0',
                        border:     form.sizes.includes(sz) ? '1.5px solid #2196F3' : '1.5px solid #90caf9',
                      }}
                      onClick={() => form.sizes.includes(sz) ? removeSize(sz) : addSize(sz)}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
                {/* Custom input */}
                <div style={{ ...s.tagInputRow, marginTop: '10px' }}>
                  <input
                    style={{ ...s.input, flex: 1 }}
                    placeholder="Custom size…"
                    value={sizeInput}
                    onChange={e => setSizeInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSize())}
                  />
                  <button type="button" style={s.tagAddBtn} onClick={() => addSize()}>Add</button>
                </div>
                {form.sizes.length > 0 && (
                  <div style={s.chipRow}>
                    {form.sizes.map(sz => (
                      <span key={sz} style={s.chip}>
                        {sz}
                        <button type="button" style={s.chipX} onClick={() => removeSize(sz)}><FiX size={11} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Variant stock grid ── */}
              {form.colors.length > 0 && form.sizes.length > 0 && (
                <div style={s.formCard}>
                  <div style={s.cardHead}><FiAlertCircle size={15} /> Inventory by Variant</div>
                  <p style={{ color: '#888', fontSize: '12px', margin: '0 0 14px' }}>
                    Set stock for each color × size combination.
                  </p>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={s.variantTable}>
                      <thead>
                        <tr>
                          <th style={s.vth}>Color \ Size</th>
                          {form.sizes.map(sz => <th key={sz} style={s.vth}>{sz}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {form.colors.map(c => (
                          <tr key={c}>
                            <td style={s.vtd}>
                              <span style={s.colorCell}>{c}</span>
                            </td>
                            {form.sizes.map(sz => (
                              <td key={sz} style={s.vtd}>
                                <input
                                  style={s.stockInput}
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={form.variantStocks[`${c}|${sz}`] || ''}
                                  onChange={e => setVariantStock(c, sz, e.target.value)}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={s.formActions}>
                <button
                  type="button"
                  style={s.cancelBtn}
                  onClick={() => { resetForm(); setView('products') }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ ...s.saveBtn, opacity: saving ? 0.75 : 1 }}
                  disabled={saving}
                >
                  {saving
                    ? (editItem ? 'Updating…' : 'Adding…')
                    : (editItem ? 'Update Product' : 'Add Product')
                  }
                </button>
              </div>

            </form>
          </div>
        )}

        {/* ── My Products ── */}
        {view === 'products' && (
          <div>
            <div style={{ ...s.pageHead, ...s.pageHeadRow }}>
              <div>
                <h1 style={s.pageTitle}>My Products</h1>
                <p style={s.pageSub}>{products.length} product{products.length !== 1 ? 's' : ''} listed</p>
              </div>
              <button style={s.addBtn} onClick={() => { resetForm(); setView('add') }}>
                <FiPlus size={15} /> Add Product
              </button>
            </div>

            {products.length === 0 ? (
              <div style={s.empty}>
                <FiPackage size={48} color="#90caf9" />
                <h3 style={{ color: '#000', margin: '12px 0 4px' }}>No products yet</h3>
                <p style={{ color: '#777', margin: 0 }}>Click "Add Product" to list your first item.</p>
              </div>
            ) : (
              <div style={s.productGrid}>
                {products.map(p => {
                  const discNum = parseFloat(p.discount) || 0
                  const fp = discNum > 0
                    ? +(parseFloat(p.price) - parseFloat(p.price) * discNum / 100).toFixed(2)
                    : null
                  return (
                    <div key={p.id} style={s.productCard}>
                      {/* Image */}
                      <div style={s.productImgWrap}>
                        <img
                          src={p.imageUrl || imgFallback()}
                          alt={p.title}
                          style={s.productImg}
                          onError={e => { e.target.src = imgFallback() }}
                        />
                        {discNum > 0 && (
                          <div style={s.discBadge}>{discNum}% OFF</div>
                        )}
                        {(parseInt(p.stock) || 0) === 0 && (
                          <div style={s.outBadge}>Out of Stock</div>
                        )}
                      </div>

                      {/* Info */}
                      <div style={s.productBody}>
                        <div style={s.productCat}>{p.category}</div>
                        <div style={s.productTitle}>{p.title}</div>
                        <div style={s.productDesc}>{p.description}</div>

                        <div style={s.productPricing}>
                          <span style={s.productPrice}>
                            {fp ? formatPrice(fp) : formatPrice(p.price)}
                          </span>
                          {fp && (
                            <span style={s.productOrig}>{formatPrice(p.price)}</span>
                          )}
                        </div>

                        <div style={s.productMeta}>
                          <span style={s.stockText}>
                            {(parseInt(p.stock) || 0) > 0
                              ? `${p.stock} in stock`
                              : 'Out of stock'}
                          </span>
                        </div>

                        <div style={s.productBtns}>
                          <button style={s.editBtn} onClick={() => openEdit(p)}>
                            <FiEdit2 size={13} /> Edit
                          </button>
                          <button style={s.deleteBtn} onClick={() => handleDelete(p)}>
                            <FiTrash2 size={13} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Orders ── */}
        {view === 'orders' && (
          <div>
            <div style={s.pageHead}>
              <h1 style={s.pageTitle}>Orders</h1>
              <p style={s.pageSub}>{orders.length} order{orders.length !== 1 ? 's' : ''} · {pendingCount} pending</p>
            </div>

            {orders.length === 0 ? (
              <div style={s.empty}>
                <FiShoppingBag size={48} color="#90caf9" />
                <h3 style={{ color: '#000', margin: '12px 0 4px' }}>No orders yet</h3>
                <p style={{ color: '#777', margin: 0 }}>Orders from buyers will appear here.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {orders.map(order => {
                  const myItems  = (order.items || []).filter(i => i.sellerUid === currentUser.uid)
                  const myEarn   = myItems.reduce((s, i) => s + (parseFloat(i.price) * (i.quantity || 1)), 0)
                  const isOpen   = expanded === order.id
                  const sc       = STATUS_COLORS[order.status] || '#888'

                  return (
                    <div key={order.id} style={s.orderCard}>
                      {/* Order header */}
                      <div style={s.orderHead} onClick={() => setExpanded(isOpen ? null : order.id)}>
                        <div style={s.orderLeft}>
                          <div style={s.orderId}>#{order.id.slice(-8).toUpperCase()}</div>
                          <div style={s.orderDate}>{formatDate(order.createdAt)}</div>
                        </div>
                        <div style={s.orderMid}>
                          <div style={s.buyerName}>{order.userName || 'Customer'}</div>
                          <div style={s.buyerEmail}>{order.userEmail}</div>
                        </div>
                        <div style={s.orderRight}>
                          <div style={{ ...s.statusBadge, background: sc + '18', color: sc, border: `1px solid ${sc}40` }}>
                            {order.status}
                          </div>
                          <div style={s.orderEarn}>{formatPrice(myEarn)}</div>
                        </div>
                        <div style={{ color: '#aaa' }}>
                          {isOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isOpen && (
                        <div style={s.orderBody}>
                          {/* My items in this order */}
                          <div style={s.orderItems}>
                            {myItems.length > 0 ? myItems.map((item, i) => (
                              <div key={i} style={s.orderItem}>
                                <img
                                  src={item.imageUrl || imgFallback(60, 60)}
                                  alt={item.title}
                                  style={s.orderItemImg}
                                  onError={e => { e.target.src = imgFallback(60, 60) }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={s.orderItemTitle}>{item.title}</div>
                                  <div style={s.orderItemMeta}>
                                    Qty: {item.quantity} · {formatPrice(item.price)} each
                                  </div>
                                </div>
                                <div style={s.orderItemTotal}>
                                  {formatPrice(item.price * (item.quantity || 1))}
                                </div>
                              </div>
                            )) : (
                              <p style={{ color: '#aaa', fontSize: '13px', margin: 0 }}>
                                No items from your store in this order.
                              </p>
                            )}
                          </div>

                          {/* Status buttons */}
                          <div style={s.statusRow}>
                            <span style={s.statusLabel}>Update Status:</span>
                            {SELLER_STATUSES.map(st => (
                              <button
                                key={st}
                                style={{
                                  ...s.stBtn,
                                  background: order.status === st ? (STATUS_COLORS[st] || '#888') : 'transparent',
                                  color:      order.status === st ? '#fff' : (STATUS_COLORS[st] || '#888'),
                                  border:     `1.5px solid ${STATUS_COLORS[st] || '#888'}`,
                                }}
                                onClick={() => handleStatus(order.id, st)}
                              >
                                {STATUS_LABELS[st] || st}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Storefront ── */}
        {/* ── Analytics ── */}
        {view === 'analytics' && (
          <div>
            <div style={s.pageHead}>
              <h1 style={s.pageTitle}>Analytics</h1>
              <p style={s.pageSub}>Sales performance and product insights</p>
            </div>

            {analyticsLoad || !analyticsData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[...Array(3)].map((_, i) => (
                  <div key={i} style={{ height: '80px', borderRadius: '14px', background: '#f0f8ff', animation: 'shimmer 1.4s infinite' }} />
                ))}
              </div>
            ) : (
              <>
                {/* KPI cards */}
                <div style={s.statsGrid}>
                  {[
                    { label: 'Total Revenue',   value: `$${Number(analyticsData.totalRevenue).toFixed(2)}`,  icon: FiDollarSign, color: '#10b981' },
                    { label: 'Total Orders',    value: analyticsData.totalOrders,   icon: FiShoppingBag, color: '#2196F3' },
                    { label: 'Avg Order Value', value: `$${Number(analyticsData.avgOrderValue).toFixed(2)}`, icon: FiTrendingUp, color: '#8b5cf6' },
                    { label: 'Products Listed', value: analyticsData.productCount,  icon: FiPackage,    color: '#f59e0b' },
                  ].map(stat => (
                    <div key={stat.label} style={s.statCard}>
                      <div style={{ ...s.statIcon, background: stat.color + '18' }}>
                        <stat.icon size={20} color={stat.color} />
                      </div>
                      <div>
                        <div style={s.statValue}>{stat.value}</div>
                        <div style={s.statLabel}>{stat.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Monthly revenue chart */}
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>
                    <FiBarChart2 size={16} color="#2196F3" style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                    Revenue — Last 6 Months
                  </h3>
                  {analyticsData.monthly.length === 0 ? (
                    <p style={{ color: '#aaa', fontSize: '14px' }}>No sales data yet.</p>
                  ) : (
                    <div style={s.chartWrap}>
                      <BarChart data={analyticsData.monthly} />
                    </div>
                  )}
                </div>

                {/* Best sellers */}
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>
                    <FiAward size={16} color="#f59e0b" style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                    Best Selling Products
                  </h3>
                  {analyticsData.bestSellers.length === 0 ? (
                    <p style={{ color: '#aaa', fontSize: '14px' }}>No sales yet.</p>
                  ) : (
                    <div style={s.bsTable}>
                      <div style={s.bsHead}>
                        {['#', 'Product', 'Category', 'Units Sold', 'Revenue'].map(h => (
                          <span key={h} style={s.bsHeadCell}>{h}</span>
                        ))}
                      </div>
                      {analyticsData.bestSellers.map((p, i) => (
                        <div key={p.productId} style={s.bsRow}>
                          <span style={s.bsRank}>{i + 1}</span>
                          <div style={s.bsProduct}>
                            <img
                              src={p.imageUrl || imgFallback(40, 40)}
                              alt={p.title}
                              style={s.bsImg}
                              onError={e => { e.target.src = imgFallback(40, 40) }}
                            />
                            <span style={s.bsTitle}>{p.title}</span>
                          </div>
                          <span style={s.bsCell}>{p.category}</span>
                          <span style={{ ...s.bsCell, fontWeight: 700 }}>{p.totalSold}</span>
                          <span style={{ ...s.bsCell, color: '#10b981', fontWeight: 700 }}>
                            ${Number(p.revenue).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Category breakdown */}
                {analyticsData.categories.length > 0 && (
                  <div style={s.section}>
                    <h3 style={s.sectionTitle}>Sales by Category</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {analyticsData.categories.map(c => {
                        const total = analyticsData.categories.reduce((s, x) => s + Number(x.revenue), 0)
                        const pct   = total > 0 ? ((Number(c.revenue) / total) * 100).toFixed(1) : 0
                        return (
                          <div key={c.category}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#000' }}>{c.category}</span>
                              <span style={{ fontSize: '13px', color: '#888' }}>{pct}% · ${Number(c.revenue).toFixed(2)}</span>
                            </div>
                            <div style={{ height: '8px', background: '#e3f2fd', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: '#2196F3', borderRadius: '4px', transition: 'width .4s' }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {view === 'storefront' && (
          <div>
            <div style={{ ...s.pageHead, ...s.pageHeadRow }}>
              <div>
                <h1 style={s.pageTitle}>My Store</h1>
                <p style={s.pageSub}>Customise how buyers see your storefront</p>
              </div>
              <a
                href={`/store/${currentUser.uid}`}
                target="_blank"
                rel="noreferrer"
                style={{ ...s.addBtn, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <FiExternalLink size={14} /> View Live Store
              </a>
            </div>

            <form onSubmit={handleStoreSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '680px' }}>

              {/* Store name */}
              <div style={s.formCard}>
                <div style={s.cardHead}><FiGlobe size={15} /> Store Identity</div>
                <div style={s.field}>
                  <label style={s.label}>Store Name</label>
                  <input
                    style={s.input}
                    placeholder="e.g. Tech Universe"
                    value={storeForm.storeName}
                    onChange={e => setStoreForm(f => ({ ...f, storeName: e.target.value }))}
                    maxLength={100}
                  />
                </div>
                <div style={{ ...s.field, marginTop: '14px' }}>
                  <label style={s.label}>Store Bio</label>
                  <textarea
                    style={{ ...s.input, height: '90px', resize: 'vertical' }}
                    placeholder="Tell buyers about your store, what you sell, your quality promise…"
                    value={storeForm.bio}
                    onChange={e => setStoreForm(f => ({ ...f, bio: e.target.value }))}
                    maxLength={500}
                  />
                  <div style={s.charCount}>{storeForm.bio.length} / 500</div>
                </div>
              </div>

              {/* Visuals */}
              <div style={s.formCard}>
                <div style={s.cardHead}><FiImage size={15} /> Store Visuals</div>
                <div style={s.field}>
                  <label style={s.label}>Banner Image URL</label>
                  <input
                    style={s.input}
                    placeholder="https://… (1200×300 recommended)"
                    value={storeForm.bannerUrl}
                    onChange={e => setStoreForm(f => ({ ...f, bannerUrl: e.target.value }))}
                  />
                  {storeForm.bannerUrl && (
                    <div style={{ marginTop: '10px', borderRadius: '10px', overflow: 'hidden', height: '100px', background: '#e3f2fd' }}>
                      <img
                        src={storeForm.bannerUrl}
                        alt="Banner preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              <div style={s.formCard}>
                <div style={s.cardHead}><FiMapPin size={15} /> Location</div>
                <div style={s.field}>
                  <label style={s.label}>City / Region</label>
                  <input
                    style={s.input}
                    placeholder="e.g. Colombo, Sri Lanka"
                    value={storeForm.location}
                    onChange={e => setStoreForm(f => ({ ...f, location: e.target.value }))}
                    maxLength={100}
                  />
                </div>
              </div>

              <div style={s.formActions}>
                <button
                  type="submit"
                  style={{ ...s.saveBtn, opacity: storeSaving ? 0.75 : 1 }}
                  disabled={storeSaving}
                >
                  <FiSave size={14} /> {storeSaving ? 'Saving…' : 'Save Store Profile'}
                </button>
              </div>
            </form>
          </div>
        )}

      </main>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════
const s = {
  // Layout
  root: {
    display: 'flex', minHeight: '100vh',
    background: '#f0f4f8', fontFamily: 'inherit',
  },

  // ── Sidebar ────────────────────────────────────────────────
  sidebar: {
    width: '240px', flexShrink: 0,
    background: '#fff',
    borderRight: '1px solid #e3f2fd',
    display: 'flex', flexDirection: 'column',
    position: 'sticky', top: 0, height: '100vh',
    overflowY: 'auto',
    boxShadow: '2px 0 12px rgba(33,150,243,0.06)',
  },
  brand: {
    padding: '20px 20px 16px',
    display: 'flex', alignItems: 'center', gap: '8px',
    borderBottom: '1px solid #e3f2fd',
  },
  brandText: { fontSize: '18px', fontWeight: 800, color: '#000' },
  brandBlue: { color: '#2196F3' },
  brandBadge: {
    background: '#e3f2fd', color: '#2196F3',
    fontSize: '10px', fontWeight: 700,
    padding: '2px 7px', borderRadius: '10px',
    border: '1px solid #90caf9',
  },
  sellerCard: {
    margin: '12px 14px',
    padding: '12px', background: '#f0f8ff',
    border: '1px solid #e3f2fd', borderRadius: '12px',
    display: 'flex', alignItems: 'center', gap: '10px',
  },
  avatar: {
    width: '36px', height: '36px', borderRadius: '50%',
    background: '#2196F3', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '16px', fontWeight: 700, flexShrink: 0,
  },
  sellerName: { fontSize: '13px', fontWeight: 700, color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  storeName:  { fontSize: '11px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },

  nav: { display: 'flex', flexDirection: 'column', gap: '2px', padding: '8px 10px', flex: 1 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 12px', borderRadius: '10px',
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#555', fontSize: '14px', fontWeight: 500,
    textAlign: 'left', width: '100%', position: 'relative',
    transition: 'background .15s',
  },
  navActive: { background: '#e3f2fd', color: '#2196F3', fontWeight: 700 },
  navLabel:  { flex: 1 },
  navBadge:  {
    background: '#ef4444', color: '#fff',
    fontSize: '11px', fontWeight: 700,
    padding: '1px 6px', borderRadius: '10px', minWidth: '18px', textAlign: 'center',
  },
  logoutBtn: {
    display: 'flex', alignItems: 'center', gap: '8px',
    margin: '8px 10px 16px', padding: '10px 12px',
    borderRadius: '10px', background: 'none',
    border: '1px solid #ffcdd2', color: '#e53935',
    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  },

  // ── Main ───────────────────────────────────────────────────
  main:    { flex: 1, padding: '32px', overflowY: 'auto', minWidth: 0 },
  pageHead: { marginBottom: '24px' },
  pageHeadRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  pageTitle: { color: '#000', fontSize: '24px', fontWeight: 700, margin: 0 },
  pageSub:   { color: '#777', fontSize: '14px', margin: '4px 0 0' },

  // Stats
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '16px', marginBottom: '24px',
  },
  statCard: {
    background: '#fff', border: '1px solid #e3f2fd',
    borderRadius: '14px', padding: '18px 20px',
    display: 'flex', alignItems: 'center', gap: '14px',
    boxShadow: '0 2px 10px rgba(33,150,243,0.06)',
  },
  statIcon:  { width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statValue: { fontSize: '20px', fontWeight: 800, color: '#000' },
  statLabel: { fontSize: '12px', color: '#777', marginTop: '2px' },

  quickRow: { display: 'flex', gap: '12px', marginBottom: '28px' },
  quickBtn: {
    display: 'flex', alignItems: 'center', gap: '7px',
    padding: '10px 20px', background: '#2196F3', color: '#fff',
    border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
    cursor: 'pointer', boxShadow: '0 4px 12px rgba(33,150,243,0.3)',
  },
  quickBtnOutline: {
    background: '#fff', color: '#2196F3',
    border: '1.5px solid #2196F3', boxShadow: 'none',
  },

  section:      { marginTop: '8px' },
  sectionTitle: { color: '#000', fontSize: '16px', fontWeight: 700, margin: '0 0 14px' },
  recentGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' },
  recentCard:   {
    background: '#fff', border: '1px solid #e3f2fd',
    borderRadius: '12px', overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(33,150,243,0.05)',
  },
  recentImg:   { width: '100%', height: '120px', objectFit: 'cover' },
  recentInfo:  { padding: '10px 12px' },
  recentTitle: { color: '#000', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  recentPrice: { color: '#2196F3', fontSize: '13px', fontWeight: 700, marginTop: '3px' },

  // ── Form ───────────────────────────────────────────────────
  form:     { display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '820px' },
  formCard: {
    background: '#fff', border: '1px solid #e3f2fd',
    borderRadius: '14px', padding: '20px 22px',
    boxShadow: '0 2px 10px rgba(33,150,243,0.05)',
  },
  cardHead: {
    display: 'flex', alignItems: 'center', gap: '7px',
    color: '#2196F3', fontSize: '13px', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.5px',
    marginBottom: '16px', paddingBottom: '10px',
    borderBottom: '1px solid #e3f2fd',
  },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },

  field:     { display: 'flex', flexDirection: 'column', gap: '6px' },
  label:     { color: '#000', fontSize: '13px', fontWeight: 600 },
  req:       { color: '#e53935' },
  input: {
    background: '#f0f8ff', border: '1.5px solid #bbdefb',
    borderRadius: '8px', color: '#000', fontSize: '14px',
    padding: '10px 12px', outline: 'none', width: '100%',
    boxSizing: 'border-box',
  },
  charCount: { color: '#aaa', fontSize: '11px', textAlign: 'right' },
  inputWrap: { display: 'flex' },
  inputPre: {
    background: '#e3f2fd', border: '1.5px solid #bbdefb', borderRight: 'none',
    borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px',
    padding: '10px 10px', color: '#2196F3', fontWeight: 700, fontSize: '14px',
    display: 'flex', alignItems: 'center',
  },
  inputSuf: {
    background: '#e3f2fd', border: '1.5px solid #bbdefb', borderLeft: 'none',
    borderTopRightRadius: '8px', borderBottomRightRadius: '8px',
    padding: '10px 10px', color: '#2196F3', fontWeight: 700, fontSize: '14px',
    display: 'flex', alignItems: 'center',
  },
  finalPriceBox: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: '#e8f5e9', border: '1px solid #a5d6a7',
    borderRadius: '10px', padding: '12px 16px',
    color: '#2e7d32', fontSize: '14px', fontWeight: 600,
    flexWrap: 'wrap',
  },
  saveBadge: {
    background: '#2e7d32', color: '#fff',
    fontSize: '11px', fontWeight: 700,
    padding: '2px 8px', borderRadius: '10px',
  },
  formulaNote: { color: '#aaa', fontSize: '11px', marginTop: '4px' },

  // Drop zone — multi-image
  imgSlotsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' },
  primaryBadge: {
    background: '#2196F3', color: '#fff',
    fontSize: '10px', fontWeight: 700,
    padding: '2px 8px', borderRadius: '6px',
    marginBottom: '6px', display: 'inline-block',
    textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  dropZone: {
    border: '2px dashed #bbdefb', borderRadius: '12px',
    background: '#f0f8ff', cursor: 'pointer',
    minHeight: '130px', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    transition: 'border-color .2s, background .2s',
  },
  dropZoneActive: { borderColor: '#2196F3', background: '#e3f2fd' },
  dropContent: { textAlign: 'center', padding: '16px' },
  dropText:    { color: '#555', fontSize: '13px', margin: '8px 0 4px', fontWeight: 500 },
  dropHint:    { color: '#aaa', fontSize: '11px', margin: 0 },
  previewWrap: { position: 'relative', width: '100%' },
  previewImg:  { width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', display: 'block' },
  removeImg: {
    position: 'absolute', top: '6px', right: '6px',
    background: 'rgba(0,0,0,0.6)', color: '#fff',
    border: 'none', borderRadius: '50%',
    width: '24px', height: '24px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
  },

  // Color/size selectors
  presetRow:   { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' },
  presetChip: {
    padding: '5px 12px', borderRadius: '20px',
    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
    transition: 'all .15s',
  },
  tagInputRow: { display: 'flex', gap: '8px', marginBottom: '12px' },
  tagAddBtn: {
    padding: '10px 18px', background: '#2196F3', color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '13px',
    fontWeight: 600, cursor: 'pointer', flexShrink: 0,
  },
  chipRow:  { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' },
  chip: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: '#e3f2fd', color: '#1565C0',
    border: '1px solid #90caf9',
    fontSize: '13px', fontWeight: 600,
    padding: '4px 10px', borderRadius: '20px',
  },
  chipX: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#1565C0', display: 'flex', padding: 0, lineHeight: 1,
  },

  // Variant stock table
  variantTable: {
    borderCollapse: 'collapse', width: '100%',
    fontSize: '13px', minWidth: '300px',
  },
  vth: {
    background: '#f0f8ff', color: '#555',
    fontWeight: 700, fontSize: '12px',
    padding: '10px 12px', textAlign: 'center',
    border: '1px solid #e3f2fd',
  },
  vtd: {
    padding: '8px 10px', border: '1px solid #e3f2fd',
    textAlign: 'center',
  },
  colorCell: {
    display: 'inline-block', padding: '3px 10px',
    background: '#e3f2fd', color: '#1565C0',
    borderRadius: '10px', fontSize: '12px', fontWeight: 700,
  },
  stockInput: {
    width: '64px', padding: '6px 8px', textAlign: 'center',
    background: '#f0f8ff', border: '1.5px solid #bbdefb',
    borderRadius: '8px', fontSize: '13px', color: '#000',
  },

  formActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '4px' },
  cancelBtn: {
    padding: '11px 24px', background: '#fff',
    border: '1.5px solid #e0e0e0', borderRadius: '10px',
    color: '#555', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
  },
  saveBtn: {
    padding: '11px 28px', background: '#2196F3', color: '#fff',
    border: 'none', borderRadius: '10px',
    fontSize: '14px', fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(33,150,243,0.35)',
  },

  // ── Products grid ──────────────────────────────────────────
  addBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '10px 18px', background: '#2196F3', color: '#fff',
    border: 'none', borderRadius: '10px', fontSize: '14px',
    fontWeight: 600, cursor: 'pointer', flexShrink: 0,
    boxShadow: '0 4px 12px rgba(33,150,243,0.3)',
  },
  productGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
    gap: '18px',
  },
  productCard: {
    background: '#fff', border: '1px solid #e3f2fd',
    borderRadius: '14px', overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(33,150,243,0.07)',
    display: 'flex', flexDirection: 'column',
  },
  productImgWrap: { position: 'relative', height: '180px', background: '#f0f8ff' },
  productImg:     { width: '100%', height: '100%', objectFit: 'cover' },
  discBadge: {
    position: 'absolute', top: '8px', left: '8px',
    background: '#ef4444', color: '#fff',
    fontSize: '11px', fontWeight: 700,
    padding: '2px 8px', borderRadius: '6px',
  },
  outBadge: {
    position: 'absolute', top: '8px', right: '8px',
    background: 'rgba(0,0,0,0.6)', color: '#fff',
    fontSize: '11px', fontWeight: 600,
    padding: '2px 8px', borderRadius: '6px',
  },
  productBody:    { padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 },
  productCat:     { color: '#2196F3', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' },
  productTitle:   { color: '#000', fontSize: '14px', fontWeight: 700, lineHeight: '1.3' },
  productDesc:    { color: '#777', fontSize: '12px', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  productPricing: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' },
  productPrice:   { color: '#2196F3', fontSize: '17px', fontWeight: 800 },
  productOrig:    { color: '#bbb', fontSize: '13px', textDecoration: 'line-through' },
  productMeta:    { marginTop: 'auto' },
  stockText:      { color: '#888', fontSize: '12px' },
  productBtns:    { display: 'flex', gap: '8px', marginTop: '10px' },
  editBtn: {
    display: 'flex', alignItems: 'center', gap: '5px', flex: 1,
    justifyContent: 'center', padding: '8px',
    background: '#e3f2fd', border: '1px solid #90caf9',
    borderRadius: '8px', color: '#2196F3',
    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  },
  deleteBtn: {
    display: 'flex', alignItems: 'center', gap: '5px', flex: 1,
    justifyContent: 'center', padding: '8px',
    background: '#ffebee', border: '1px solid #ffcdd2',
    borderRadius: '8px', color: '#e53935',
    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  },

  // ── Orders ────────────────────────────────────────────────
  orderCard: {
    background: '#fff', border: '1px solid #e3f2fd',
    borderRadius: '14px', overflow: 'hidden',
    boxShadow: '0 2px 10px rgba(33,150,243,0.05)',
  },
  orderHead: {
    display: 'flex', alignItems: 'center', gap: '16px',
    padding: '16px 20px', cursor: 'pointer',
  },
  orderLeft:   { minWidth: '90px' },
  orderId:     { color: '#000', fontSize: '13px', fontWeight: 700 },
  orderDate:   { color: '#aaa', fontSize: '12px', marginTop: '2px' },
  orderMid:    { flex: 1, minWidth: 0 },
  buyerName:   { color: '#000', fontSize: '14px', fontWeight: 600 },
  buyerEmail:  { color: '#888', fontSize: '12px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  orderRight:  { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' },
  statusBadge: { fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '10px', textTransform: 'capitalize' },
  orderEarn:   { color: '#2196F3', fontSize: '15px', fontWeight: 800 },
  orderBody:   { padding: '0 20px 18px', borderTop: '1px solid #f0f8ff' },
  orderItems:  { display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '14px', marginBottom: '14px' },
  orderItem:   { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: '#f8fbff', borderRadius: '10px' },
  orderItemImg: { width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 },
  orderItemTitle: { color: '#000', fontSize: '13px', fontWeight: 600 },
  orderItemMeta:  { color: '#888', fontSize: '12px', marginTop: '2px' },
  orderItemTotal: { color: '#2196F3', fontSize: '14px', fontWeight: 700, flexShrink: 0 },
  statusRow:   { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid #e3f2fd' },
  statusLabel: { color: '#777', fontSize: '12px', fontWeight: 600 },
  stBtn: {
    padding: '5px 12px', borderRadius: '8px',
    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
    textTransform: 'capitalize',
  },

  // Empty state
  empty: {
    textAlign: 'center', padding: '60px 24px',
    background: '#fff', borderRadius: '16px',
    border: '1px solid #e3f2fd',
  },

  // Analytics
  chartWrap: {
    background: '#fff', border: '1.5px solid #e3f2fd',
    borderRadius: '14px', padding: '20px 24px',
  },
  bsTable: { display: 'flex', flexDirection: 'column', gap: '2px' },
  bsHead: {
    display: 'grid', gridTemplateColumns: '32px 1fr 120px 100px 110px',
    gap: '12px', padding: '8px 12px',
    background: '#f0f8ff', borderRadius: '10px',
    marginBottom: '4px',
  },
  bsRow: {
    display: 'grid', gridTemplateColumns: '32px 1fr 120px 100px 110px',
    gap: '12px', padding: '10px 12px',
    background: '#fff', borderRadius: '10px',
    border: '1px solid #f0f8ff', alignItems: 'center',
  },
  bsHeadCell: { color: '#888', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' },
  bsRank:     { color: '#2196F3', fontSize: '14px', fontWeight: 800 },
  bsProduct:  { display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 },
  bsImg:      { width: '36px', height: '36px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 },
  bsTitle:    { color: '#000', fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  bsCell:     { color: '#555', fontSize: '13px' },
}

// ── CSS bar chart (no external library) ──────────────────────
const BarChart = ({ data }) => {
  const maxRev = Math.max(...data.map(d => Number(d.revenue) || 0), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '180px', paddingBottom: '28px', position: 'relative' }}>
      {data.map((d, i) => {
        const h = Math.max((Number(d.revenue) / maxRev) * 130, 4)
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', position: 'relative' }}>
            <span style={{ fontSize: '10px', color: '#2196F3', fontWeight: 700, position: 'absolute', top: `${130 - h - 18}px` }}>
              ${Number(d.revenue) >= 1000 ? (Number(d.revenue) / 1000).toFixed(1) + 'k' : Number(d.revenue).toFixed(0)}
            </span>
            <div style={{
              width: '100%', height: `${h}px`,
              background: 'linear-gradient(180deg, #2196F3 0%, #42A5F5 100%)',
              borderRadius: '6px 6px 0 0',
              position: 'absolute', bottom: '28px',
            }} />
            <span style={{ fontSize: '10px', color: '#888', textAlign: 'center', lineHeight: 1.2, position: 'absolute', bottom: 0 }}>
              {d.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default SellerDashboard
