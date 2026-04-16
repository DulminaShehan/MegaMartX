// ============================================================
// MegaMartX API Server — Express + MySQL
// Port: 5000  (frontend is on 3002)
// ============================================================

const express  = require('express')
const cors     = require('cors')
const mysql    = require('mysql2/promise')
const { v4: uuidv4 } = require('uuid')
const path     = require('path')
const fs       = require('fs')
const multer   = require('multer')
const bcrypt   = require('bcryptjs')
const jwt      = require('jsonwebtoken')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const JWT_SECRET  = process.env.JWT_SECRET  || 'megamartx-dev-secret'
const JWT_EXPIRES = '7d'

// ── JWT middleware ────────────────────────────────────────────
const requireAuth = (req, res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Unauthorized — login required' })
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Token invalid or expired — please login again' })
  }
}

// Optional auth — attaches req.user if token present, never blocks
const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    try { req.user = jwt.verify(header.slice(7), JWT_SECRET) } catch { /* ignore */ }
  }
  next()
}

// ── Stripe (optional — only active when key is present) ───────
let stripe = null
if (process.env.STRIPE_SECRET_KEY) {
  try {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
    console.log('✅ Stripe loaded')
  } catch { console.warn('⚠️  stripe package not found — card payments disabled') }
}

const app  = express()
const PORT = process.env.API_PORT || 5000

app.use(cors({ origin: '*' }))
app.use(express.json())

// ── Multer — local image storage ──────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase()
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`
    cb(null, name)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },          // 5 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Only image files are allowed'))
  },
})

// Serve uploaded images as static files
app.use('/uploads', express.static(uploadsDir))

// POST /api/upload — upload a single product image
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
  const url = `http://localhost:${PORT}/uploads/${req.file.filename}`
  res.json({ url, filename: req.file.filename })
})

const DB_NAME = process.env.DB_NAME || 'megamartx'
const DB_CONFIG = {
  host:             process.env.DB_HOST || 'localhost',
  port:             process.env.DB_PORT || 3306,
  user:             process.env.DB_USER || 'root',
  password:         process.env.DB_PASS,
  waitForConnections: true,
  connectionLimit:  10,
}

// ── Auto-create database if it doesn't exist ─────────────────
const ensureDatabase = async () => {
  const tmp = await mysql.createConnection(DB_CONFIG)
  await tmp.execute(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``)
  await tmp.end()
  console.log(`✅ Database '${DB_NAME}' ready`)
}

// ── MySQL connection pool (created after DB exists) ───────────
let pool

