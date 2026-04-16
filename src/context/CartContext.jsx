// ============================================================
// CartContext — manages shopping cart state (localStorage backed)
// ============================================================

import { createContext, useContext, useEffect, useState } from 'react'
import toast from 'react-hot-toast'

const CartContext = createContext(null)

export const useCart = () => useContext(CartContext)

export const CartProvider = ({ children }) => {
  // Load cart from localStorage on first render
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('megamartx_cart')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('megamartx_cart', JSON.stringify(cartItems))
  }, [cartItems])

  // ── Add to cart ───────────────────────────────────────────
  const addToCart = (product, qty = 1) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      if (existing) {
        toast.success('Cart updated!')
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + qty }
            : item
        )
      }
      toast.success('Added to cart!')
      return [...prev, { ...product, quantity: qty }]
    })
  }

  // ── Remove from cart ──────────────────────────────────────
  const removeFromCart = (productId) => {
    setCartItems((prev) => prev.filter((item) => item.id !== productId))
    toast.success('Item removed from cart')
  }

  // ── Update quantity ───────────────────────────────────────
  const updateQuantity = (productId, qty) => {
    if (qty < 1) {
      removeFromCart(productId)
      return
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, quantity: qty } : item
      )
    )
  }

  // ── Clear entire cart ─────────────────────────────────────
  const clearCart = () => setCartItems([])

  // ── Derived values ─────────────────────────────────────────
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )

  const value = {
    cartItems,
    cartCount,
    cartTotal,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
