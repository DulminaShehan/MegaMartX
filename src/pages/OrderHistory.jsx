// ============================================================
// Order History — white + blue theme
// ============================================================

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiPackage, FiChevronDown, FiChevronUp } from 'react-icons/fi'
import { getUserOrders } from '../firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { formatPrice, formatDate, STATUS_COLORS, imgFallback } from '../utils/helpers'
import { FullPageLoader } from '../components/Loader'

const OrderHistory = () => {
  const { currentUser } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    getUserOrders(currentUser.uid)
      .then(setOrders).catch(console.error).finally(() => setLoading(false))
  }, [currentUser])

  if (loading) return <FullPageLoader />

  if (orders.length === 0) return (
    <div style={s.empty}>
      <div style={s.emptyIcon}><FiPackage size={44} color="#2196F3" /></div>
      <h2 style={s.emptyTitle}>No orders yet</h2>
      <p style={s.emptySub}>You haven't placed any orders yet.</p>
      <Link to="/shop" style={s.shopBtn}>Browse Products</Link>
    </div>
  )

  return (
    <div style={s.page}>
      <div style={s.container}>
        <h1 style={s.title}>My Orders</h1>
        <p style={s.sub}>{orders.length} order{orders.length !== 1 ? 's' : ''} in your history</p>

        <div style={s.list}>
          {orders.map(order => (
            <div key={order.id} style={s.card}>
              {/* Header row */}
              <div style={s.cardHead} onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                <div>
                  <p style={s.orderId}>Order #{order.id.slice(-8).toUpperCase()}</p>
                  <p style={s.orderDate}>{formatDate(order.createdAt)}</p>
                </div>
                <div style={s.cardRight}>
                  <span style={{
                    ...s.statusBadge,
                    color: STATUS_COLORS[order.status] || '#555',
                    background: (STATUS_COLORS[order.status] || '#888') + '18',
                    border: `1px solid ${(STATUS_COLORS[order.status] || '#888') + '44'}`,
                  }}>
                    {order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Pending'}
                  </span>
                  <span style={s.orderTotal}>{formatPrice(order.total)}</span>
                  {expanded === order.id ? <FiChevronUp size={15} color="#aaa" /> : <FiChevronDown size={15} color="#aaa" />}
                </div>
              </div>

              {/* Expanded details */}
              {expanded === order.id && (
                <div style={s.details}>
                  <div style={s.items}>
                    {order.items?.map((item, i) => (
                      <div key={i} style={s.itemRow}>
                        <img src={item.imageUrl || imgFallback(50,50)} alt={item.title} style={s.itemImg} onError={e => { e.target.src = imgFallback(50,50) }} />
                        <div style={s.itemInfo}>
                          <p style={s.itemTitle}>{item.title}</p>
                          <p style={s.itemQty}>Qty: {item.quantity}</p>
                        </div>
                        <span style={s.itemPrice}>{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div style={s.summary}>
                    {[
                      ['Subtotal', formatPrice(order.subtotal)],
                      ['Shipping', order.shipping === 0 ? 'FREE' : formatPrice(order.shipping)],
                      ['Tax', formatPrice(order.tax)],
                    ].map(([l, v]) => (
                      <div key={l} style={s.sRow}><span style={s.sLabel}>{l}</span><span style={s.sVal}>{v}</span></div>
                    ))}
                    <div style={{ ...s.sRow, borderTop:'1px solid #e3f2fd', paddingTop:'10px', marginTop:'4px' }}>
                      <span style={{ color:'#000', fontWeight:700 }}>Total</span>
                      <span style={{ color:'#2196F3', fontWeight:800, fontSize:'16px' }}>{formatPrice(order.total)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const s = {
  page: { background:'#fff', minHeight:'80vh', padding:'40px 0 64px' },
  container: { maxWidth:'800px', margin:'0 auto', padding:'0 20px' },
  title: { color:'#000', fontSize:'26px', fontWeight:700, margin:'0 0 4px' },
  sub: { color:'#777', fontSize:'14px', margin:'0 0 28px' },
  list: { display:'flex', flexDirection:'column', gap:'12px' },
  card: { background:'#fff', border:'1.5px solid #e3f2fd', borderRadius:'14px', overflow:'hidden', boxShadow:'0 2px 10px rgba(33,150,243,0.06)' },
  cardHead: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', cursor:'pointer', flexWrap:'wrap', gap:'10px' },
  orderId: { color:'#000', fontSize:'14px', fontWeight:700, margin:'0 0 3px' },
  orderDate: { color:'#aaa', fontSize:'12px', margin:0 },
  cardRight: { display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap' },
  statusBadge: { fontSize:'12px', fontWeight:600, padding:'4px 12px', borderRadius:'20px' },
  orderTotal: { color:'#000', fontSize:'15px', fontWeight:700 },
  details: { borderTop:'1px solid #e3f2fd', padding:'16px 20px' },
  items: { display:'flex', flexDirection:'column', gap:'10px', marginBottom:'14px' },
  itemRow: { display:'flex', alignItems:'center', gap:'12px', padding:'10px', background:'#f0f8ff', border:'1px solid #e3f2fd', borderRadius:'10px' },
  itemImg: { width:'46px', height:'46px', objectFit:'cover', borderRadius:'8px', background:'#e3f2fd', flexShrink:0 },
  itemInfo: { flex:1, minWidth:0 },
  itemTitle: { color:'#000', fontSize:'13px', fontWeight:500, margin:'0 0 3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  itemQty: { color:'#888', fontSize:'12px', margin:0 },
  itemPrice: { color:'#2196F3', fontSize:'13px', fontWeight:700, flexShrink:0 },
  summary: { background:'#f9fcff', border:'1px solid #e3f2fd', borderRadius:'10px', padding:'14px 16px', display:'flex', flexDirection:'column', gap:'8px' },
  sRow: { display:'flex', justifyContent:'space-between' },
  sLabel: { color:'#777', fontSize:'13px' },
  sVal: { color:'#000', fontSize:'13px', fontWeight:500 },
  empty: { minHeight:'70vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'14px', padding:'40px' },
  emptyIcon: { width:'88px', height:'88px', background:'#e3f2fd', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' },
  emptyTitle: { color:'#000', fontSize:'22px', fontWeight:700, margin:0 },
  emptySub: { color:'#777', fontSize:'14px', margin:0 },
  shopBtn: { marginTop:'8px', padding:'12px 32px', background:'#2196F3', color:'#fff', borderRadius:'10px', fontWeight:700, boxShadow:'0 4px 14px rgba(33,150,243,0.28)' },
}

export default OrderHistory
