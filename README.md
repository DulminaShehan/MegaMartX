# 🛒 MegaMartX — Full Stack eCommerce Platform

![React](https://img.shields.io/badge/Frontend-React-blue)
![Node.js](https://img.shields.io/badge/Backend-Node.js-green)
![Express](https://img.shields.io/badge/Framework-Express-black)
![MySQL](https://img.shields.io/badge/Database-MySQL-orange)
![JWT](https://img.shields.io/badge/Auth-JWT-red)
![Status](https://img.shields.io/badge/Status-Active-success)

A modern **Full-Stack eCommerce Platform** built using **React, Node.js, Express, and MySQL**, featuring:

- 👤 Multi-role Authentication (User / Seller / Admin)
- 🛍 Complete Shopping System
- 🔐 API Key Management
- ⭐ Product Reviews & Ratings
- 📊 Admin Analytics Dashboard
- 📱 Responsive Modern UI

---

# ✨ Features

## 👤 Customer Features
- User Registration & Login (JWT)
- Product Browsing
- Search and Filtering
- Shopping Cart
- Checkout System
- Order History
- Delivery Tracking
- Product Ratings & Reviews

---

## 🏪 Seller Dashboard
- Add Products
- Edit/Delete Products
- Upload Multiple Product Images
- Manage Inventory
- View Sales
- Track Orders

---

## 👑 Admin Dashboard
- User Management
- Seller Management
- Create Admin Accounts
- Dashboard Analytics
- API Key Management
- System Monitoring
- Role-based Navigation

---

# 🔐 API Key System

Supports secure external API access using `X-API-Key`.

### Public API Endpoints
```http
GET /api/v1/ping
GET /api/v1/products
GET /api/v1/orders
```

Features:
- Generate API Keys
- Validate Keys
- Protected Routes
- External API Access

---

# ⭐ Review System
- 1–5 Star Ratings
- Verified Purchase Reviews
- Duplicate Review Prevention
- Order Ownership Validation
- Product Rating Summary

---

# 🛒 Order System
- Add to Cart
- Update Quantities
- Remove Items
- Checkout
- Track Orders
- Delivery Status Updates

---

# 🧱 Tech Stack

## Frontend
- React
- Axios
- React Router
- Responsive UI

## Backend
- Node.js
- Express.js
- JWT Authentication

## Database
- MySQL

---

# 🗄 Database Schema
Tables Included:

```sql
users
products
cart
orders
order_items
reviews
api_keys
```

---

# 🎨 UI Design
Theme:
- White `#FFFFFF`
- Light Blue `#2196F3`
- Black `#000000`

Features:
- Clean Dashboard Layout
- Modern eCommerce UI
- Mobile Responsive

---

# 🔒 Security
- JWT Authentication
- Role-Based Access Control
- Protected Routes
- API Key Middleware
- Order Ownership Validation

---

# 📦 Installation

## Clone Repository
```bash
git clone https://github.com/your-username/megamartx.git
```

## Backend Setup
```bash
cd backend
npm install
npm start
```

## Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

# ⚙ Environment Variables

Create `.env`

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=megamartx
JWT_SECRET=your_secret_key
```

---

# 📡 API Features
- Secure REST APIs
- Public Product APIs
- Admin-only Endpoints
- API Key Protected Routes

---

# 📸 Project Status

## Completed Modules
- ✅ Authentication System
- ✅ Seller Dashboard
- ✅ Cart & Orders
- ✅ Admin Panel
- ✅ API Key System
- ✅ Review System

---

# 🚀 Future Improvements
- Stripe Payments
- Wishlist System
- Rewards System
- Email Notifications
- Real-time Order Tracking
- Advanced Analytics
- Recommendation Engine
- Chat Support

---

# 🛣 Roadmap
Phase 1
- Recommendations
- Chat
- Order Tracking
- Storefronts

Phase 2
- Rewards
- Wishlist
- Analytics

---

# 🤝 Contributing
Contributions, ideas and improvements are welcome.

```bash
Fork → Create Branch → Commit → Push → Pull Request
```

---

# 👨‍💻 Developer
Built as a portfolio-grade full stack project for freelance and real-world eCommerce simulation.

---

# ⭐ Support
If you like this project, give it a star ⭐

---

# 📄 License
For educational and portfolio purposes.
