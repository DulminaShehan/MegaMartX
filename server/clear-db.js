// Run: node server/clear-db.js
const mysql = require('mysql2/promise')
const path  = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

;(async () => {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST || 'localhost',
    port:     process.env.DB_PORT || 3306,
    user:     process.env.DB_USER || 'root',
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'megamartx',
  })

  await conn.execute('SET FOREIGN_KEY_CHECKS = 0')
  for (const table of ['cart', 'order_items', 'orders', 'products', 'users']) {
    await conn.execute(`TRUNCATE TABLE \`${table}\``)
    console.log(`✅ Cleared: ${table}`)
  }
  await conn.execute('SET FOREIGN_KEY_CHECKS = 1')
  await conn.end()
  console.log('\n🗑️  Database cleared.')
})()
