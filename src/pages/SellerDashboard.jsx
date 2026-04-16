// ============================================================
// Seller Dashboard — Products tab + Orders tab
// ============================================================

import { useState, useEffect, useRef } from 'react'
import {
  FiPlus, FiEdit2, FiTrash2, FiX, FiUpload,
  FiPackage, FiDollarSign, FiGrid, FiPercent,
  FiImage, FiTag, FiInfo, FiLayers, FiCheckCircle,
  FiAlertCircle, FiBox, FiShoppingBag, FiChevronDown, FiChevronUp,
  FiClock, FiTruck, FiCheck,
} from 'react-icons/fi'
import {
  addProduct, updateProduct, deleteProduct,
  getSellerProducts, getSellerOrders, updateOrderStatus,
} from '../firebase/firestore'
import { uploadProductImage, deleteProductImage } from '../firebase/storage'
import { useAuth } from '../context/AuthContext'
import { formatPrice, formatDate, CATEGORIES, STATUS_COLORS, imgFallback } from '../utils/helpers'
import { FullPageLoader } from '../components/Loader'
import toast from 'react-hot-toast'

const EMPTY_FORM = {
  title: '', description: '', category: 'Electronics',
  brand: '', stock: '', price: '', originalPrice: '',
  imageUrl: '', imagePath: '',
}

const TABS = ['My Products', 'Orders']

