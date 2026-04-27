// ============================================================
// ChatWindow — real-time-style chat via 3 s polling
// Route: /messages/:convId
// ============================================================

import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiSend, FiPackage, FiUser } from 'react-icons/fi'
import { getConversationMessages, sendMessage } from '../firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { formatDate } from '../utils/helpers'
import { FullPageLoader } from '../components/Loader'
import toast from 'react-hot-toast'

const ChatWindow = () => {
  const { convId }         = useParams()
  const { currentUser }    = useAuth()
  const navigate           = useNavigate()

  const [conv, setConv]     = useState(null)
  const [msgs, setMsgs]     = useState([])
  const [text, setText]     = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef           = useRef(null)
  const pollRef             = useRef(null)

  const load = async (quiet = false) => {
    try {
      const data = await getConversationMessages(convId)
      setConv(data.conversation)
      setMsgs(data.messages)
      if (!quiet) setLoading(false)
    } catch (err) {
      if (!quiet) {
        toast.error('Could not load conversation')
        navigate('/messages')
      }
    }
  }

  useEffect(() => {
    load()
    // Poll every 3 s for new messages while window is open
    pollRef.current = setInterval(() => load(true), 3000)
    return () => clearInterval(pollRef.current)
  }, [convId])

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true)
    const draft = text.trim()
    setText('')
    try {
      const newMsg = await sendMessage(convId, draft)
      setMsgs(prev => [...prev, newMsg])
    } catch (err) {
      toast.error('Failed to send message')
      setText(draft)
    } finally {
      setSending(false)
    }
  }

  if (loading) return <FullPageLoader />
  if (!conv)   return null

  const isBuyer    = conv.buyerId === currentUser.uid
  const otherName  = isBuyer ? conv.sellerName : conv.buyerName
  const otherRole  = isBuyer ? 'Seller' : 'Buyer'

  return (
    <div style={s.page}>
      <div style={s.container}>

        {/* ── Header ── */}
        <div style={s.header}>
          <button style={s.back} onClick={() => navigate('/messages')}>
            <FiArrowLeft size={16} />
          </button>
          <div style={s.avatar}><FiUser size={18} color="#2196F3" /></div>
          <div style={s.headerInfo}>
            <p style={s.otherName}>{otherName || 'User'}</p>
            <p style={s.role}>{otherRole}</p>
          </div>
          {conv.productId && (
            <Link to={`/product/${conv.productId}`} style={s.productChip}>
              <FiPackage size={13} />
              {conv.productTitle ? conv.productTitle.slice(0, 30) + (conv.productTitle.length > 30 ? '…' : '') : 'View Product'}
            </Link>
          )}
        </div>

        {/* ── Messages ── */}
        <div style={s.messages}>
          {msgs.length === 0 && (
            <div style={s.emptyChat}>
              <FiPackage size={28} color="#bbb" />
              <p style={{ color: '#aaa', fontSize: '13px', margin: '10px 0 0' }}>
                No messages yet. Say hello!
              </p>
            </div>
          )}

          {msgs.map((m, i) => {
            const isMine = m.senderId === currentUser.uid
            const showDate = i === 0 ||
              new Date(m.createdAt).toDateString() !== new Date(msgs[i - 1].createdAt).toDateString()
            return (
              <div key={m.id}>
                {showDate && (
                  <div style={s.dateDivider}>
                    <span style={s.dateLabel}>{formatDate(m.createdAt)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: '6px' }}>
                  <div style={{ maxWidth: '72%' }}>
                    <div style={{ ...s.bubble, ...(isMine ? s.bubbleMine : s.bubbleOther) }}>
                      {m.text}
                    </div>
                    <p style={{ ...s.time, textAlign: isMine ? 'right' : 'left' }}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* ── Input ── */}
        <form onSubmit={handleSend} style={s.inputRow}>
          <input
            style={s.input}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type a message…"
            disabled={sending}
          />
          <button type="submit" style={{ ...s.sendBtn, opacity: sending || !text.trim() ? 0.6 : 1 }} disabled={sending || !text.trim()}>
            <FiSend size={16} />
          </button>
        </form>

      </div>
    </div>
  )
}

const s = {
  page:      { background: '#fff', height: 'calc(100vh - 66px)', display: 'flex', flexDirection: 'column' },
  container: { maxWidth: '720px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100%', padding: '0 0 16px' },

  // Header
  header: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '16px 20px', borderBottom: '1.5px solid #e3f2fd',
    background: '#fff', flexShrink: 0,
  },
  back: {
    background: '#f0f8ff', border: '1.5px solid #bbdefb',
    borderRadius: '8px', color: '#2196F3', cursor: 'pointer',
    width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatar: {
    width: '40px', height: '40px', borderRadius: '50%',
    background: '#e3f2fd', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  headerInfo: { flex: 1, minWidth: 0 },
  otherName: { color: '#000', fontSize: '14px', fontWeight: 700, margin: 0 },
  role:      { color: '#888', fontSize: '12px', margin: 0 },
  productChip: {
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    background: '#e3f2fd', color: '#2196F3',
    border: '1px solid #bbdefb', borderRadius: '8px',
    padding: '5px 10px', fontSize: '12px', fontWeight: 600,
    maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    flexShrink: 0,
  },

  // Messages area
  messages: {
    flex: 1, overflowY: 'auto',
    padding: '16px 20px', display: 'flex', flexDirection: 'column',
  },
  emptyChat: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0' },
  dateDivider: { textAlign: 'center', margin: '14px 0 8px' },
  dateLabel: {
    display: 'inline-block',
    background: '#f0f8ff', color: '#90caf9',
    fontSize: '11px', fontWeight: 600,
    padding: '3px 12px', borderRadius: '20px',
  },

  bubble: {
    padding: '10px 14px', borderRadius: '16px',
    fontSize: '14px', lineHeight: 1.5,
    wordBreak: 'break-word',
  },
  bubbleMine: {
    background: '#2196F3', color: '#fff',
    borderBottomRightRadius: '4px',
  },
  bubbleOther: {
    background: '#f0f8ff', color: '#000',
    border: '1px solid #e3f2fd',
    borderBottomLeftRadius: '4px',
  },
  time: { color: '#bbb', fontSize: '10px', margin: '3px 4px 0' },

  // Input
  inputRow: {
    display: 'flex', gap: '10px', alignItems: 'center',
    padding: '12px 20px 0',
    borderTop: '1.5px solid #e3f2fd',
    flexShrink: 0,
  },
  input: {
    flex: 1, padding: '11px 16px',
    border: '1.5px solid #bbdefb', borderRadius: '24px',
    background: '#f0f8ff', color: '#000',
    fontSize: '14px', outline: 'none',
  },
  sendBtn: {
    width: '42px', height: '42px', borderRadius: '50%',
    background: '#2196F3', color: '#fff',
    border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 3px 12px rgba(33,150,243,0.35)',
  },
}

export default ChatWindow