// ── Auto-create tables on startup ────────────────────────────
const initDB = async () => {
  const conn = await pool.getConnection()
  try {
    // Users
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS users (
        uid        VARCHAR(128) PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        email      VARCHAR(255) UNIQUE NOT NULL,
        role       ENUM('user','seller','admin') DEFAULT 'user',
        storeName  VARCHAR(255) DEFAULT '',
        phone      VARCHAR(50)  DEFAULT '',
        photoURL   TEXT,
        createdAt  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Products
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id            VARCHAR(36)  PRIMARY KEY,
        sellerUid     VARCHAR(128) NOT NULL,
        sellerName    VARCHAR(255) DEFAULT '',
        title         VARCHAR(500) NOT NULL,
        description   TEXT,
        brand         VARCHAR(255) DEFAULT '',
        category      VARCHAR(255) DEFAULT '',
        price         DECIMAL(10,2) NOT NULL,
        originalPrice DECIMAL(10,2),
        discount      INT DEFAULT 0,
        stock         INT DEFAULT 0,
        imageUrl      TEXT,
        imagePath     TEXT,
        createdAt     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `)

    // Orders
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id         VARCHAR(36)  PRIMARY KEY,
        userId     VARCHAR(128),
        userName   VARCHAR(255) DEFAULT '',
        userEmail  VARCHAR(255) DEFAULT '',
        subtotal   DECIMAL(10,2) DEFAULT 0,
        shipping   DECIMAL(10,2) DEFAULT 0,
        tax        DECIMAL(10,2) DEFAULT 0,
        total      DECIMAL(10,2) DEFAULT 0,
        status     ENUM('pending','processing','shipped','delivered','cancelled') DEFAULT 'pending',
        createdAt  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Order items
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS order_items (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        orderId    VARCHAR(36)  NOT NULL,
        productId  VARCHAR(36)  DEFAULT '',
        title      VARCHAR(500) DEFAULT '',
        price      DECIMAL(10,2) DEFAULT 0,
        quantity   INT DEFAULT 1,
        imageUrl   TEXT,
        sellerUid  VARCHAR(128) DEFAULT '',
        sellerName VARCHAR(255) DEFAULT '',
        FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
      )
    `)

    // Order ↔ sellers (for per-seller order queries)
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS order_sellers (
        orderId   VARCHAR(36)  NOT NULL,
        sellerUid VARCHAR(128) NOT NULL,
        PRIMARY KEY (orderId, sellerUid),
        FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
      )
    `)

    // ── Migrate: add password column to users if missing ─────────────────
    const [pwCols] = await conn.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password'`,
      [DB_NAME]
    )
    if (!pwCols.length)
      await conn.execute('ALTER TABLE users ADD COLUMN `password` TEXT')

    // ── Migrate: add checkout columns to orders if they don't exist yet ──
    const addCol = async (col, def) => {
      const [rows] = await conn.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'orders' AND COLUMN_NAME = ?`,
        [DB_NAME, col]
      )
      if (!rows.length) await conn.execute(`ALTER TABLE orders ADD COLUMN \`${col}\` ${def}`)
    }
    await addCol('address',         'TEXT')
    await addCol('phone',           "VARCHAR(20) DEFAULT ''")
    await addCol('paymentMethod',   "VARCHAR(50) DEFAULT 'COD'")
    await addCol('deliveryDate',    'DATE')
    await addCol('paymentIntentId', "VARCHAR(255) DEFAULT ''")

    // Cart (persisted per logged-in user; localStorage used when guest)
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS cart (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        userId     VARCHAR(128) NOT NULL,
        productId  VARCHAR(36)  NOT NULL,
        title      VARCHAR(500) DEFAULT '',
        price      DECIMAL(10,2) DEFAULT 0,
        imageUrl   TEXT,
        sellerUid  VARCHAR(128) DEFAULT '',
        sellerName VARCHAR(255) DEFAULT '',
        quantity   INT DEFAULT 1,
        createdAt  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_product (userId, productId)
      )
    `)

    console.log('✅ MySQL tables ready')
  } finally {
    conn.release()
  }
}

// ═══════════════════════════════════════════════════════════
// AUTH  (JWT — no Firebase)
// ═══════════════════════════════════════════════════════════

// POST /api/auth/register — create account, return JWT
app.post('/api/auth/register', async (req, res) => {
  const {
    name, email, password,
    role = 'user', storeName = '', phone = '', photoURL = '',
  } = req.body
  if (!name || !email || !password)
    return res.status(400).json({ error: 'name, email and password are required' })
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' })

  try {
    const [existing] = await pool.execute(
      'SELECT uid FROM users WHERE email = ?', [email]
    )
    if (existing.length)
      return res.status(409).json({
        error: 'This email is already registered',
        code:  'auth/email-already-in-use',
      })

    const uid  = uuidv4()
    const hash = await bcrypt.hash(password, 10)

    await pool.execute(
      `INSERT INTO users (uid, name, email, password, role, storeName, phone, photoURL)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uid, name, email, hash, role, storeName, phone, photoURL]
    )

    const [rows] = await pool.execute(
      'SELECT uid, name, email, role, storeName, phone, photoURL, createdAt FROM users WHERE uid = ?',
      [uid]
    )
    const user  = rows[0]
    const token = jwt.sign(
      { uid: user.uid, email: user.email, role: user.role, name: user.name },
      JWT_SECRET, { expiresIn: JWT_EXPIRES }
    )
    res.json({ token, user })
  } catch (err) {
    console.error('POST /api/auth/register:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/login — verify credentials, return JWT
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password)
    return res.status(400).json({ error: 'email and password are required' })

  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email])
    if (!rows.length)
      return res.status(401).json({
        error: 'Invalid email or password',
        code:  'auth/user-not-found',
      })

    const user  = rows[0]
    const match = await bcrypt.compare(password, user.password || '')
    if (!match)
      return res.status(401).json({
        error: 'Invalid email or password',
        code:  'auth/wrong-password',
      })

    // Return user object without the password hash
    const { password: _pw, ...safeUser } = user
    const token = jwt.sign(
      { uid: user.uid, email: user.email, role: user.role, name: user.name },
      JWT_SECRET, { expiresIn: JWT_EXPIRES }
    )
    res.json({ token, user: safeUser })
  } catch (err) {
    console.error('POST /api/auth/login:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/auth/me — return current user from token (used by refreshProfile)
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT uid, name, email, role, storeName, phone, photoURL, createdAt FROM users WHERE uid = ?',
      [req.user.uid]
    )
    if (!rows.length) return res.status(404).json({ error: 'User not found' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════

// POST /api/users — create or update user profile
app.post('/api/users', async (req, res) => {
  const { uid, name, email, role = 'user', storeName = '', phone = '', photoURL = '' } = req.body
  if (!uid || !name || !email) return res.status(400).json({ error: 'uid, name, email required' })
  try {
    await pool.execute(
      `INSERT INTO users (uid, name, email, role, storeName, phone, photoURL)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name=VALUES(name), role=VALUES(role),
         storeName=VALUES(storeName), phone=VALUES(phone), photoURL=VALUES(photoURL)`,
      [uid, name, email, role, storeName, phone, photoURL]
    )
    const [rows] = await pool.execute('SELECT * FROM users WHERE uid = ?', [uid])
    res.json(rows[0])
  } catch (err) {
    console.error('POST /api/users:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/users — all users (admin)
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM users ORDER BY createdAt DESC')
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/users/:uid — single user profile
app.get('/api/users/:uid', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE uid = ?', [req.params.uid])
    if (!rows.length) return res.status(404).json({ error: 'User not found' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/users/:uid/role — update role (admin)
app.put('/api/users/:uid/role', async (req, res) => {
  const { role } = req.body
  if (!role) return res.status(400).json({ error: 'role required' })
  try {
    await pool.execute('UPDATE users SET role = ? WHERE uid = ?', [role, req.params.uid])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════════════════

// POST /api/products — add product
app.post('/api/products', async (req, res) => {
  const id = uuidv4()
  const {
    sellerUid, sellerName = '', title, description = '', brand = '',
    category = '', price, originalPrice, discount = 0, stock = 0,
    imageUrl = '', imagePath = '',
  } = req.body
  if (!sellerUid || !title || price == null) {
    return res.status(400).json({ error: 'sellerUid, title, price required' })
  }
  try {
    await pool.execute(
      `INSERT INTO products
        (id, sellerUid, sellerName, title, description, brand, category, price, originalPrice, discount, stock, imageUrl, imagePath)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, sellerUid, sellerName, title, description, brand, category,
       price, originalPrice ?? price, discount, stock, imageUrl, imagePath]
    )
    const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [id])
    res.json(rows[0])
  } catch (err) {
    console.error('POST /api/products:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/products — all products (or filter by ?sellerUid=)
app.get('/api/products', async (req, res) => {
  try {
    const { sellerUid } = req.query
    if (sellerUid) {
      const [rows] = await pool.execute(
        'SELECT * FROM products WHERE sellerUid = ? ORDER BY createdAt DESC',
        [sellerUid]
      )
      return res.json(rows)
    }
    const [rows] = await pool.execute('SELECT * FROM products ORDER BY createdAt DESC')
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/products/:id — single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id])
    if (!rows.length) return res.status(404).json({ error: 'Product not found' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/products/:id — update product
app.put('/api/products/:id', async (req, res) => {
  const {
    title, description = '', brand = '', category = '', price,
    originalPrice, discount = 0, stock = 0, imageUrl = '', imagePath = '',
  } = req.body
  try {
    await pool.execute(
      `UPDATE products SET
        title=?, description=?, brand=?, category=?, price=?,
        originalPrice=?, discount=?, stock=?, imageUrl=?, imagePath=?
       WHERE id=?`,
      [title, description, brand, category, price,
       originalPrice ?? price, discount, stock, imageUrl, imagePath,
       req.params.id]
    )
    const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id])
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/products/:id — delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM products WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════════════════════

// Helper — attach items array to each order row
const attachItems = async (orders) => {
  return Promise.all(orders.map(async (order) => {
    const [items] = await pool.execute(
      'SELECT * FROM order_items WHERE orderId = ?', [order.id]
    )
    const [sellers] = await pool.execute(
      'SELECT sellerUid FROM order_sellers WHERE orderId = ?', [order.id]
    )
    return {
      ...order,
      items,
      sellerUids: sellers.map(s => s.sellerUid),
    }
  }))
}

// POST /api/orders — place order (uses transaction)
app.post('/api/orders', async (req, res) => {
  const {
    userId, userName = '', userEmail = '', items = [], sellerUids = [],
    subtotal, shipping, tax, total,
    // Checkout fields
    address = '', phone = '', paymentMethod = 'COD',
    deliveryDate = null, paymentIntentId = '',
  } = req.body

  // Validate required checkout fields
  if (!address.trim()) return res.status(400).json({ error: 'Delivery address is required' })
  if (!phone.trim())   return res.status(400).json({ error: 'Phone number is required' })

  const id   = uuidv4()
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    await conn.execute(
      `INSERT INTO orders
         (id, userId, userName, userEmail, subtotal, shipping, tax, total,
          address, phone, paymentMethod, deliveryDate, paymentIntentId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, userName, userEmail, subtotal, shipping, tax, total,
       address, phone, paymentMethod, deliveryDate, paymentIntentId]
    )

    for (const item of items) {
      await conn.execute(
        `INSERT INTO order_items
          (orderId, productId, title, price, quantity, imageUrl, sellerUid, sellerName)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, item.id || '', item.title || '', item.price, item.quantity,
         item.imageUrl || '', item.sellerUid || '', item.sellerName || '']
      )
    }

    for (const sUid of sellerUids) {
      await conn.execute(
        'INSERT INTO order_sellers (orderId, sellerUid) VALUES (?, ?)',
        [id, sUid]
      )
    }

    await conn.commit()

    const [rows] = await pool.execute('SELECT * FROM orders WHERE id = ?', [id])
    const [itemRows] = await pool.execute('SELECT * FROM order_items WHERE orderId = ?', [id])
    res.json({ ...rows[0], items: itemRows, sellerUids })
  } catch (err) {
    await conn.rollback()
    console.error('POST /api/orders:', err.message)
    res.status(500).json({ error: err.message })
  } finally {
    conn.release()
  }
})

// GET /api/orders — all orders (admin)
app.get('/api/orders', async (req, res) => {
  try {
    const [orders] = await pool.execute('SELECT * FROM orders ORDER BY createdAt DESC')
    res.json(await attachItems(orders))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/orders/user/:uid — buyer's orders
app.get('/api/orders/user/:uid', async (req, res) => {
  try {
    const [orders] = await pool.execute(
      'SELECT * FROM orders WHERE userId = ? ORDER BY createdAt DESC',
      [req.params.uid]
    )
    res.json(await attachItems(orders))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/orders/seller/:uid — seller's orders
app.get('/api/orders/seller/:uid', async (req, res) => {
  try {
    const [sellerRows] = await pool.execute(
      'SELECT orderId FROM order_sellers WHERE sellerUid = ?',
      [req.params.uid]
    )
    if (!sellerRows.length) return res.json([])

    const ids          = sellerRows.map(r => r.orderId)
    const placeholders = ids.map(() => '?').join(',')
    const [orders]     = await pool.execute(
      `SELECT * FROM orders WHERE id IN (${placeholders}) ORDER BY createdAt DESC`,
      ids
    )
    res.json(await attachItems(orders))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/orders/:id/status — update status
app.put('/api/orders/:id/status', async (req, res) => {
  const { status } = req.body
  if (!status) return res.status(400).json({ error: 'status required' })
  try {
    await pool.execute('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/orders/:id — single order with items (must come after user/seller routes)
app.get('/api/orders/:id', async (req, res) => {
  try {
    const [orders] = await pool.execute('SELECT * FROM orders WHERE id = ?', [req.params.id])
    if (!orders.length) return res.status(404).json({ error: 'Order not found' })
    const [items] = await pool.execute(
      'SELECT * FROM order_items WHERE orderId = ?', [req.params.id]
    )
    res.json({ ...orders[0], items })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════
// CART
// ═══════════════════════════════════════════════════════════

// GET /api/cart/:userId — get user's full cart
app.get('/api/cart/:userId', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM cart WHERE userId = ? ORDER BY createdAt DESC',
      [req.params.userId]
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/cart — add item (upsert: increments quantity if product already in cart)
app.post('/api/cart', async (req, res) => {
  const {
    userId, productId, title = '', price,
    imageUrl = '', sellerUid = '', sellerName = '', quantity = 1,
  } = req.body
  if (!userId || !productId || price == null)
    return res.status(400).json({ error: 'userId, productId, price required' })
  try {
    await pool.execute(
      `INSERT INTO cart (userId, productId, title, price, imageUrl, sellerUid, sellerName, quantity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
      [userId, productId, title, price, imageUrl, sellerUid, sellerName, quantity]
    )
    const [rows] = await pool.execute(
      'SELECT * FROM cart WHERE userId = ? AND productId = ?', [userId, productId]
    )
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/cart/:id — set exact quantity (deletes row if qty ≤ 0)
app.put('/api/cart/:id', async (req, res) => {
  const { quantity } = req.body
  if (quantity == null) return res.status(400).json({ error: 'quantity required' })
  try {
    if (quantity <= 0) {
      await pool.execute('DELETE FROM cart WHERE id = ?', [req.params.id])
      return res.json({ success: true, deleted: true })
    }
    await pool.execute('UPDATE cart SET quantity = ? WHERE id = ?', [quantity, req.params.id])
    const [rows] = await pool.execute('SELECT * FROM cart WHERE id = ?', [req.params.id])
    res.json(rows[0] || { success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/cart/user/:userId — clear the entire cart (called after checkout)
app.delete('/api/cart/user/:userId', async (req, res) => {
  try {
    await pool.execute('DELETE FROM cart WHERE userId = ?', [req.params.userId])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/cart/:id — remove a single cart row
app.delete('/api/cart/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM cart WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════
// STRIPE
// ═══════════════════════════════════════════════════════════

// POST /api/stripe/create-payment-intent — create a PaymentIntent for card checkout
app.post('/api/stripe/create-payment-intent', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({
      error: 'Card payments are not configured. Add STRIPE_SECRET_KEY to .env.',
    })
  }
  const { amount, currency = 'usd' } = req.body
  if (!amount || amount <= 0) return res.status(400).json({ error: 'amount required' })
  try {
    const intent = await stripe.paymentIntents.create({
      amount:   Math.round(amount * 100),   // Stripe expects cents
      currency,
      automatic_payment_methods: { enabled: true },
    })
    res.json({ clientSecret: intent.client_secret, id: intent.id })
  } catch (err) {
    console.error('Stripe error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ status: 'ok' }))

// ── Start ─────────────────────────────────────────────────────
ensureDatabase()
  .then(() => {
    // Create pool only after database exists
    pool = mysql.createPool({ ...DB_CONFIG, database: DB_NAME })
    return initDB()
  })
  .then(() => {
    app.listen(PORT, () =>
      console.log(`🚀 MegaMartX API → http://localhost:${PORT}`)
    )
  })
  .catch(err => {
    console.error('❌ Startup failed:', err.message)
    console.error('   Check DB_HOST / DB_USER / DB_PASS in .env')
    process.exit(1)
  })
