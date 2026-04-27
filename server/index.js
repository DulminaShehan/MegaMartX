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
const crypto = require('crypto')

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

// Admin-only middleware — verifies JWT and checks role === 'admin'
const requireAdmin = (req, res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Unauthorized — login required' })
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET)
    if (req.user.role !== 'admin')
      return res.status(403).json({ error: 'Admin access required' })
    next()
  } catch {
    res.status(401).json({ error: 'Token invalid or expired — please login again' })
  }
}

// API Key middleware — validates X-API-Key header against api_keys table
const requireApiKey = async (req, res, next) => {
  const key = req.headers['x-api-key']
  if (!key)
    return res.status(401).json({ error: 'Missing API key. Send it as X-API-Key header.' })
  try {
    const [rows] = await pool.execute(
      'SELECT id, label, createdBy FROM api_keys WHERE apiKey = ?', [key]
    )
    if (!rows.length)
      return res.status(403).json({ error: 'Invalid or revoked API key.' })
    req.apiKey = rows[0]   // attach key info to request
    next()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
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

    // Reviews
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS reviews (
        id        INT AUTO_INCREMENT PRIMARY KEY,
        productId VARCHAR(36)  NOT NULL,
        orderId   VARCHAR(36)  NOT NULL,
        userId    VARCHAR(128) NOT NULL,
        userName  VARCHAR(255) DEFAULT '',
        rating    TINYINT      NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment   TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_order_product (orderId, productId)
      )
    `)

    // API Keys (admin-managed)
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id        INT AUTO_INCREMENT PRIMARY KEY,
        apiKey    VARCHAR(255) NOT NULL,
        label     VARCHAR(255) DEFAULT '',
        createdBy VARCHAR(128) DEFAULT '',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // ── Migrate: expand orders status ENUM for live tracking ─────────────
    try {
      await conn.execute(`
        ALTER TABLE orders MODIFY COLUMN status
        ENUM('pending','processing','packed','shipped','out_for_delivery','delivered','cancelled')
        DEFAULT 'pending'
      `)
    } catch (_) { /* already expanded */ }

    // Product views — recommendation engine
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS product_views (
        id        INT AUTO_INCREMENT PRIMARY KEY,
        userId    VARCHAR(128) DEFAULT '',
        productId VARCHAR(36)  NOT NULL,
        category  VARCHAR(255) DEFAULT '',
        viewedAt  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_pv_user    (userId),
        INDEX idx_pv_product (productId)
      )
    `)

    // Conversations — buyer ↔ seller messaging
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS conversations (
        id           VARCHAR(36)  PRIMARY KEY,
        buyerId      VARCHAR(128) NOT NULL,
        buyerName    VARCHAR(255) DEFAULT '',
        sellerId     VARCHAR(128) NOT NULL,
        sellerName   VARCHAR(255) DEFAULT '',
        productId    VARCHAR(36)  DEFAULT '',
        productTitle VARCHAR(500) DEFAULT '',
        lastMessage  TEXT,
        lastSenderId VARCHAR(128) DEFAULT '',
        updatedAt    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        createdAt    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_conv (buyerId, sellerId, productId),
        INDEX idx_conv_buyer  (buyerId),
        INDEX idx_conv_seller (sellerId)
      )
    `)

    // Messages
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        conversationId VARCHAR(36)  NOT NULL,
        senderId       VARCHAR(128) NOT NULL,
        senderName     VARCHAR(255) DEFAULT '',
        text           TEXT NOT NULL,
        createdAt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_msg_conv (conversationId),
        FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE
      )
    `)

    // Order tracking events
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS order_tracking (
        id        INT AUTO_INCREMENT PRIMARY KEY,
        orderId   VARCHAR(36)  NOT NULL,
        status    VARCHAR(50)  NOT NULL,
        note      TEXT,
        updatedBy VARCHAR(128) DEFAULT '',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ot_order (orderId)
      )
    `)

    // Seller profiles — storefront extra data
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS seller_profiles (
        sellerUid VARCHAR(128) PRIMARY KEY,
        bio       TEXT,
        bannerUrl TEXT,
        location  VARCHAR(255) DEFAULT '',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `)

    // Store follows
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS store_follows (
        buyerId    VARCHAR(128) NOT NULL,
        sellerUid  VARCHAR(128) NOT NULL,
        followedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (buyerId, sellerUid)
      )
    `)

    // Rewards wallet — 100 points = $1
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS rewards (
        userId VARCHAR(128) PRIMARY KEY,
        points INT DEFAULT 0
      )
    `)

    // Points transaction log
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS points_transactions (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        userId      VARCHAR(128) NOT NULL,
        type        ENUM('earned','redeemed') NOT NULL,
        points      INT NOT NULL,
        description VARCHAR(500) DEFAULT '',
        orderId     VARCHAR(36) DEFAULT '',
        createdAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_pt_user (userId)
      )
    `)

    // Wishlists
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS wishlists (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        userId       VARCHAR(128) NOT NULL,
        productId    VARCHAR(36)  NOT NULL,
        notifyOnDrop TINYINT DEFAULT 1,
        addedAt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_wl (userId, productId),
        INDEX idx_wl_user    (userId),
        INDEX idx_wl_product (productId)
      )
    `)

    // In-app notifications (price drop, back-in-stock, etc.)
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id        INT AUTO_INCREMENT PRIMARY KEY,
        userId    VARCHAR(128) NOT NULL,
        type      VARCHAR(50) DEFAULT 'info',
        title     VARCHAR(255) DEFAULT '',
        message   TEXT,
        productId VARCHAR(36) DEFAULT '',
        isRead    TINYINT DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_notif_user (userId)
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

