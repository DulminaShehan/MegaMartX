// ============================================================
// NotificationBell — bell icon with unread badge + dropdown
// Polls every 30 s; marks all read on open
// ============================================================

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { FiBell, FiX } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { getNotifications, markNotificationsRead, deleteNotification } from '../firebase/firestore'
import { formatDate } from '../utils/helpers'

const TYPE_ICONS = {
  price_drop:    '💸',
  back_in_stock: '📦',
  order:         '🛍️',
  info:          'ℹ️',
}

const NotificationBell = () => {
  const { currentUser } = useAuth()
  const [open, setOpen]   = useState(false)
  const [data, setData]   = useState({ notifications: [], unread: 0 })
  const dropRef           = useRef(null)

  const load = () => {
    if (!currentUser) return
    getNotifications(currentUser.uid).then(setData).catch(() => {})
  }

  useEffect(() => {
    load()
    const iv = setInterval(load, 30000)
    return () => clearInterval(iv)
  }, [currentUser])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = () => {
    const next = !open
    setOpen(next)
    if (next && data.unread > 0) {
      markNotificationsRead(currentUser.uid)
        .then(() => setData(d => ({
          ...d, unread: 0,
          notifications: d.notifications.map(n => ({ ...n, isRead: 1 })),
        })))
        .catch(() => {})
    }
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    await deleteNotification(currentUser.uid, id).catch(() => {})
    setData(d => ({ ...d, notifications: d.notifications.filter(n => n.id !== id) }))
  }

  const clearAll = () => {
    Promise.all(data.notifications.map(n => deleteNotification(currentUser.uid, n.id).catch(() => {})))
      .then(() => setData({ notifications: [], unread: 0 }))
  }

  return (
    <div style={s.wrap} ref={dropRef}>
      <button style={s.bell} onClick={handleOpen} title="Notifications">
        <FiBell size={18} />
        {data.unread > 0 && (
          <span style={s.badge}>{data.unread > 9 ? '9+' : data.unread}</span>
        )}
      </button>

      {open && (
        <div style={s.drop}>
          <div style={s.dropHead}>
            <span style={s.dropTitle}>Notifications</span>
            {data.notifications.length > 0 && (
              <button style={s.clearBtn} onClick={clearAll}>Clear all</button>
            )}
          </div>

          {data.notifications.length === 0 ? (
            <div style={s.empty}>
              <FiBell size={30} color="#e3f2fd" />
              <p style={s.emptyText}>No notifications yet</p>
            </div>
          ) : (
            <div style={s.list}>
              {data.notifications.slice(0, 10).map(n => (
                <div
                  key={n.id}
                  style={{ ...s.item, background: n.isRead ? '#fff' : '#f0f8ff' }}
                >
                  <span style={s.typeIcon}>{TYPE_ICONS[n.type] || '🔔'}</span>
                  <div style={s.itemBody}>
                    <p style={s.itemTitle}>{n.title}</p>
                    <p style={s.itemMsg}>{n.message}</p>
                    <div style={s.itemFooter}>
                      <span style={s.itemDate}>{formatDate(n.createdAt)}</span>
                      {n.productId && (
                        <Link
                          to={`/product/${n.productId}`}
                          style={s.viewLink}
                          onClick={() => setOpen(false)}
                        >
                          View →
                        </Link>
                      )}
                    </div>
                  </div>
                  <button style={s.delBtn} onClick={e => handleDelete(n.id, e)}>
                    <FiX size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationBell

const s = {
  wrap: { position: 'relative' },

  bell: {
    position: 'relative', background: 'none', border: 'none',
    cursor: 'pointer', color: '#000', padding: '6px',
    display: 'flex', alignItems: 'center',
  },
  badge: {
    position: 'absolute', top: '-3px', right: '-3px',
    background: '#e53935', color: '#fff',
    fontSize: '10px', fontWeight: 700,
    minWidth: '16px', height: '16px', borderRadius: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 3px',
  },

  drop: {
    position: 'absolute', top: 'calc(100% + 10px)', right: 0,
    width: '320px', maxHeight: '420px',
    background: '#fff', border: '1.5px solid #e3f2fd',
    borderRadius: '16px', boxShadow: '0 8px 32px rgba(33,150,243,0.14)',
    zIndex: 999, overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
  },

  dropHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 16px', borderBottom: '1px solid #e3f2fd', flexShrink: 0,
  },
  dropTitle: { color: '#000', fontSize: '14px', fontWeight: 700 },
  clearBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#2196F3', fontSize: '12px', fontWeight: 600,
  },

  list:  { overflowY: 'auto', flex: 1 },
  item: {
    display: 'flex', gap: '10px', padding: '12px 16px',
    borderBottom: '1px solid #f5f5f5', alignItems: 'flex-start',
    transition: 'background .15s',
  },
  typeIcon:  { fontSize: '18px', flexShrink: 0, marginTop: '2px' },
  itemBody:  { flex: 1, minWidth: 0 },
  itemTitle: { color: '#000', fontSize: '13px', fontWeight: 700, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  itemMsg:   { color: '#555', fontSize: '12px', margin: '0 0 5px', lineHeight: 1.4 },
  itemFooter:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  itemDate:  { color: '#bbb', fontSize: '11px' },
  viewLink:  { color: '#2196F3', fontSize: '11px', fontWeight: 600, textDecoration: 'none' },
  delBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#ccc', padding: '2px', flexShrink: 0,
    transition: 'color .15s',
  },

  empty: {
    padding: '32px 20px', textAlign: 'center',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
  },
  emptyText: { color: '#aaa', fontSize: '13px', margin: 0 },
}
