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
} from 'react-icons/fi'
import {
  addProduct, updateProduct, deleteProduct,
  getSellerProducts, getSellerOrders, updateOrderStatus,
} from '../firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { formatPrice, formatDate, CATEGORIES, STATUS_COLORS, imgFallback } from '../utils/helpers'
import { FullPageLoader } from '../components/Loader'
import toast from 'react-hot-toast'

const API    = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const CATS   = CATEGORIES.filter(c => c !== 'All')

// ── Blank form state ──────────────────────────────────────────
const BLANK = { name: '', description: '', category: 'Electronics', price: '', discount: '', stock: '' }

// ── Nav items ─────────────────────────────────────────────────
const NAV = [
  { id: 'dashboard', label: 'Dashboard',   icon: FiGrid },
  { id: 'add',       label: 'Add Product', icon: FiPlus },
  { id: 'products',  label: 'My Products', icon: FiPackage },
  { id: 'orders',    label: 'Orders',      icon: FiShoppingBag },
]

// ─────────────────────────────────────────────────────────────
const SellerDashboard = () => {
  const { currentUser, userProfile, logout } = useAuth()

  const [view, setView]           = useState('dashboard')
  const [products, setProducts]   = useState([])
  const [orders, setOrders]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [saving,  setSaving]      = useState(false)
  const [editItem, setEditItem]   = useState(null)     // product being edited
  const [form, setForm]           = useState(BLANK)
  const [imgFile, setImgFile]     = useState(null)
  const [preview, setPreview]     = useState('')
  const [dragOver, setDragOver]   = useState(false)
  const [expanded, setExpanded]   = useState(null)     // expanded order id
  const fileRef = useRef(null)

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
  const processImage = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Select an image file'); return }
    if (file.size > 5 * 1024 * 1024)    { toast.error('Image must be under 5 MB'); return }
    setImgFile(file)
    setPreview(URL.createObjectURL(file))
  }
  const onFilePick  = e  => processImage(e.target.files[0])
  const onDrop      = e  => { e.preventDefault(); setDragOver(false); processImage(e.dataTransfer.files[0]) }
  const onDragOver  = e  => { e.preventDefault(); setDragOver(true) }
  const onDragLeave = () => setDragOver(false)

  // ── Open edit form ──────────────────────────────────────────
  const openEdit = (p) => {
    setEditItem(p)
    setForm({
      name:        p.title || '',
      description: p.description || '',
      category:    p.category || 'Electronics',
      price:       p.price || '',
      discount:    p.discount || '',
      stock:       p.stock || '',
    })
    setPreview(p.imageUrl || '')
    setImgFile(null)
    setView('add')
  }

  const resetForm = () => { setForm(BLANK); setEditItem(null); setImgFile(null); setPreview('') }

  // ── Save product ────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim())               { toast.error('Product name is required');    return }
    if (!form.description.trim())        { toast.error('Description is required');     return }
    if (!form.price || isNaN(form.price)){ toast.error('Enter a valid price');         return }
    if (!imgFile && !preview)            { toast.error('Upload a product image');      return }

    setSaving(true)
    try {
      // Upload image via multer if a new file was chosen
      let imageUrl = preview
      if (imgFile) {
        const fd = new FormData()
        fd.append('image', imgFile)
        const { data } = await axios.post(`${API}/api/upload`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        imageUrl = data.url
      }

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
        imageUrl,
        sellerUid:     currentUser.uid,
        sellerName:    userProfile?.name  || currentUser.displayName || 'Seller',
        storeName:     userProfile?.storeName || '',
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
      toast.error(err.response?.data?.error || 'Failed to save. Try again.')
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
      toast.success(`Status → ${status}`)
    } catch { toast.error('Failed to update') }
  }

  if (loading) return <FullPageLoader />

  // ── Aggregated stats ────────────────────────────────────────
  const catalogueValue = products.reduce((s, p) => s + (parseFloat(p.price) * (parseInt(p.stock) || 1)), 0)
  const pendingCount   = orders.filter(o => o.status === 'pending').length
  const onDiscount     = products.filter(p => parseFloat(p.discount) > 0).length

  return (
    <div style={s.root}>

      {/* ══════════════════════════════════════════════════
          SIDEBAR
      ══════════════════════════════════════════════════ */}
      <aside style={s.sidebar}>

        {/* Brand */}
        <div style={s.brand}>
          <span style={s.brandText}>Mega<span style={s.brandBlue}>Mart</span>X</span>
          <span style={s.brandBadge}>Seller</span>
        </div>

        {/* Seller info */}
        <div style={s.sellerCard}>
          <div style={s.avatar}>{(userProfile?.name || 'S')[0].toUpperCase()}</div>
          <div style={{ minWidth: 0 }}>
            <div style={s.sellerName}>{userProfile?.name || 'Seller'}</div>
            <div style={s.storeName}>{userProfile?.storeName || 'My Store'}</div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={s.nav}>
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              style={{ ...s.navItem, ...(view === id ? s.navActive : {}) }}
              onClick={() => { if (id === 'add') resetForm(); setView(id) }}
            >
              <Icon size={16} />
              <span style={s.navLabel}>{label}</span>
              {id === 'orders' && pendingCount > 0 && (
                <span style={s.navBadge}>{pendingCount}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Logout at bottom */}
        <button style={s.logoutBtn} onClick={logout}>
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

              {/* ── Image upload ── */}
              <div style={s.formCard}>
                <div style={s.cardHead}><FiImage size={15} /> Product Image</div>

                <div
                  style={{ ...s.dropZone, ...(dragOver ? s.dropZoneActive : {}) }}
                  onClick={() => fileRef.current?.click()}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                >
                  {preview ? (
                    <div style={s.previewWrap}>
                      <img src={preview} alt="preview" style={s.previewImg} />
                      <button
                        type="button"
                        style={s.removeImg}
                        onClick={e => { e.stopPropagation(); setPreview(''); setImgFile(null) }}
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                  ) : (
                    <div style={s.dropContent}>
                      <FiUpload size={28} color="#90caf9" />
                      <p style={s.dropText}>Click or drag &amp; drop to upload</p>
                      <p style={s.dropHint}>PNG, JPG, WEBP — max 5 MB</p>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFilePick} />
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
                    <label style={s.label}>Stock Quantity</label>
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

                  {/* Final price preview */}
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
                      <div style={s.formulaNote}>
                        Final Price = Price − (Price × Discount / 100)
                      </div>
                    </div>
                  )}

                </div>
              </div>

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
                            {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(st => (
                              <button
                                key={st}
                                style={{
                                  ...s.stBtn,
                                  background: order.status === st ? STATUS_COLORS[st] : 'transparent',
                                  color:      order.status === st ? '#fff' : STATUS_COLORS[st],
                                  border:     `1.5px solid ${STATUS_COLORS[st]}`,
                                }}
                                onClick={() => handleStatus(order.id, st)}
                              >
                                {st}
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

  // Drop zone
  dropZone: {
    border: '2px dashed #bbdefb', borderRadius: '12px',
    background: '#f0f8ff', cursor: 'pointer',
    minHeight: '160px', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    transition: 'border-color .2s, background .2s',
  },
  dropZoneActive: { borderColor: '#2196F3', background: '#e3f2fd' },
  dropContent: { textAlign: 'center', padding: '20px' },
  dropText:    { color: '#555', fontSize: '14px', margin: '10px 0 4px', fontWeight: 500 },
  dropHint:    { color: '#aaa', fontSize: '12px', margin: 0 },
  previewWrap: { position: 'relative', width: '100%', maxWidth: '340px' },
  previewImg:  { width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', display: 'block' },
  removeImg: {
    position: 'absolute', top: '8px', right: '8px',
    background: 'rgba(0,0,0,0.6)', color: '#fff',
    border: 'none', borderRadius: '50%',
    width: '26px', height: '26px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
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
}

export default SellerDashboard
