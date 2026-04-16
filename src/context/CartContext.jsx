// ============================================================
// CartContext — shopping cart with MySQL sync for logged-in users
//
// When logged in  → cart is loaded from / synced to MySQL
// When guest      → cart lives in localStorage only
//
// All state updates are optimistic (instant UI) and then
// confirmed/corrected by the API response in the background.
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

/** Convert a MySQL cart row → the shape used by CartItem / Cart components */
const fromDb = (row) => ({
  id:         row.productId,            // product UUID (used as key & for lookups)
  dbCartId:   row.id,                   // MySQL auto-increment id (for PUT/DELETE)
  title:      row.title      || '',
  price:      parseFloat(row.price) || 0,
  imageUrl:   row.imageUrl   || '',
  sellerUid:  row.sellerUid  || '',
  sellerName: row.sellerName || '',
  quantity:   row.quantity   || 1,
})

/** Build an item for the local cart from a product object */
const fromProduct = (product, qty) => ({
  id:         product.id,
  dbCartId:   null,
  title:      product.title      || '',
  price:      parseFloat(product.price) || 0,
  imageUrl:   product.imageUrl   || '',
  sellerUid:  product.sellerUid  || '',
  sellerName: product.sellerName || '',
  quantity:   qty,
})

// ─────────────────────────────────────────────────────────────

export const CartProvider = ({ children }) => {
  const { currentUser } = useAuth()
  const uid             = currentUser?.uid

  const [cartItems,   setCartItems]   = useState([])
  const [cartLoading, setCartLoading] = useState(false)

  // Track the uid we last loaded a cart for so we only re-fetch on real changes
  const loadedUidRef = useRef(null)

  // ── Load cart whenever uid changes ───────────────────────────
  useEffect(() => {
    if (uid === loadedUidRef.current) return
    loadedUidRef.current = uid

    if (!uid) {
      // Guest: read from localStorage
      try {
        const saved = localStorage.getItem('megamartx_cart')
        setCartItems(saved ? JSON.parse(saved) : [])
      } catch {
        setCartItems([])
      }
      return
    }

    // Logged-in: fetch MySQL cart, then merge any localStorage items
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

        // Merge items that were added while the user was a guest
        if (localItems.length > 0) {
          const dbProductIds = new Set(normalized.map(i => i.id))
          for (const local of localItems) {
            if (!dbProductIds.has(local.id)) {
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
      .catch(() => {
        // API unreachable — fall back to the local items so the UI still works
        setCartItems(localItems)
      })
      .finally(() => setCartLoading(false))
  }, [uid])

  // ── Persist to localStorage when guest ───────────────────────
  useEffect(() => {
    if (!uid) {
      localStorage.setItem('megamartx_cart', JSON.stringify(cartItems))
    }
  }, [cartItems, uid])

  // ── Add to cart ───────────────────────────────────────────────
  const addToCart = async (product, qty = 1) => {
    const alreadyIn = cartItems.some(i => i.id === product.id)
    toast.success(alreadyIn ? 'Cart updated!' : 'Added to cart!')

    if (uid) {
      // Optimistic update first
      setCartItems(prev => {
        const existing = prev.find(i => i.id === product.id)
        if (existing) {
          return prev.map(i =>
            i.id === product.id ? { ...i, quantity: i.quantity + qty } : i
          )
        }
        return [...prev, fromProduct(product, qty)]
      })

      // Sync to DB; update dbCartId once we have it
      try {
        const dbRow = await addToCartDB(uid, product, qty)
        setCartItems(prev =>
          prev.map(i => i.id === product.id ? fromDb(dbRow) : i)
        )
      } catch (err) {
        console.warn('Cart add sync error:', err.message)
      }
    } else {
      // Guest: localStorage only
      setCartItems(prev => {
        const existing = prev.find(i => i.id === product.id)
        if (existing) {
          return prev.map(i =>
            i.id === product.id ? { ...i, quantity: i.quantity + qty } : i
          )
        }
        return [...prev, { ...product, quantity: qty, dbCartId: null }]
      })
    }
  }

  // ── Remove from cart ──────────────────────────────────────────
  const removeFromCart = async (productId) => {
    const item = cartItems.find(i => i.id === productId)
    setCartItems(prev => prev.filter(i => i.id !== productId))
    toast.success('Item removed from cart')

    if (uid && item?.dbCartId) {
      try {
        await removeCartItemDB(item.dbCartId)
      } catch (err) {
        console.warn('Cart remove sync error:', err.message)
      }
    }
  }

  // ── Update quantity ───────────────────────────────────────────
  const updateQuantity = async (productId, qty) => {
    if (qty < 1) { removeFromCart(productId); return }

    const item = cartItems.find(i => i.id === productId)
    setCartItems(prev =>
      prev.map(i => i.id === productId ? { ...i, quantity: qty } : i)
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

  // ── Derived values ─────────────────────────────────────────────
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
