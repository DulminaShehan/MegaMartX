// ============================================================
// CartContext — shopping cart with MySQL sync for logged-in users
//
// Cart items are uniquely identified by variantKey = "productId|color|size"
// so the same product in different color/size combos is tracked separately.
// ============================================================

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from './AuthContext'
import {
  getCart,
  addToCartDB,
  updateCartItemQty,
  removeCartItemDB,
  clearCartDB,
} from '../firebase/firestore'

const CartContext = createContext(null)
export const useCart = () => useContext(CartContext)

// ── Shape helpers ─────────────────────────────────────────────

const mkKey = (productId, color = '', size = '') => `${productId}|${color}|${size}`

const fromDb = (row) => ({
  id:         row.productId,
  variantKey: mkKey(row.productId, row.color, row.size),
  dbCartId:   row.id,
  title:      row.title      || '',
  price:      parseFloat(row.price) || 0,
  imageUrl:   row.imageUrl   || '',
  sellerUid:  row.sellerUid  || '',
  sellerName: row.sellerName || '',
  quantity:   row.quantity   || 1,
  color:      row.color      || '',
  size:       row.size       || '',
})

const fromProduct = (product, qty, color = '', size = '') => ({
  id:         product.id,
  variantKey: mkKey(product.id, color, size),
  dbCartId:   null,
  title:      product.title      || '',
  price:      parseFloat(product.price) || 0,
  imageUrl:   product.imageUrl   || '',
  sellerUid:  product.sellerUid  || '',
  sellerName: product.sellerName || '',
  quantity:   qty,
  color,
  size,
})

// ─────────────────────────────────────────────────────────────

export const CartProvider = ({ children }) => {
  const { currentUser } = useAuth()
  const uid             = currentUser?.uid

  const [cartItems,   setCartItems]   = useState([])
  const [cartLoading, setCartLoading] = useState(false)

  const loadedUidRef = useRef(null)

  // ── Load cart whenever uid changes ───────────────────────────
  useEffect(() => {
    if (uid === loadedUidRef.current) return
    loadedUidRef.current = uid

    if (!uid) {
      try {
        const saved = localStorage.getItem('megamartx_cart')
        setCartItems(saved ? JSON.parse(saved) : [])
      } catch {
        setCartItems([])
      }
      return
    }

    setCartLoading(true)
    const localItems = (() => {
      try {
        const saved = localStorage.getItem('megamartx_cart')
        return saved ? JSON.parse(saved) : []
      } catch { return [] }
    })()

    getCart(uid)
      .then(async (dbRows) => {
        const normalized = dbRows.map(fromDb)

        if (localItems.length > 0) {
          const dbKeys = new Set(normalized.map(i => i.variantKey))
          for (const local of localItems) {
            const key = local.variantKey || mkKey(local.id, local.color, local.size)
            if (!dbKeys.has(key)) {
              try {
                const dbRow = await addToCartDB(uid, local, local.quantity)
                normalized.push(fromDb(dbRow))
              } catch { /* ignore individual merge errors */ }
            }
          }
          localStorage.removeItem('megamartx_cart')
        }

        setCartItems(normalized)
      })
      .catch(() => setCartItems(localItems))
      .finally(() => setCartLoading(false))
  }, [uid])

  // ── Persist to localStorage when guest ───────────────────────
  useEffect(() => {
    if (!uid) {
      localStorage.setItem('megamartx_cart', JSON.stringify(cartItems))
    }
  }, [cartItems, uid])

  // ── Add to cart ───────────────────────────────────────────────
  const addToCart = async (product, qty = 1, color = '', size = '') => {
    const vKey      = mkKey(product.id, color, size)
    const alreadyIn = cartItems.some(i => i.variantKey === vKey)
    toast.success(alreadyIn ? 'Cart updated!' : 'Added to cart!')

    if (uid) {
      setCartItems(prev => {
        const existing = prev.find(i => i.variantKey === vKey)
        if (existing) {
          return prev.map(i => i.variantKey === vKey ? { ...i, quantity: i.quantity + qty } : i)
        }
        return [...prev, fromProduct(product, qty, color, size)]
      })
      try {
        const dbRow = await addToCartDB(uid, { ...product, color, size }, qty)
        setCartItems(prev =>
          prev.map(i => i.variantKey === vKey ? fromDb(dbRow) : i)
        )
      } catch (err) {
        console.warn('Cart add sync error:', err.message)
      }
    } else {
      setCartItems(prev => {
        const existing = prev.find(i => i.variantKey === vKey)
        if (existing) {
          return prev.map(i => i.variantKey === vKey ? { ...i, quantity: i.quantity + qty } : i)
        }
        return [...prev, fromProduct(product, qty, color, size)]
      })
    }
  }

  // ── Remove from cart (by variantKey) ─────────────────────────
  const removeFromCart = async (variantKey) => {
    const item = cartItems.find(i => i.variantKey === variantKey)
    setCartItems(prev => prev.filter(i => i.variantKey !== variantKey))
    toast.success('Item removed from cart')

    if (uid && item?.dbCartId) {
      try {
        await removeCartItemDB(item.dbCartId)
      } catch (err) {
        console.warn('Cart remove sync error:', err.message)
      }
    }
  }

  // ── Update quantity (by variantKey) ──────────────────────────
  const updateQuantity = async (variantKey, qty) => {
    if (qty < 1) { removeFromCart(variantKey); return }

    const item = cartItems.find(i => i.variantKey === variantKey)
    setCartItems(prev =>
      prev.map(i => i.variantKey === variantKey ? { ...i, quantity: qty } : i)
    )

    if (uid && item?.dbCartId) {
      try {
        await updateCartItemQty(item.dbCartId, qty)
      } catch (err) {
        console.warn('Cart qty sync error:', err.message)
      }
    }
  }

  // ── Clear cart ────────────────────────────────────────────────
  const clearCart = async () => {
    setCartItems([])
    if (uid) {
      try {
        await clearCartDB(uid)
      } catch (err) {
        console.warn('Cart clear sync error:', err.message)
      }
    }
  }

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0)
  const cartTotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)

  const value = {
    cartItems,
    cartCount,
    cartTotal,
    cartLoading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