// ─────────────────────────────────────────────────────────────
const SellerDashboard = () => {
  const { currentUser, userProfile } = useAuth()
  const [tab, setTab]           = useState('My Products')
  const [products, setProducts] = useState([])
  const [orders, setOrders]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [editId, setEditId]     = useState(null)
  const [saving, setSaving]     = useState(false)
  const [imgFile, setImgFile]   = useState(null)
  const [preview, setPreview]   = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [hoverImg, setHoverImg] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const fileRef = useRef(null)

  // ── Load data ─────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      getSellerProducts(currentUser.uid),
      getSellerOrders(currentUser.uid).catch(() => []),
    ]).then(([prods, ords]) => {
      setProducts(prods)
      setOrders(ords)
    }).catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  const reloadProducts = async () => {
    const data = await getSellerProducts(currentUser.uid)
    setProducts(data)
  }

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  // ── Image ─────────────────────────────────────────────────
  const processImage = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Select an image file'); return }
    if (file.size > 5 * 1024 * 1024)    { toast.error('Image must be under 5 MB'); return }
    setImgFile(file); setPreview(URL.createObjectURL(file))
  }
  const onFilePick  = e  => processImage(e.target.files[0])
  const onDrop      = e  => { e.preventDefault(); setDragOver(false); processImage(e.dataTransfer.files[0]) }
  const onDragOver  = e  => { e.preventDefault(); setDragOver(true) }
  const onDragLeave = () => setDragOver(false)

  // ── Modal open ────────────────────────────────────────────
  const openAdd = () => {
    setForm(EMPTY_FORM); setEditId(null)
    setImgFile(null); setPreview(''); setModal(true)
  }
  const openEdit = (p) => {
    setForm({
      title: p.title || '', description: p.description || '',
      category: p.category || 'Electronics', brand: p.brand || '',
      stock: p.stock ?? '', price: p.price || '', originalPrice: p.originalPrice || '',
      imageUrl: p.imageUrl || '', imagePath: p.imagePath || '',
    })
    setEditId(p.id); setPreview(p.imageUrl || ''); setImgFile(null); setModal(true)
  }

  // ── Discount ──────────────────────────────────────────────
  const discountPct = () => {
    const p = parseFloat(form.price), o = parseFloat(form.originalPrice)
    return (p > 0 && o > p) ? Math.round(((o - p) / o) * 100) : null
  }

  // ── Save product ──────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim())               { toast.error('Title is required'); return }
    if (!form.description.trim())         { toast.error('Description is required'); return }
    if (!form.price || isNaN(form.price)) { toast.error('Valid price is required'); return }
    if (!imgFile && !form.imageUrl)       { toast.error('Please upload a product image'); return }

    setSaving(true)
    try {
      let { imageUrl, imagePath } = form
      if (imgFile) {
        if (editId && imagePath) await deleteProductImage(imagePath).catch(() => {})
        const up = await uploadProductImage(imgFile, currentUser.uid)
        imageUrl = up.url; imagePath = up.path
      }
      const payload = {
        title: form.title.trim(), description: form.description.trim(),
        category: form.category, brand: form.brand.trim(),
        price: parseFloat(form.price),
        originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : null,
        discount: discountPct(),
        stock: form.stock !== '' ? parseInt(form.stock) : null,
        imageUrl, imagePath,
        sellerUid: currentUser.uid,
        sellerName: userProfile?.name || currentUser.displayName || 'Seller',
        storeName: userProfile?.storeName || '',
      }
      if (editId) { await updateProduct(editId, payload); toast.success('Product updated!') }
      else        { await addProduct(payload);            toast.success('Product added!') }
      setModal(false); reloadProducts()
    } catch (err) { console.error(err); toast.error('Failed to save. Try again.') }
    finally { setSaving(false) }
  }

  // ── Delete product ────────────────────────────────────────
  const handleDelete = async (product) => {
    if (!window.confirm(`Delete "${product.title}"?`)) return
    try {
      await deleteProduct(product.id)
      if (product.imagePath) await deleteProductImage(product.imagePath).catch(() => {})
      setProducts(prev => prev.filter(p => p.id !== product.id))
      toast.success('Product deleted')
    } catch { toast.error('Failed to delete') }
  }

  // ── Order status ──────────────────────────────────────────
  const handleStatus = async (orderId, status) => {
    try {
      await updateOrderStatus(orderId, status)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
      toast.success('Order status updated')
    } catch { toast.error('Failed to update status') }
  }

  // ── Stats ─────────────────────────────────────────────────
  const totalValue   = products.reduce((s, p) => s + (p.price || 0), 0)
  const cats         = [...new Set(products.map(p => p.category))].length
  const discCount    = products.filter(p => p.discount > 0).length
  const pendingOrds  = orders.filter(o => o.status === 'pending').length

  if (loading) return <FullPageLoader />

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <div style={s.container}>

        {/* Page Header */}
        <div style={s.pageHeader}>
          <div>
            <h1 style={s.pageTitle}>Seller Dashboard</h1>
            <p style={s.pageSub}>
              Welcome, <strong style={{ color: '#2196F3' }}>
                {userProfile?.storeName || userProfile?.name || 'Seller'}
              </strong>
            </p>
          </div>
          {tab === 'My Products' && (
            <button style={s.addBtn} onClick={openAdd}>
              <FiPlus size={17} /> Add New Product
            </button>
          )}
        </div>

        {/* Stats Row */}
        <div style={s.statsRow}>
          {[
            { icon: FiPackage,    label: 'Products',       val: products.length,         color: '#2196F3', bg: '#e3f2fd' },
            { icon: FiDollarSign, label: 'Catalogue Value',val: formatPrice(totalValue),  color: '#10b981', bg: '#e8f5e9' },
            { icon: FiShoppingBag,label: 'Total Orders',   val: orders.length,            color: '#7c3aed', bg: '#f3e8ff' },
            { icon: FiClock,      label: 'Pending Orders', val: pendingOrds,              color: '#f59e0b', bg: '#fff8e1' },
            { icon: FiPercent,    label: 'On Discount',    val: discCount,                color: '#e53935', bg: '#fce4ec' },
          ].map(({ icon: Icon, label, val, color, bg }) => (
            <div key={label} style={s.statCard}>
              <div style={{ ...s.statIcon, background: bg, color }}><Icon size={20} /></div>
              <div>
                <p style={s.statVal}>{val}</p>
                <p style={s.statLabel}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={s.tabBar}>
          {TABS.map(t => (
            <button
              key={t}
              style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }}
              onClick={() => setTab(t)}
            >
              {t === 'Orders' && pendingOrds > 0 && (
                <span style={s.tabBadge}>{pendingOrds}</span>
              )}
              {t}
            </button>
          ))}
        </div>

        {/* ═══ PRODUCTS TAB ═══ */}
        {tab === 'My Products' && (
          <div style={s.panel}>
            <div style={s.panelHead}>
              <h2 style={s.panelTitle}>
                My Products <span style={s.countPill}>{products.length}</span>
              </h2>
            </div>

            {products.length === 0 ? (
              <div style={s.empty}>
                <div style={s.emptyIcon}><FiPackage size={40} color="#90caf9" /></div>
                <p style={s.emptyTitle}>No products yet</p>
                <p style={s.emptySub}>Add your first product to start selling</p>
                <button style={s.addBtn} onClick={openAdd}><FiPlus size={15} /> Add Product</button>
              </div>
            ) : (
              <div style={s.grid}>
                {products.map(p => (
                  <ProductCard key={p.id} product={p}
                    onEdit={() => openEdit(p)} onDelete={() => handleDelete(p)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ ORDERS TAB ═══ */}
        {tab === 'Orders' && (
          <div style={s.panel}>
            <div style={s.panelHead}>
              <h2 style={s.panelTitle}>
                My Orders <span style={s.countPill}>{orders.length}</span>
              </h2>
            </div>

            {orders.length === 0 ? (
              <div style={s.empty}>
                <div style={s.emptyIcon}><FiShoppingBag size={40} color="#90caf9" /></div>
                <p style={s.emptyTitle}>No orders yet</p>
                <p style={s.emptySub}>Orders from buyers will appear here</p>
              </div>
            ) : (
              <div style={s.orderList}>
                {orders.map(order => {
                  const myItems = (order.items || []).filter(
                    i => i.sellerUid === currentUser.uid
                  )
                  const myTotal = myItems.reduce(
                    (s, i) => s + i.price * i.quantity, 0
                  )
                  const isOpen = expanded === order.id
                  const sc = STATUS_COLORS[order.status] || '#888'

                  return (
                    <div key={order.id} style={s.orderCard}>
                      {/* Order header row */}
                      <div
                        style={s.orderHead}
                        onClick={() => setExpanded(isOpen ? null : order.id)}
                      >
                        <div style={s.orderLeft}>
                          <p style={s.orderId}>#{order.id.slice(-8).toUpperCase()}</p>
                          <p style={s.orderDate}>{formatDate(order.createdAt)}</p>
                        </div>

                        <div style={s.orderMid}>
                          <div style={s.buyerInfo}>
                            <div style={s.buyerAvatar}>
                              {order.userName?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <p style={s.buyerName}>{order.userName || 'Customer'}</p>
                              <p style={s.buyerEmail}>{order.userEmail}</p>
                            </div>
                          </div>
                        </div>

                        <div style={s.orderRight}>
                          <span style={s.orderItemCount}>
                            {myItems.length} item{myItems.length !== 1 ? 's' : ''}
                          </span>
                          <span style={s.orderTotal}>{formatPrice(myTotal)}</span>
                          <span style={{
                            ...s.statusBadge,
                            color: sc,
                            background: sc + '18',
                            border: `1px solid ${sc}44`,
                          }}>
                            {order.status
                              ? order.status.charAt(0).toUpperCase() + order.status.slice(1)
                              : 'Pending'}
                          </span>
                          {isOpen
                            ? <FiChevronUp size={15} color="#aaa" />
                            : <FiChevronDown size={15} color="#aaa" />}
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isOpen && (
                        <div style={s.orderDetail}>

                          {/* Items from this seller only */}
                          <p style={s.detailSectionLabel}>Your items in this order</p>
                          <div style={s.itemsList}>
                            {myItems.map((item, i) => (
                              <div key={i} style={s.itemRow}>
                                <img
                                  src={item.imageUrl || imgFallback(50, 50)}
                                  alt={item.title}
                                  style={s.itemImg}
                                  onError={e => { e.target.src = imgFallback(50, 50) }}
                                />
                                <div style={s.itemInfo}>
                                  <p style={s.itemTitle}>{item.title}</p>
                                  <p style={s.itemQty}>Qty: {item.quantity}</p>
                                </div>
                                <span style={s.itemPrice}>
                                  {formatPrice(item.price * item.quantity)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Total for this seller */}
                          <div style={s.myTotalRow}>
                            <span style={s.myTotalLabel}>Your earnings from this order</span>
                            <span style={s.myTotalVal}>{formatPrice(myTotal)}</span>
                          </div>

                          {/* Status control */}
                          <div style={s.statusRow}>
                            <p style={s.detailSectionLabel} >Update Order Status</p>
                            <div style={s.statusBtns}>
                              {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(st => {
                                const active = order.status === st
                                const c = STATUS_COLORS[st] || '#888'
                                return (
                                  <button
                                    key={st}
                                    style={{
                                      ...s.statusBtn,
                                      background: active ? c : '#f9fcff',
                                      color: active ? '#fff' : c,
                                      border: `1.5px solid ${c}`,
                                    }}
                                    onClick={() => handleStatus(order.id, st)}
                                  >
                                    {st.charAt(0).toUpperCase() + st.slice(1)}
                                  </button>
                                )
                              })}
                            </div>
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
      </div>

      {/* ═══════════════════════════════
          ADD / EDIT PRODUCT MODAL
      ═══════════════════════════════ */}
      {modal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={s.modal}>

            <div style={s.modalHeader}>
              <div>
                <h2 style={s.modalTitle}>{editId ? 'Edit Product' : 'Add New Product'}</h2>
                <p style={s.modalSub}>Fill in all the details below</p>
              </div>
              <button style={s.closeBtn} onClick={() => setModal(false)}><FiX size={20} /></button>
            </div>

            <form onSubmit={handleSubmit}>

              {/* 1 — Image */}
              <FormSection step="1" icon={<FiImage size={14} />} title="Product Image" required>
                <div
                  style={{ ...s.dropZone, ...(dragOver ? s.dropActive : {}), ...(preview ? s.dropHasImg : {}) }}
                  onClick={() => fileRef.current.click()}
                  onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
                >
                  {preview ? (
                    <div style={s.previewWrap}
                      onMouseEnter={() => setHoverImg(true)}
                      onMouseLeave={() => setHoverImg(false)}
                    >
                      <img src={preview} alt="preview" style={s.previewImg} />
                      <div style={{ ...s.previewOverlay, opacity: hoverImg ? 1 : 0 }}>
                        <FiUpload size={22} color="#fff" />
                        <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>Click to change</span>
                      </div>
                    </div>
                  ) : (
                    <div style={s.dropContent}>
                      <div style={s.dropIconBox}><FiUpload size={28} color="#2196F3" /></div>
                      <p style={s.dropTitle}>Drag & drop or click to upload</p>
                      <p style={s.dropSub}>PNG · JPG · WEBP — max 5 MB</p>
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept="image/*"
                    style={{ display: 'none' }} onChange={onFilePick} />
                </div>
              </FormSection>

              {/* 2 — Product Info */}
              <FormSection step="2" icon={<FiInfo size={14} />} title="Product Information" required>
                <div style={s.fieldStack}>
                  <Field label="Product Title *">
                    <input style={s.input} name="title"
                      placeholder="e.g. Wireless Bluetooth Headphones Pro Max"
                      value={form.title} onChange={handleChange} maxLength={120} />
                    <span style={s.charCount}>{form.title.length}/120</span>
                  </Field>
                  <Field label="Description *">
                    <textarea style={{ ...s.input, minHeight: '100px', resize: 'vertical' }}
                      name="description"
                      placeholder="Describe your product — features, materials, dimensions, what's included…"
                      value={form.description} onChange={handleChange} maxLength={1000} />
                    <span style={s.charCount}>{form.description.length}/1000</span>
                  </Field>
                  <Field label="Brand / Manufacturer (optional)">
                    <input style={s.input} name="brand"
                      placeholder="e.g. Sony, Nike, Samsung"
                      value={form.brand} onChange={handleChange} />
                  </Field>
                </div>
              </FormSection>

              {/* 3 — Category & Stock */}
              <FormSection step="3" icon={<FiLayers size={14} />} title="Category & Stock">
                <div style={s.row2}>
                  <Field label="Category *">
                    <select style={s.select} name="category"
                      value={form.category} onChange={handleChange}>
                      {CATEGORIES.slice(1).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Stock Quantity">
                    <div style={s.inputIcon}>
                      <FiBox size={14} color="#90caf9" />
                      <input style={s.inputInner} name="stock" type="number" min="0"
                        placeholder="e.g. 50" value={form.stock} onChange={handleChange} />
                    </div>
                    {form.stock !== '' && (
                      <span style={{ ...s.stockHint, color: parseInt(form.stock) > 0 ? '#10b981' : '#e53935' }}>
                        {parseInt(form.stock) > 0 ? `${form.stock} units listed` : 'Will show Out of Stock'}
                      </span>
                    )}
                  </Field>
                </div>
              </FormSection>

              {/* 4 — Pricing */}
              <FormSection step="4" icon={<FiTag size={14} />} title="Pricing & Discount" required>
                <div style={s.row2}>
                  <Field label="Selling Price (USD) *">
                    <div style={s.priceWrap}>
                      <span style={s.pricePfx}>$</span>
                      <input style={s.priceInput} name="price" type="number"
                        min="0" step="0.01" placeholder="0.00"
                        value={form.price} onChange={handleChange} required />
                    </div>
                  </Field>
                  <Field label="Original Price (for discount)">
                    <div style={s.priceWrap}>
                      <span style={s.pricePfx}>$</span>
                      <input style={s.priceInput} name="originalPrice" type="number"
                        min="0" step="0.01" placeholder="0.00"
                        value={form.originalPrice} onChange={handleChange} />
                    </div>
                  </Field>
                </div>

                {discountPct() !== null ? (
                  <div style={s.discountBox}>
                    <div style={s.discountLeft}>
                      <span style={s.discBadgeLg}>{discountPct()}% OFF</span>
                      <div>
                        <p style={s.discTitle}>Discount Active</p>
                        <p style={s.discSub}>
                          Customers save <strong>
                            {formatPrice(parseFloat(form.originalPrice) - parseFloat(form.price))}
                          </strong>
                        </p>
                      </div>
                    </div>
                    <div style={s.discPrices}>
                      <span style={s.discSellPrice}>{formatPrice(parseFloat(form.price))}</span>
                      <span style={s.discOrigPrice}>{formatPrice(parseFloat(form.originalPrice))}</span>
                    </div>
                  </div>
                ) : (
                  <div style={s.discountTip}>
                    <FiAlertCircle size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
                    <span>Set <strong>Original Price</strong> higher than Selling Price to show a discount badge.</span>
                  </div>
                )}
              </FormSection>

              <button type="submit"
                style={{ ...s.saveBtn, opacity: saving ? 0.75 : 1 }}
                disabled={saving}
              >
                {saving
                  ? <><div style={s.btnSpinner} />{editId ? 'Updating…' : 'Adding…'}</>
                  : <><FiCheckCircle size={18} />{editId ? 'Update Product' : 'Add Product to Store'}</>
                }
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Product Card ──────────────────────────────────────────────
const ProductCard = ({ product: p, onEdit, onDelete }) => (
  <div style={pc.card}>
    <div style={pc.imgBox}>
      <img src={p.imageUrl || imgFallback(300, 200)} alt={p.title} style={pc.img}
        onError={e => { e.target.src = imgFallback(300, 200) }} />
      {p.discount > 0 && <span style={pc.discBadge}>-{p.discount}%</span>}
      <span style={pc.catBadge}>{p.category}</span>
    </div>
    <div style={pc.body}>
      <p style={pc.title}>{p.title}</p>
      {p.brand && <p style={pc.brand}>{p.brand}</p>}
      <p style={pc.desc}>{p.description?.slice(0, 80)}{p.description?.length > 80 ? '…' : ''}</p>
      <div style={pc.priceRow}>
        <span style={pc.price}>{formatPrice(p.price)}</span>
        {p.originalPrice > p.price && <span style={pc.origPrice}>{formatPrice(p.originalPrice)}</span>}
        {p.discount > 0 && <span style={pc.savePill}>Save {p.discount}%</span>}
      </div>
      <div style={pc.stockRow}>
        <div style={{ ...pc.stockDot, background: p.stock > 0 ? '#10b981' : '#e53935' }} />
        <span style={{ ...pc.stockLabel, color: p.stock > 0 ? '#10b981' : '#e53935' }}>
          {p.stock != null ? (p.stock > 0 ? `${p.stock} in stock` : 'Out of stock') : 'Stock not set'}
        </span>
      </div>
      <div style={pc.actions}>
        <button style={pc.editBtn} onClick={onEdit}><FiEdit2 size={13} /> Edit</button>
        <button style={pc.delBtn} onClick={onDelete}><FiTrash2 size={13} /> Delete</button>
      </div>
    </div>
  </div>
)

// ── FormSection ───────────────────────────────────────────────
const FormSection = ({ step, icon, title, required, children }) => (
  <div style={fs.wrap}>
    <div style={fs.header}>
      <div style={fs.stepBadge}>{step}</div>
      <div style={{ color: '#2196F3' }}>{icon}</div>
      <span style={fs.title}>{title}</span>
      {required && <span style={fs.req}>required</span>}
    </div>
    <div style={fs.body}>{children}</div>
  </div>
)

const Field = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
    <label style={{ color: '#444', fontSize: '12px', fontWeight: 600 }}>{label}</label>
    {children}
  </div>
)

// ── Styles ────────────────────────────────────────────────────
const s = {
  page:      { background: '#f8fbff', minHeight: '100vh', padding: '32px 0 72px' },
  container: { maxWidth: '1200px', margin: '0 auto', padding: '0 20px' },

  pageHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '28px',
  },
  pageTitle: { color: '#000', fontSize: '26px', fontWeight: 700, margin: '0 0 4px' },
  pageSub:   { color: '#777', fontSize: '14px', margin: 0 },

  addBtn: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '11px 22px',
    background: 'linear-gradient(135deg, #2196F3 0%, #1565C0 100%)',
    color: '#fff', border: 'none', borderRadius: '10px',
    fontSize: '14px', fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(33,150,243,0.35)',
  },

  statsRow: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
    gap: '14px', marginBottom: '24px',
  },
  statCard: {
    display: 'flex', alignItems: 'center', gap: '14px',
    background: '#fff', border: '1px solid #e3f2fd',
    borderRadius: '14px', padding: '16px 18px',
    boxShadow: '0 2px 8px rgba(33,150,243,0.05)',
  },
  statIcon: {
    width: '44px', height: '44px', borderRadius: '12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  statVal:   { color: '#000', fontSize: '22px', fontWeight: 800, margin: '0 0 2px' },
  statLabel: { color: '#777', fontSize: '12px', margin: 0 },

  // Tabs
  tabBar: {
    display: 'flex', gap: '4px',
    borderBottom: '2px solid #e3f2fd', marginBottom: '24px',
  },
  tab: {
    position: 'relative',
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '11px 22px', background: 'none', border: 'none',
    borderBottom: '2px solid transparent', marginBottom: '-2px',
    color: '#888', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
  },
  tabActive: { color: '#2196F3', borderBottomColor: '#2196F3', fontWeight: 700 },
  tabBadge: {
    background: '#e53935', color: '#fff',
    fontSize: '10px', fontWeight: 800,
    padding: '1px 6px', borderRadius: '20px',
  },

  // Panel
  panel: {
    background: '#fff', border: '1px solid #e3f2fd',
    borderRadius: '16px', padding: '24px',
    boxShadow: '0 2px 12px rgba(33,150,243,0.05)',
  },
  panelHead: { marginBottom: '20px' },
  panelTitle: {
    color: '#000', fontSize: '17px', fontWeight: 700, margin: 0,
    display: 'flex', alignItems: 'center', gap: '10px',
  },
  countPill: {
    background: '#e3f2fd', color: '#1565C0',
    borderRadius: '20px', padding: '2px 10px',
    fontSize: '13px', fontWeight: 700,
  },

  empty: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '10px', padding: '60px 24px',
  },
  emptyIcon: {
    width: '80px', height: '80px', background: '#e3f2fd',
    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: '6px',
  },
  emptyTitle: { color: '#000', fontSize: '18px', fontWeight: 700, margin: 0 },
  emptySub:   { color: '#888', fontSize: '14px', margin: 0 },

  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px',
  },

  // Orders
  orderList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  orderCard: {
    border: '1.5px solid #e3f2fd', borderRadius: '14px', overflow: 'hidden',
    background: '#fff',
  },
  orderHead: {
    display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px',
    padding: '16px 20px', cursor: 'pointer',
    borderBottom: '1px solid transparent',
  },
  orderLeft: { minWidth: '120px' },
  orderId:   { color: '#000', fontSize: '14px', fontWeight: 700, margin: '0 0 3px' },
  orderDate: { color: '#aaa', fontSize: '12px', margin: 0 },
  orderMid:  { flex: 1, minWidth: '160px' },
  buyerInfo: { display: 'flex', alignItems: 'center', gap: '10px' },
  buyerAvatar: {
    width: '34px', height: '34px', borderRadius: '50%',
    background: '#e3f2fd', color: '#2196F3',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '14px', fontWeight: 700, flexShrink: 0,
  },
  buyerName:  { color: '#000', fontSize: '13px', fontWeight: 600, margin: '0 0 2px' },
  buyerEmail: { color: '#aaa', fontSize: '11px', margin: 0 },
  orderRight: {
    display: 'flex', alignItems: 'center', gap: '12px',
    flexWrap: 'wrap', marginLeft: 'auto',
  },
  orderItemCount: { color: '#777', fontSize: '12px' },
  orderTotal: { color: '#2196F3', fontSize: '15px', fontWeight: 800 },
  statusBadge: {
    fontSize: '12px', fontWeight: 600, padding: '4px 12px', borderRadius: '20px',
  },

  orderDetail: {
    borderTop: '1px solid #e3f2fd', padding: '18px 20px',
    background: '#f9fcff',
    display: 'flex', flexDirection: 'column', gap: '16px',
  },
  detailSectionLabel: {
    color: '#555', fontSize: '12px', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0,
  },
  itemsList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  itemRow: {
    display: 'flex', alignItems: 'center', gap: '12px',
    background: '#fff', border: '1px solid #e3f2fd',
    borderRadius: '10px', padding: '10px 14px',
  },
  itemImg: {
    width: '48px', height: '48px', objectFit: 'cover',
    borderRadius: '8px', background: '#e3f2fd', flexShrink: 0,
  },
  itemInfo: { flex: 1, minWidth: 0 },
  itemTitle: {
    color: '#000', fontSize: '13px', fontWeight: 500, margin: '0 0 3px',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  itemQty:   { color: '#888', fontSize: '12px', margin: 0 },
  itemPrice: { color: '#2196F3', fontSize: '14px', fontWeight: 700, flexShrink: 0 },

  myTotalRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: '#e3f2fd', borderRadius: '10px', padding: '12px 16px',
  },
  myTotalLabel: { color: '#555', fontSize: '13px', fontWeight: 600 },
  myTotalVal:   { color: '#1565C0', fontSize: '18px', fontWeight: 800 },

  statusRow:  { display: 'flex', flexDirection: 'column', gap: '10px' },
  statusBtns: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  statusBtn: {
    padding: '7px 16px', border: 'none', borderRadius: '20px',
    fontSize: '12px', fontWeight: 700, cursor: 'pointer',
    transition: 'all .15s',
  },

  // Modal
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 2000, padding: '16px', backdropFilter: 'blur(3px)',
  },
  modal: {
    background: '#fff', borderRadius: '20px', padding: '28px',
    width: '100%', maxWidth: '580px', maxHeight: '94vh', overflowY: 'auto',
    boxShadow: '0 28px 70px rgba(33,150,243,0.2)',
    animation: 'fadeIn .2s ease',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: '20px',
  },
  modalTitle: { color: '#000', fontSize: '20px', fontWeight: 700, margin: '0 0 3px' },
  modalSub:   { color: '#aaa', fontSize: '13px', margin: 0 },
  closeBtn: {
    background: '#f0f8ff', border: '1px solid #bbdefb',
    borderRadius: '8px', color: '#555', cursor: 'pointer',
    padding: '7px', display: 'flex', flexShrink: 0,
  },

  dropZone: {
    border: '2px dashed #bbdefb', borderRadius: '12px', minHeight: '160px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', overflow: 'hidden', background: '#f5fbff', transition: 'all .2s',
  },
  dropActive:  { border: '2px dashed #2196F3', background: '#e3f2fd' },
  dropHasImg:  { border: '2px solid #bbdefb', minHeight: '200px' },
  dropContent: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '24px',
  },
  dropIconBox: {
    width: '56px', height: '56px', background: '#e3f2fd', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px',
  },
  dropTitle: { color: '#000', fontSize: '14px', fontWeight: 600, margin: 0 },
  dropSub:   { color: '#aaa', fontSize: '12px', margin: 0 },
  previewWrap:    { position: 'relative', width: '100%' },
  previewImg:     { width: '100%', maxHeight: '220px', objectFit: 'cover', display: 'block' },
  previewOverlay: {
    position: 'absolute', inset: 0, background: 'rgba(33,150,243,0.6)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: '6px', transition: 'opacity .2s',
  },

  fieldStack: { display: 'flex', flexDirection: 'column', gap: '14px' },
  row2:       { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },
  input: {
    width: '100%', background: '#fff', border: '1.5px solid #bbdefb',
    borderRadius: '8px', color: '#000', fontSize: '14px', padding: '10px 12px',
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  },
  select: {
    width: '100%', background: '#fff', border: '1.5px solid #bbdefb',
    borderRadius: '8px', color: '#000', fontSize: '14px', padding: '10px 12px',
    outline: 'none', cursor: 'pointer',
  },
  charCount:  { color: '#ccc', fontSize: '11px', textAlign: 'right', marginTop: '2px' },
  inputIcon: {
    display: 'flex', alignItems: 'center', gap: '10px', background: '#fff',
    border: '1.5px solid #bbdefb', borderRadius: '8px', padding: '0 12px',
  },
  inputInner: {
    flex: 1, background: 'none', border: 'none', outline: 'none',
    color: '#000', fontSize: '14px', padding: '10px 0',
  },
  stockHint: { fontSize: '11px', fontWeight: 600, marginTop: '3px' },
  priceWrap:  { display: 'flex', alignItems: 'stretch' },
  pricePfx: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px',
    background: '#e3f2fd', border: '1.5px solid #bbdefb',
    borderRight: 'none', borderRadius: '8px 0 0 8px',
    color: '#1565C0', fontWeight: 800, fontSize: '15px',
  },
  priceInput: {
    flex: 1, background: '#fff', border: '1.5px solid #bbdefb',
    borderRadius: '0 8px 8px 0', color: '#000', fontSize: '14px',
    padding: '10px 12px', outline: 'none',
  },
  discountBox: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: '12px',
    background: 'linear-gradient(135deg, #fff8e1 0%, #fffde7 100%)',
    border: '1.5px solid #ffe082', borderRadius: '12px', padding: '14px 16px', marginTop: '12px',
  },
  discountLeft:  { display: 'flex', alignItems: 'center', gap: '12px' },
  discBadgeLg: {
    background: '#e53935', color: '#fff',
    fontSize: '14px', fontWeight: 800, padding: '6px 14px', borderRadius: '20px', flexShrink: 0,
  },
  discTitle: { color: '#000', fontSize: '13px', fontWeight: 700, margin: '0 0 2px' },
  discSub:   { color: '#777', fontSize: '12px', margin: 0 },
  discPrices: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' },
  discSellPrice: { color: '#2196F3', fontSize: '18px', fontWeight: 800 },
  discOrigPrice: { color: '#bbb', fontSize: '12px', textDecoration: 'line-through' },
  discountTip: {
    display: 'flex', alignItems: 'flex-start', gap: '8px',
    background: '#fffde7', border: '1px solid #ffe082',
    borderRadius: '8px', padding: '10px 14px', marginTop: '12px',
    color: '#777', fontSize: '12px', lineHeight: '1.6',
  },
  saveBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px',
    width: '100%', marginTop: '8px', padding: '15px',
    background: 'linear-gradient(135deg, #2196F3 0%, #1565C0 100%)',
    color: '#fff', border: 'none', borderRadius: '12px',
    fontSize: '16px', fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 18px rgba(33,150,243,0.4)',
  },
  btnSpinner: {
    width: '18px', height: '18px',
    border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff',
    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
  },
}

const pc = {
  card: {
    background: '#fff', border: '1.5px solid #e3f2fd', borderRadius: '14px',
    overflow: 'hidden', boxShadow: '0 2px 10px rgba(33,150,243,0.06)',
    display: 'flex', flexDirection: 'column',
  },
  imgBox: { position: 'relative', paddingTop: '62%', background: '#f0f8ff', overflow: 'hidden' },
  img: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  discBadge: {
    position: 'absolute', top: '8px', left: '8px',
    background: '#e53935', color: '#fff', fontSize: '11px', fontWeight: 800,
    padding: '3px 9px', borderRadius: '20px',
  },
  catBadge: {
    position: 'absolute', top: '8px', right: '8px',
    background: 'rgba(33,150,243,0.9)', color: '#fff', fontSize: '10px', fontWeight: 600,
    padding: '3px 8px', borderRadius: '20px',
  },
  body: { padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '7px', flex: 1 },
  title: { color: '#000', fontSize: '14px', fontWeight: 700, margin: 0, lineHeight: '1.4' },
  brand: { color: '#90caf9', fontSize: '11px', fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' },
  desc:  { color: '#888', fontSize: '12px', margin: 0, lineHeight: '1.5', flex: 1 },
  priceRow: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  price:    { color: '#2196F3', fontSize: '18px', fontWeight: 800 },
  origPrice:{ color: '#bbb', fontSize: '12px', textDecoration: 'line-through' },
  savePill: {
    background: '#fff3e0', color: '#e65100', border: '1px solid #ffcc80',
    fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px',
  },
  stockRow:  { display: 'flex', alignItems: 'center', gap: '6px' },
  stockDot:  { width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0 },
  stockLabel:{ fontSize: '12px', fontWeight: 600 },
  actions:   { display: 'flex', gap: '8px', marginTop: '4px' },
  editBtn: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
    padding: '9px', background: '#e3f2fd', border: '1px solid #bbdefb',
    borderRadius: '8px', color: '#1565C0', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  },
  delBtn: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
    padding: '9px', background: '#fff0f0', border: '1px solid #fecaca',
    borderRadius: '8px', color: '#e53935', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  },
}

const fs = {
  wrap: { border: '1.5px solid #e3f2fd', borderRadius: '14px', overflow: 'hidden', marginBottom: '16px' },
  header: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: '#f5fbff', borderBottom: '1.5px solid #e3f2fd', padding: '12px 16px',
  },
  stepBadge: {
    width: '22px', height: '22px', borderRadius: '50%', background: '#2196F3', color: '#fff',
    fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  title: { color: '#000', fontSize: '13px', fontWeight: 700, flex: 1 },
  req:   { color: '#e53935', fontSize: '11px', fontWeight: 600 },
  body:  { padding: '18px 16px' },
}

export default SellerDashboard
