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
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

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

    console.log('✅ MySQL tables ready')
  } finally {
    conn.release()
  }
}

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
  const { userId, userName = '', userEmail = '', items = [], sellerUids = [],
          subtotal, shipping, tax, total } = req.body
  const id   = uuidv4()
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    await conn.execute(
      `INSERT INTO orders (id, userId, userName, userEmail, subtotal, shipping, tax, total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, userName, userEmail, subtotal, shipping, tax, total]
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