// PUT /api/products/:id — update product (triggers price-drop notifications)
app.put('/api/products/:id', async (req, res) => {
  const {
    title, description = '', brand = '', category = '', price,
    originalPrice, discount = 0, stock = 0, imageUrl = '', imagePath = '',
  } = req.body
  try {
    const [oldRows] = await pool.execute('SELECT price FROM products WHERE id = ?', [req.params.id])

    await pool.execute(
      `UPDATE products SET
        title=?, description=?, brand=?, category=?, price=?,
        originalPrice=?, discount=?, stock=?, imageUrl=?, imagePath=?
       WHERE id=?`,
      [title, description, brand, category, price,
       originalPrice ?? price, discount, stock, imageUrl, imagePath,
       req.params.id]
    )

    // Notify wishlist watchers if price dropped
    if (oldRows.length && parseFloat(price) < parseFloat(oldRows[0].price)) {
      const [watchers] = await pool.execute(
        'SELECT userId FROM wishlists WHERE productId = ? AND notifyOnDrop = 1',
        [req.params.id]
      )
      const newP = parseFloat(price).toFixed(2)
      const oldP = parseFloat(oldRows[0].price).toFixed(2)
      for (const w of watchers) {
        await pool.execute(
          `INSERT INTO notifications (userId, type, title, message, productId)
           VALUES (?, 'price_drop', ?, ?, ?)`,
          [w.userId, '💸 Price Drop!',
           `"${title}" dropped from $${oldP} → $${newP}`,
           req.params.id]
        )
      }
    }

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
    pointsRedeemed = 0,
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

    await conn.execute(
      'INSERT INTO order_tracking (orderId, status, note, updatedBy) VALUES (?, ?, ?, ?)',
      [id, 'pending', 'Order placed', userId]
    )

    // Redeem loyalty points if requested
    const pts = parseInt(pointsRedeemed) || 0
    if (pts > 0 && userId) {
      const [balRows] = await conn.execute(
        'SELECT points FROM rewards WHERE userId = ?', [userId]
      )
      const currentPoints = balRows.length ? balRows[0].points : 0
      if (currentPoints < pts)
        throw new Error(`Insufficient reward points (have ${currentPoints}, tried to redeem ${pts})`)
      await conn.execute(
        `INSERT INTO rewards (userId, points) VALUES (?, 0)
         ON DUPLICATE KEY UPDATE points = points - ?`,
        [userId, pts]
      )
      await conn.execute(
        `INSERT INTO points_transactions (userId, type, points, description, orderId)
         VALUES (?, 'redeemed', ?, ?, ?)`,
        [userId, pts, `Redeemed for order #${id.slice(-8)}`, id]
      )
    }

    await conn.commit()

    // Earn loyalty points after commit: 1 pt per $1 spent
    const earnedPoints = Math.floor(Number(total) || 0)
    if (earnedPoints > 0 && userId) {
      await pool.execute(
        `INSERT INTO rewards (userId, points) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE points = points + ?`,
        [userId, earnedPoints, earnedPoints]
      )
      await pool.execute(
        `INSERT INTO points_transactions (userId, type, points, description, orderId)
         VALUES (?, 'earned', ?, ?, ?)`,
        [userId, earnedPoints, `Earned from order #${id.slice(-8)}`, id]
      )
    }

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

// PUT /api/orders/:id/status — update status + log tracking event
app.put('/api/orders/:id/status', requireAuth, async (req, res) => {
  const { status, note = '' } = req.body
  if (!status) return res.status(400).json({ error: 'status required' })
  const valid = ['pending','processing','packed','shipped','out_for_delivery','delivered','cancelled']
  if (!valid.includes(status))
    return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` })
  try {
    await pool.execute('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id])
    await pool.execute(
      'INSERT INTO order_tracking (orderId, status, note, updatedBy) VALUES (?, ?, ?, ?)',
      [req.params.id, status, note, req.user.uid]
    )
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

// ═══════════════════════════════════════════════════════════
// ADMIN  (all routes require role === 'admin')
// ═══════════════════════════════════════════════════════════

// GET /api/admin/stats — dashboard overview counts
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const [[{ total_users    }]] = await pool.execute('SELECT COUNT(*) as total_users FROM users')
    const [[{ total_sellers  }]] = await pool.execute("SELECT COUNT(*) as total_sellers FROM users WHERE role = 'seller'")
    const [[{ total_buyers   }]] = await pool.execute("SELECT COUNT(*) as total_buyers FROM users WHERE role = 'user'")
    const [[{ total_admins   }]] = await pool.execute("SELECT COUNT(*) as total_admins FROM users WHERE role = 'admin'")
    const [[{ total_products }]] = await pool.execute('SELECT COUNT(*) as total_products FROM products')
    const [[{ total_orders   }]] = await pool.execute('SELECT COUNT(*) as total_orders FROM orders')
    const [[{ revenue        }]] = await pool.execute('SELECT COALESCE(SUM(total), 0) as revenue FROM orders')
    res.json({
      totalUsers:    total_users,
      totalSellers:  total_sellers,
      totalBuyers:   total_buyers,
      totalAdmins:   total_admins,
      totalProducts: total_products,
      totalOrders:   total_orders,
      totalRevenue:  revenue,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/users?role= — list all users, optional role filter
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const { role } = req.query
    let query  = 'SELECT uid, name, email, role, storeName, phone, createdAt FROM users'
    const params = []
    if (role) { query += ' WHERE role = ?'; params.push(role) }
    query += ' ORDER BY createdAt DESC'
    const [rows] = await pool.execute(query, params)
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/admin/users/:uid/role — change a user's role
app.put('/api/admin/users/:uid/role', requireAdmin, async (req, res) => {
  const { role } = req.body
  if (!['user', 'seller', 'admin'].includes(role))
    return res.status(400).json({ error: 'Invalid role' })
  try {
    await pool.execute('UPDATE users SET role = ? WHERE uid = ?', [role, req.params.uid])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/admin/users/:uid — delete a user (admin cannot delete themselves)
app.delete('/api/admin/users/:uid', requireAdmin, async (req, res) => {
  if (req.user.uid === req.params.uid)
    return res.status(400).json({ error: 'You cannot delete your own account' })
  try {
    await pool.execute('DELETE FROM users WHERE uid = ?', [req.params.uid])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/create-admin — create a new admin account
app.post('/api/admin/create-admin', requireAdmin, async (req, res) => {
  const { name, email, password } = req.body
  if (!name || !email || !password)
    return res.status(400).json({ error: 'name, email and password are required' })
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  try {
    const [existing] = await pool.execute('SELECT uid FROM users WHERE email = ?', [email])
    if (existing.length)
      return res.status(409).json({ error: 'Email already registered', code: 'auth/email-already-in-use' })

    const uid  = uuidv4()
    const hash = await bcrypt.hash(password, 10)
    await pool.execute(
      'INSERT INTO users (uid, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [uid, name, email, hash, 'admin']
    )
    const [rows] = await pool.execute(
      'SELECT uid, name, email, role, createdAt FROM users WHERE uid = ?', [uid]
    )
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/api-keys — list all API keys
app.get('/api/admin/api-keys', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM api_keys ORDER BY createdAt DESC')
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/api-keys — generate a new API key
app.post('/api/admin/api-keys', requireAdmin, async (req, res) => {
  const { label = '' } = req.body
  const apiKey = 'mmx_' + crypto.randomBytes(24).toString('hex')
  try {
    const [result] = await pool.execute(
      'INSERT INTO api_keys (apiKey, label, createdBy) VALUES (?, ?, ?)',
      [apiKey, label, req.user.uid]
    )
    const [rows] = await pool.execute('SELECT * FROM api_keys WHERE id = ?', [result.insertId])
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/admin/api-keys/:id — delete an API key
app.delete('/api/admin/api-keys/:id', requireAdmin, async (req, res) => {
  try {
    await pool.execute('DELETE FROM api_keys WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════
// PUBLIC API  (authenticated via X-API-Key header)
// Base: /api/v1/...
// ═══════════════════════════════════════════════════════════

// GET /api/v1/ping — verify your key works
app.get('/api/v1/ping', requireApiKey, (req, res) => {
  res.json({
    success: true,
    message: 'API key valid',
    key:     { id: req.apiKey.id, label: req.apiKey.label },
  })
})

// GET /api/v1/products — list all active products
app.get('/api/v1/products', requireApiKey, async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, limit = 50, offset = 0 } = req.query
    let query  = 'SELECT id, title, price, category, stock, imageUrl, sellerName FROM products WHERE 1=1'
    const params = []

    if (search)    { query += ' AND title LIKE ?';         params.push(`%${search}%`) }
    if (category)  { query += ' AND category = ?';         params.push(category) }
    if (minPrice)  { query += ' AND price >= ?';           params.push(Number(minPrice)) }
    if (maxPrice)  { query += ' AND price <= ?';           params.push(Number(maxPrice)) }

    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?'
    params.push(Number(limit), Number(offset))

    const [rows] = await pool.execute(query, params)
    const [[{ total }]] = await pool.execute(
      'SELECT COUNT(*) as total FROM products WHERE 1=1' +
      (search   ? ' AND title LIKE ?' : '') +
      (category ? ' AND category = ?' : '') +
      (minPrice ? ' AND price >= ?'   : '') +
      (maxPrice ? ' AND price <= ?'   : ''),
      params.slice(0, params.length - 2)
    )
    res.json({ total, limit: Number(limit), offset: Number(offset), products: rows })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/v1/products/:id — get single product
app.get('/api/v1/products/:id', requireApiKey, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id])
    if (!rows.length) return res.status(404).json({ error: 'Product not found' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/v1/orders — list orders (optionally filter by userId or status)
app.get('/api/v1/orders', requireApiKey, async (req, res) => {
  try {
    const { userId, status, limit = 50, offset = 0 } = req.query
    let query  = `
      SELECT o.id, o.userId, o.total, o.status, o.paymentMethod,
             o.address, o.phone, o.createdAt,
             JSON_ARRAYAGG(
               JSON_OBJECT(
                 'productId', oi.productId,
                 'title',     oi.title,
                 'price',     oi.price,
                 'quantity',  oi.quantity
               )
             ) AS items
      FROM orders o
      LEFT JOIN order_items oi ON oi.orderId = o.id
      WHERE 1=1`
    const params = []

    if (userId) { query += ' AND o.userId = ?'; params.push(userId) }
    if (status) { query += ' AND o.status = ?'; params.push(status) }

    query += ' GROUP BY o.id ORDER BY o.createdAt DESC LIMIT ? OFFSET ?'
    params.push(Number(limit), Number(offset))

    const [rows] = await pool.execute(query, params)
    res.json({ limit: Number(limit), offset: Number(offset), orders: rows })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/v1/orders/:id — get single order with items
app.get('/api/v1/orders/:id', requireApiKey, async (req, res) => {
  try {
    const [orders] = await pool.execute('SELECT * FROM orders WHERE id = ?', [req.params.id])
    if (!orders.length) return res.status(404).json({ error: 'Order not found' })
    const [items] = await pool.execute('SELECT * FROM order_items WHERE orderId = ?', [req.params.id])
    res.json({ ...orders[0], items })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/v1/orders — create a new order
app.post('/api/v1/orders', requireApiKey, async (req, res) => {
  const {
    userId, userName, userEmail,
    address, phone, paymentMethod = 'COD',
    items,   // [{ productId, title, price, quantity, imageUrl, sellerName }]
  } = req.body

  if (!userId || !address || !phone || !Array.isArray(items) || !items.length)
    return res.status(400).json({ error: 'userId, address, phone, and items[] are required' })

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const orderId = uuidv4()
  const deliveryDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()

  try {
    await pool.execute(
      `INSERT INTO orders (id, userId, userName, userEmail, total, status, paymentMethod,
                           address, phone, deliveryDate)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
      [orderId, userId, userName || '', userEmail || '', total,
       paymentMethod, address, phone, deliveryDate]
    )
    for (const item of items) {
      await pool.execute(
        `INSERT INTO order_items (orderId, productId, title, price, quantity, imageUrl, sellerName)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderId, item.productId, item.title, item.price,
         item.quantity, item.imageUrl || '', item.sellerName || '']
      )
    }
    res.status(201).json({
      success: true, orderId, total,
      status: 'pending', deliveryDate,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/v1/orders/:id/status — update order status
app.put('/api/v1/orders/:id/status', requireApiKey, async (req, res) => {
  const { status } = req.body
  const valid = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
  if (!valid.includes(status))
    return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` })
  try {
    const [result] = await pool.execute(
      'UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]
    )
    if (!result.affectedRows) return res.status(404).json({ error: 'Order not found' })
    res.json({ success: true, orderId: req.params.id, status })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════
// REVIEWS
// ═══════════════════════════════════════════════════════════

// GET /api/reviews/product/:productId — public, returns reviews + summary
app.get('/api/reviews/product/:productId', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, userId, userName, rating, comment, createdAt
       FROM reviews WHERE productId = ? ORDER BY createdAt DESC`,
      [req.params.productId]
    )
    const avgRating = rows.length
      ? (rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(1)
      : null
    res.json({ reviews: rows, avgRating: avgRating ? Number(avgRating) : null, total: rows.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/reviews/check — did this user already review this product for this order?
app.get('/api/reviews/check', requireAuth, async (req, res) => {
  const { productId, orderId } = req.query
  if (!productId || !orderId) return res.status(400).json({ error: 'productId and orderId required' })
  try {
    const [rows] = await pool.execute(
      'SELECT id FROM reviews WHERE orderId = ? AND productId = ? AND userId = ?',
      [orderId, productId, req.user.uid]
    )
    res.json({ reviewed: rows.length > 0 })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/reviews — submit a review (order must be delivered)
app.post('/api/reviews', requireAuth, async (req, res) => {
  const { productId, orderId, rating, comment } = req.body
  if (!productId || !orderId || !rating)
    return res.status(400).json({ error: 'productId, orderId and rating are required' })
  if (rating < 1 || rating > 5)
    return res.status(400).json({ error: 'rating must be between 1 and 5' })

  try {
    // Verify order belongs to user and is delivered
    const [orders] = await pool.execute(
      'SELECT status, userId FROM orders WHERE id = ?', [orderId]
    )
    if (!orders.length) return res.status(404).json({ error: 'Order not found' })
    if (orders[0].userId !== req.user.uid)
      return res.status(403).json({ error: 'This is not your order' })
    if (orders[0].status !== 'delivered')
      return res.status(400).json({ error: 'You can only review delivered orders' })

    // Verify product was in this order
    const [items] = await pool.execute(
      'SELECT id FROM order_items WHERE orderId = ? AND productId = ?', [orderId, productId]
    )
    if (!items.length)
      return res.status(400).json({ error: 'This product was not in your order' })

    // Insert (or replace if re-submitting)
    await pool.execute(
      `INSERT INTO reviews (productId, orderId, userId, userName, rating, comment)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)`,
      [productId, orderId, req.user.uid, req.user.name || '', rating, comment || '']
    )

    const [rows] = await pool.execute(
      'SELECT * FROM reviews WHERE orderId = ? AND productId = ? AND userId = ?',
      [orderId, productId, req.user.uid]
    )
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════
// RECOMMENDATIONS  (AI-style: category scoring from history)
// ═══════════════════════════════════════════════════════════

// POST /api/recommendations/view — track a product page view
app.post('/api/recommendations/view', optionalAuth, async (req, res) => {
  const { productId, category } = req.body
  if (!productId) return res.status(400).json({ error: 'productId required' })
  const userId = req.user?.uid || ''
  try {
    await pool.execute(
      'INSERT INTO product_views (userId, productId, category) VALUES (?, ?, ?)',
      [userId, productId, category || '']
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/recommendations/similar/:productId — same-category products
app.get('/api/recommendations/similar/:productId', async (req, res) => {
  try {
    const [base] = await pool.execute('SELECT category FROM products WHERE id = ?', [req.params.productId])
    if (!base.length) return res.json([])
    const [rows] = await pool.execute(
      'SELECT * FROM products WHERE category = ? AND id != ? ORDER BY createdAt DESC LIMIT 10',
      [base[0].category, req.params.productId]
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/recommendations/user/:uid — personalised picks
app.get('/api/recommendations/user/:uid', requireAuth, async (req, res) => {
  const uid = req.params.uid
  if (req.user.uid !== uid) return res.status(403).json({ error: 'Forbidden' })
  try {
    // Score categories from purchase history (weight 3×) + view history (weight 1×)
    const [ordCats] = await pool.execute(`
      SELECT p.category, COUNT(*) as freq
      FROM order_items oi
      JOIN orders o ON o.id = oi.orderId
      JOIN products p ON p.id = oi.productId
      WHERE o.userId = ?
      GROUP BY p.category ORDER BY freq DESC LIMIT 5`, [uid])

    const [viewCats] = await pool.execute(`
      SELECT category, COUNT(*) as freq
      FROM product_views WHERE userId = ? AND category != ''
      GROUP BY category ORDER BY freq DESC LIMIT 5`, [uid])

    const score = {}
    ordCats.forEach(r  => { score[r.category]  = (score[r.category]  || 0) + r.freq * 3 })
    viewCats.forEach(r => { score[r.category]  = (score[r.category]  || 0) + r.freq })

    if (!Object.keys(score).length) {
      const [rows] = await pool.execute('SELECT * FROM products ORDER BY createdAt DESC LIMIT 12')
      return res.json(rows)
    }

    // Products already bought — exclude from recs
    const [bought] = await pool.execute(`
      SELECT DISTINCT oi.productId FROM order_items oi
      JOIN orders o ON o.id = oi.orderId WHERE o.userId = ?`, [uid])
    const boughtIds = bought.map(r => r.productId)

    const cats = Object.keys(score)
    let query  = `SELECT * FROM products WHERE category IN (${cats.map(() => '?').join(',')})`
    const params = [...cats]
    if (boughtIds.length) {
      query += ` AND id NOT IN (${boughtIds.map(() => '?').join(',')})`
      params.push(...boughtIds)
    }
    query += ' ORDER BY createdAt DESC LIMIT 24'

    const [rows] = await pool.execute(query, params)
    rows.sort((a, b) => (score[b.category] || 0) - (score[a.category] || 0))
    res.json(rows.slice(0, 12))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/recommendations/trending — most-viewed products (last 30 days)
app.get('/api/recommendations/trending', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT p.*, COUNT(pv.id) as viewCount
      FROM products p
      LEFT JOIN product_views pv ON pv.productId = p.id
        AND pv.viewedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY p.id
      ORDER BY viewCount DESC, p.createdAt DESC
      LIMIT 12`)
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════
// CHAT  (buyer ↔ seller)
// ═══════════════════════════════════════════════════════════

// POST /api/conversations — start or fetch existing conversation
app.post('/api/conversations', requireAuth, async (req, res) => {
  const { sellerId, sellerName = '', productId = '', productTitle = '' } = req.body
  const buyerId   = req.user.uid
  const buyerName = req.user.name || ''
  if (!sellerId) return res.status(400).json({ error: 'sellerId required' })
  if (buyerId === sellerId) return res.status(400).json({ error: 'Cannot message yourself' })
  try {
    const [existing] = await pool.execute(
      'SELECT * FROM conversations WHERE buyerId=? AND sellerId=? AND productId=?',
      [buyerId, sellerId, productId]
    )
    if (existing.length) return res.json(existing[0])
    const id = uuidv4()
    await pool.execute(
      `INSERT INTO conversations (id,buyerId,buyerName,sellerId,sellerName,productId,productTitle)
       VALUES (?,?,?,?,?,?,?)`,
      [id, buyerId, buyerName, sellerId, sellerName, productId, productTitle]
    )
    const [rows] = await pool.execute('SELECT * FROM conversations WHERE id=?', [id])
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/conversations/user/:uid — all conversations (buyer or seller inbox)
app.get('/api/conversations/user/:uid', requireAuth, async (req, res) => {
  const uid = req.params.uid
  if (req.user.uid !== uid && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Forbidden' })
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM conversations WHERE buyerId=? OR sellerId=? ORDER BY updatedAt DESC`,
      [uid, uid]
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/conversations/:id/messages — messages in a conversation
app.get('/api/conversations/:id/messages', requireAuth, async (req, res) => {
  try {
    const [conv] = await pool.execute('SELECT * FROM conversations WHERE id=?', [req.params.id])
    if (!conv.length) return res.status(404).json({ error: 'Conversation not found' })
    const c = conv[0]
    if (c.buyerId !== req.user.uid && c.sellerId !== req.user.uid && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Forbidden' })
    const [msgs] = await pool.execute(
      'SELECT * FROM messages WHERE conversationId=? ORDER BY createdAt ASC',
      [req.params.id]
    )
    res.json({ conversation: c, messages: msgs })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/conversations/:id/messages — send a message
app.post('/api/conversations/:id/messages', requireAuth, async (req, res) => {
  const { text } = req.body
  if (!text?.trim()) return res.status(400).json({ error: 'text required' })
  try {
    const [conv] = await pool.execute('SELECT * FROM conversations WHERE id=?', [req.params.id])
    if (!conv.length) return res.status(404).json({ error: 'Conversation not found' })
    const c = conv[0]
    if (c.buyerId !== req.user.uid && c.sellerId !== req.user.uid)
      return res.status(403).json({ error: 'Forbidden' })
    const [result] = await pool.execute(
      'INSERT INTO messages (conversationId,senderId,senderName,text) VALUES (?,?,?,?)',
      [req.params.id, req.user.uid, req.user.name || '', text.trim()]
    )
    await pool.execute(
      'UPDATE conversations SET lastMessage=?, lastSenderId=? WHERE id=?',
      [text.trim().slice(0, 200), req.user.uid, req.params.id]
    )
    const [rows] = await pool.execute('SELECT * FROM messages WHERE id=?', [result.insertId])
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════
// ORDER TRACKING HISTORY
// ═══════════════════════════════════════════════════════════

// GET /api/orders/:id/tracking — full timeline for an order
app.get('/api/orders/:id/tracking', requireAuth, async (req, res) => {
  try {
    const [orders] = await pool.execute('SELECT userId FROM orders WHERE id=?', [req.params.id])
    if (!orders.length) return res.status(404).json({ error: 'Order not found' })
    if (req.user.role !== 'admin' && orders[0].userId !== req.user.uid) {
      const [sellerCheck] = await pool.execute(
        'SELECT 1 FROM order_sellers WHERE orderId=? AND sellerUid=?',
        [req.params.id, req.user.uid]
      )
      if (!sellerCheck.length) return res.status(403).json({ error: 'Forbidden' })
    }
    const [rows] = await pool.execute(
      'SELECT * FROM order_tracking WHERE orderId=? ORDER BY createdAt ASC',
      [req.params.id]
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════
// STOREFRONTS
// ═══════════════════════════════════════════════════════════

// GET /api/stores/:sellerUid — public store page
app.get('/api/stores/:sellerUid', async (req, res) => {
  try {
    const [users] = await pool.execute(
      `SELECT uid, name, email, role, storeName, phone, photoURL, createdAt
       FROM users WHERE uid=? AND role='seller'`,
      [req.params.sellerUid]
    )
    if (!users.length) return res.status(404).json({ error: 'Store not found' })
    const user = users[0]

    const [profileRows] = await pool.execute(
      'SELECT * FROM seller_profiles WHERE sellerUid=?', [req.params.sellerUid]
    )
    const profile = profileRows[0] || {}

    const [products] = await pool.execute(
      'SELECT * FROM products WHERE sellerUid=? ORDER BY createdAt DESC LIMIT 20',
      [req.params.sellerUid]
    )

    const [[{ followerCount }]] = await pool.execute(
      'SELECT COUNT(*) as followerCount FROM store_follows WHERE sellerUid=?',
      [req.params.sellerUid]
    )
    const [[{ productCount }]] = await pool.execute(
      'SELECT COUNT(*) as productCount FROM products WHERE sellerUid=?',
      [req.params.sellerUid]
    )
    const [[{ avgRating, reviewCount }]] = await pool.execute(`
      SELECT AVG(r.rating) as avgRating, COUNT(r.id) as reviewCount
      FROM reviews r JOIN products p ON p.id = r.productId
      WHERE p.sellerUid=?`, [req.params.sellerUid]
    )

    res.json({
      seller:  { uid: user.uid, name: user.name, storeName: user.storeName || user.name, photoURL: user.photoURL, createdAt: user.createdAt },
      profile: { bio: profile.bio || '', bannerUrl: profile.bannerUrl || '', location: profile.location || '' },
      stats:   { followerCount, productCount, avgRating: avgRating ? Number(avgRating).toFixed(1) : null, reviewCount: reviewCount || 0 },
      products,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/stores/:sellerUid — update storefront profile (seller only)
app.put('/api/stores/:sellerUid', requireAuth, async (req, res) => {
  if (req.user.uid !== req.params.sellerUid && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Forbidden' })
  const { bio = '', bannerUrl = '', location = '', storeName = '' } = req.body
  try {
    await pool.execute(
      `INSERT INTO seller_profiles (sellerUid, bio, bannerUrl, location)
       VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE bio=VALUES(bio), bannerUrl=VALUES(bannerUrl), location=VALUES(location)`,
      [req.params.sellerUid, bio, bannerUrl, location]
    )
    if (storeName.trim()) {
      await pool.execute('UPDATE users SET storeName=? WHERE uid=?', [storeName.trim(), req.params.sellerUid])
    }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/stores/:sellerUid/follow — toggle follow/unfollow
app.post('/api/stores/:sellerUid/follow', requireAuth, async (req, res) => {
  const buyerId    = req.user.uid
  const sellerUid  = req.params.sellerUid
  if (buyerId === sellerUid) return res.status(400).json({ error: 'Cannot follow yourself' })
  try {
    const [existing] = await pool.execute(
      'SELECT 1 FROM store_follows WHERE buyerId=? AND sellerUid=?', [buyerId, sellerUid]
    )
    if (existing.length) {
      await pool.execute('DELETE FROM store_follows WHERE buyerId=? AND sellerUid=?', [buyerId, sellerUid])
      return res.json({ following: false })
    }
    await pool.execute('INSERT INTO store_follows (buyerId,sellerUid) VALUES (?,?)', [buyerId, sellerUid])
    res.json({ following: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/stores/:sellerUid/follow-status — check if current user follows
app.get('/api/stores/:sellerUid/follow-status', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT 1 FROM store_follows WHERE buyerId=? AND sellerUid=?',
      [req.user.uid, req.params.sellerUid]
    )
    res.json({ following: rows.length > 0 })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════
// REWARDS
// ═══════════════════════════════════════════════════════════

// GET /api/rewards/:uid — balance + last 30 transactions
app.get('/api/rewards/:uid', requireAuth, async (req, res) => {
  if (req.user.uid !== req.params.uid && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Forbidden' })
  try {
    const [balRows] = await pool.execute(
      'SELECT points FROM rewards WHERE userId = ?', [req.params.uid]
    )
    const points = balRows.length ? balRows[0].points : 0
    const [txRows] = await pool.execute(
      'SELECT * FROM points_transactions WHERE userId = ? ORDER BY createdAt DESC LIMIT 30',
      [req.params.uid]
    )
    res.json({ points, transactions: txRows })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════
// WISHLIST
// ═══════════════════════════════════════════════════════════

// GET /api/wishlist/:uid — full wishlist with joined product data
app.get('/api/wishlist/:uid', requireAuth, async (req, res) => {
  if (req.user.uid !== req.params.uid && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Forbidden' })
  try {
    const [rows] = await pool.execute(`
      SELECT w.id, w.userId, w.productId, w.notifyOnDrop, w.addedAt,
             p.title, p.price, p.originalPrice, p.imageUrl, p.category,
             p.discount, p.stock, p.sellerUid, p.sellerName
      FROM wishlists w
      LEFT JOIN products p ON p.id = w.productId
      WHERE w.userId = ?
      ORDER BY w.addedAt DESC`,
      [req.params.uid]
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/wishlist/check/:uid/:productId — is product wishlisted?
app.get('/api/wishlist/check/:uid/:productId', requireAuth, async (req, res) => {
  if (req.user.uid !== req.params.uid && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Forbidden' })
  try {
    const [rows] = await pool.execute(
      'SELECT id, notifyOnDrop FROM wishlists WHERE userId = ? AND productId = ?',
      [req.params.uid, req.params.productId]
    )
    res.json({ wishlisted: rows.length > 0, notifyOnDrop: rows.length ? !!rows[0].notifyOnDrop : true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/wishlist — add to wishlist
app.post('/api/wishlist', requireAuth, async (req, res) => {
  const { productId, notifyOnDrop = 1 } = req.body
  if (!productId) return res.status(400).json({ error: 'productId required' })
  try {
    await pool.execute(
      `INSERT INTO wishlists (userId, productId, notifyOnDrop) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE notifyOnDrop = VALUES(notifyOnDrop)`,
      [req.user.uid, productId, notifyOnDrop ? 1 : 0]
    )
    const [rows] = await pool.execute(
      'SELECT * FROM wishlists WHERE userId = ? AND productId = ?',
      [req.user.uid, productId]
    )
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/wishlist/:uid/:productId — remove from wishlist
app.delete('/api/wishlist/:uid/:productId', requireAuth, async (req, res) => {
  if (req.user.uid !== req.params.uid && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Forbidden' })
  try {
    await pool.execute(
      'DELETE FROM wishlists WHERE userId = ? AND productId = ?',
      [req.params.uid, req.params.productId]
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════

// GET /api/notifications/:uid — all notifications, unread first
app.get('/api/notifications/:uid', requireAuth, async (req, res) => {
  if (req.user.uid !== req.params.uid && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Forbidden' })
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM notifications WHERE userId = ?
       ORDER BY isRead ASC, createdAt DESC LIMIT 50`,
      [req.params.uid]
    )
    const unread = rows.filter(r => !r.isRead).length
    res.json({ notifications: rows, unread })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/notifications/:uid/read-all
app.put('/api/notifications/:uid/read-all', requireAuth, async (req, res) => {
  if (req.user.uid !== req.params.uid)
    return res.status(403).json({ error: 'Forbidden' })
  try {
    await pool.execute('UPDATE notifications SET isRead = 1 WHERE userId = ?', [req.params.uid])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/notifications/:uid/:id — delete a single notification
app.delete('/api/notifications/:uid/:id', requireAuth, async (req, res) => {
  if (req.user.uid !== req.params.uid)
    return res.status(403).json({ error: 'Forbidden' })
  try {
    await pool.execute(
      'DELETE FROM notifications WHERE id = ? AND userId = ?',
      [req.params.id, req.params.uid]
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════
// SELLER ANALYTICS
// ═══════════════════════════════════════════════════════════

// GET /api/analytics/seller/:uid — revenue, orders, best sellers, monthly chart
app.get('/api/analytics/seller/:uid', requireAuth, async (req, res) => {
  const uid = req.params.uid
  if (req.user.uid !== uid && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Forbidden' })
  try {
    const [[totals]] = await pool.execute(`
      SELECT
        COALESCE(SUM(oi.price * oi.quantity), 0) AS totalRevenue,
        COUNT(DISTINCT o.id)                      AS totalOrders
      FROM order_items oi
      JOIN orders o ON o.id = oi.orderId
      WHERE oi.sellerUid = ? AND o.status != 'cancelled'`,
      [uid]
    )

    const [[{ productCount }]] = await pool.execute(
      'SELECT COUNT(*) AS productCount FROM products WHERE sellerUid = ?', [uid]
    )

    // Monthly revenue — last 6 months
    const [monthly] = await pool.execute(`
      SELECT
        DATE_FORMAT(o.createdAt, '%Y-%m')   AS month,
        DATE_FORMAT(o.createdAt, '%b %Y')   AS label,
        COALESCE(SUM(oi.price * oi.quantity), 0) AS revenue,
        COUNT(DISTINCT o.id)                AS orders
      FROM order_items oi
      JOIN orders o ON o.id = oi.orderId
      WHERE oi.sellerUid = ?
        AND o.status != 'cancelled'
        AND o.createdAt >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(o.createdAt, '%Y-%m'), DATE_FORMAT(o.createdAt, '%b %Y')
      ORDER BY month ASC`,
      [uid]
    )

    // Best sellers by units sold
    const [bestSellers] = await pool.execute(`
      SELECT
        oi.productId,
        p.title,
        p.imageUrl,
        p.category,
        p.price AS currentPrice,
        COALESCE(SUM(oi.quantity), 0)            AS totalSold,
        COALESCE(SUM(oi.price * oi.quantity), 0) AS revenue
      FROM order_items oi
      JOIN products p  ON p.id  = oi.productId
      JOIN orders   o  ON o.id  = oi.orderId
      WHERE oi.sellerUid = ? AND o.status != 'cancelled'
      GROUP BY oi.productId, p.title, p.imageUrl, p.category, p.price
      ORDER BY totalSold DESC LIMIT 5`,
      [uid]
    )

    // Category breakdown
    const [categories] = await pool.execute(`
      SELECT
        p.category,
        COALESCE(SUM(oi.quantity), 0)            AS totalSold,
        COALESCE(SUM(oi.price * oi.quantity), 0) AS revenue
      FROM order_items oi
      JOIN products p ON p.id = oi.productId
      JOIN orders   o ON o.id = oi.orderId
      WHERE oi.sellerUid = ? AND o.status != 'cancelled'
      GROUP BY p.category
      ORDER BY revenue DESC`,
      [uid]
    )

    res.json({
      totalRevenue:  Number(totals.totalRevenue),
      totalOrders:   Number(totals.totalOrders),
      productCount:  Number(productCount),
      avgOrderValue: totals.totalOrders > 0
        ? +(totals.totalRevenue / totals.totalOrders).toFixed(2) : 0,
      monthly,
      bestSellers,
      categories,
    })
  } catch (err) {
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
