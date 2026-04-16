// ============================================================
// API client — replaces Firestore with MySQL via Express API
// All function names are kept identical so the rest of the
// app requires zero changes.
// ============================================================

const BASE      = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const TOKEN_KEY = 'megamartx_token'

// ── Internal fetch helper — attaches JWT when available ───────
const api = async (method, path, body) => {
  const token = localStorage.getItem(TOKEN_KEY)
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `API ${method} ${path} failed (${res.status})`)
  }
  return res.json()
}

// ─── USERS ───────────────────────────────────────────────────

/** Create or update a user profile */
export const createUserProfile = (uid, data) =>
  api('POST', '/api/users', { uid, ...data })

/** Fetch a single user profile — returns null if not found */
export const getUserProfile = (uid) =>
  api('GET', `/api/users/${uid}`).catch(() => null)

/** Fetch all users (admin only) */
export const getAllUsers = () => api('GET', '/api/users')

/** Update user role */
export const updateUserRole = (uid, role) =>
  api('PUT', `/api/users/${uid}/role`, { role })

// ─── PRODUCTS ────────────────────────────────────────────────

/** Add a new product */
export const addProduct = (data) => api('POST', '/api/products', data)

/** Update an existing product */
export const updateProduct = (productId, data) =>
  api('PUT', `/api/products/${productId}`, data)

/** Delete a product */
export const deleteProduct = (productId) =>
  api('DELETE', `/api/products/${productId}`)

/** Get all products */
export const getAllProducts = () => api('GET', '/api/products')

/** Get products by seller UID */
export const getSellerProducts = (sellerUid) =>
  api('GET', `/api/products?sellerUid=${encodeURIComponent(sellerUid)}`)

/** Get a single product by ID — returns null if not found */
export const getProductById = (productId) =>
  api('GET', `/api/products/${productId}`).catch(() => null)

// ─── ORDERS ──────────────────────────────────────────────────

/** Place a new order */
export const placeOrder = (data) => api('POST', '/api/orders', data)

/** Get orders for a specific user */
export const getUserOrders = (uid) =>
  api('GET', `/api/orders/user/${encodeURIComponent(uid)}`)

/** Get orders that contain at least one product from this seller */
export const getSellerOrders = (sellerUid) =>
  api('GET', `/api/orders/seller/${encodeURIComponent(sellerUid)}`)

/** Get all orders (admin only) */
export const getAllOrders = () => api('GET', '/api/orders')

/** Update order status */
export const updateOrderStatus = (orderId, status) =>
  api('PUT', `/api/orders/${orderId}/status`, { status })

/** Get a single order by ID (for the order details page) */
export const getOrderById = (orderId) =>
  api('GET', `/api/orders/${orderId}`).catch(() => null)

// ─── CART ─────────────────────────────────────────────────────

/** Fetch all cart items for a logged-in user */
export const getCart = (userId) =>
  api('GET', `/api/cart/${encodeURIComponent(userId)}`)

/**
 * Add a product to the cart (or increment quantity if already there).
 * @param {string} userId  Firebase UID
 * @param {object} product { id, title, price, imageUrl, sellerUid, sellerName }
 * @param {number} quantity
 */
export const addToCartDB = (userId, product, quantity = 1) =>
  api('POST', '/api/cart', {
    userId,
    productId:  product.id,
    title:      product.title      || '',
    price:      product.price,
    imageUrl:   product.imageUrl   || '',
    sellerUid:  product.sellerUid  || '',
    sellerName: product.sellerName || '',
    quantity,
  })

/** Set an exact quantity for a cart row (uses the DB row id, not productId) */
export const updateCartItemQty = (cartItemId, quantity) =>
  api('PUT', `/api/cart/${cartItemId}`, { quantity })

/** Remove a single item from the cart (uses the DB row id) */
export const removeCartItemDB = (cartItemId) =>
  api('DELETE', `/api/cart/${cartItemId}`)

/** Clear a user's entire cart (called after a successful checkout) */
export const clearCartDB = (userId) =>
  api('DELETE', `/api/cart/user/${encodeURIComponent(userId)}`)
