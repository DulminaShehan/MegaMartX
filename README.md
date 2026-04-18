# 🛒 MegaMartX – Full Stack eCommerce Platform

MegaMartX is a modern full-stack eCommerce web application built with React, Node.js, Express, and MySQL.  
It includes role-based access (User, Seller, Admin), API key system, product reviews, and a complete shopping system.

---

## 🚀 Features

### 👤 User Features
- Register / Login system (JWT Authentication)
- Browse products
- Add to cart
- Place orders (Cash on Delivery / Card Payment)
- View order history
- Product rating & reviews (after delivery)

---

### 🏪 Seller Features
- Seller dashboard
- Add / Edit / Delete products
- Upload product images
- Manage own products
- View sales/orders

---

### 🛠️ Admin Features
- Admin dashboard with analytics
- View total users, sellers, buyers
- Manage all users
- Create new admin accounts
- API Key management system
- Access external API system using keys
- Role-based navigation system

---

### 🔐 API Key System
- Generate API keys for external access
- Secure API routes using `X-API-Key`
- Public API endpoints:
  - `/api/v1/ping`
  - `/api/v1/products`
  - `/api/v1/orders`

---

### ⭐ Product Reviews System
- Users can review products after delivery only
- Star rating system (1–5)
- Prevent duplicate reviews
- Review validation using order ownership
- Product rating summary

---

### 🛒 Cart & Order System
- Add to cart
- Update quantity
- Remove items
- Checkout system
- Order tracking
- Delivery status system

---

## 🧱 Tech Stack

### Frontend
- React
- Axios
- React Router
- Modern UI (White + Light Blue Theme)

### Backend
- Node.js
- Express.js
- JWT Authentication

### Database
- MySQL

---

## 🗄️ Database Tables

- users
- products
- cart
- orders
- order_items
- reviews
- api_keys

---

## 🎨 UI Theme

- Background: White (#FFFFFF)
- Primary Color: Light Blue (#2196F3)
- Text Color: Black (#000000)
- Clean modern dashboard design
- Responsive layout (mobile + desktop)

---

## 🔐 Security Features

- JWT authentication
- Role-based access control
- API key validation middleware
- Protected admin routes
- Order ownership validation

---

## 📦 Installation

### 1. Clone repository
```bash
git clone https://github.com/your-username/megamartx.git
2. Backend setup
cd backend
npm install
npm start
3. Frontend setup
cd frontend
npm install
npm run dev
⚙️ Environment Variables

Create .env file:

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=megamartx
JWT_SECRET=your_secret_key
📡 API Features
Secure REST APIs
API Key protected routes
Admin-only endpoints
Public product APIs
👑 Admin Panel

Admin can:

View dashboard stats
Manage users
Create new admins
Manage API keys
Monitor system activity
📸 Project Status

✔ Auth System Completed
✔ Seller Dashboard Completed
✔ Cart & Orders Completed
✔ Admin Panel Completed
✔ API Key System Completed
✔ Reviews System Completed

💡 Future Improvements
Payment gateway integration (Stripe)
Email notifications
Real-time order tracking
Advanced analytics dashboard
👨‍💻 Developer

Built as a full-stack portfolio project for Fiverr and real-world eCommerce simulation.

⭐ License

This project is for educational and portfolio purposes.
