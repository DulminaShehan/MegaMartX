// ============================================================
// API client — replaces Firestore with MySQL via Express API
// All function names are kept identical so the rest of the
// app requires zero changes.
// ============================================================

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// ── Internal fetch helper ─────────────────────────────────────
const api = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
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
