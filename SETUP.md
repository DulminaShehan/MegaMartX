# MegaMartX — Setup Guide

## Prerequisites
- Node.js 18+ installed → https://nodejs.org
- A Google account (for Firebase)

---

## Step 1 — Install Dependencies

```bash
cd MegaMartX
npm install
```

---

## Step 2 — Create a Firebase Project

1. Go to **https://console.firebase.google.com**
2. Click **"Add project"** → Name it `megamartx` → Continue
3. Disable Google Analytics (optional) → **Create project**

### 2a. Enable Authentication
1. In Firebase Console → **Authentication** → **Get started**
2. **Sign-in method** tab → Enable **Email/Password**
3. Enable **Google** (set your project support email)

### 2b. Create Firestore Database
1. **Firestore Database** → **Create database**
2. Choose **Start in test mode** (for development)
3. Select a region → **Enable**

### 2c. Enable Storage
1. **Storage** → **Get started**
2. Choose **Start in test mode** → **Done**

### 2d. Get Your Config Keys
1. **Project Settings** (gear icon) → **General** tab
2. Scroll to **"Your apps"** → Click **"</> Web"**
3. Register app as `megamartx` → Copy the `firebaseConfig` object

---

## Step 3 — Set Up Environment Variables

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` and paste your Firebase values:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=megamartx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=megamartx
VITE_FIREBASE_STORAGE_BUCKET=megamartx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

---

## Step 4 — Run the Development Server

```bash
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## Step 5 — Create Your First Admin Account

1. Register a new account at `/register`
2. Go to **Firebase Console → Firestore Database**
3. Find the `users` collection → click your user document
4. Change the `role` field from `"user"` to `"admin"`
5. Refresh the app — you'll now see the Admin Panel link

---

## Firestore Security Rules (Production)

Replace test mode rules with these before deploying:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can read/write their own profile; admins can read all
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      allow read: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow update: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Anyone can read products; only sellers/admins can create
    match /products/{productId} {
      allow read: if true;
      allow create: if request.auth != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['seller','admin'];
      allow update, delete: if request.auth != null
        && (resource.data.sellerUid == request.auth.uid
          || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }

    // Orders: users can create and read their own; admins can read all
    match /orders/{orderId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null
        && (resource.data.userId == request.auth.uid
          || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow update: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

---

## Storage Rules (Production)

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /products/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth.uid == userId
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

---

## Build for Production

```bash
npm run build
```

Output is in the `dist/` folder. Deploy to:
- **Firebase Hosting**: `firebase deploy`
- **Vercel**: `vercel --prod`
- **Netlify**: drag & drop the `dist/` folder

---

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── Navbar.jsx
│   ├── Footer.jsx
│   ├── ProductCard.jsx
│   ├── CartItem.jsx
│   ├── HeroSection.jsx
│   ├── CategoryBar.jsx
│   ├── ProtectedRoute.jsx
│   └── Loader.jsx
├── context/          # React Context (global state)
│   ├── AuthContext.jsx   ← Firebase auth + user profile
│   └── CartContext.jsx   ← localStorage-backed cart
├── firebase/         # Firebase SDK wrappers
│   ├── config.js         ← Firebase initialization
│   ├── firestore.js      ← CRUD helpers for all collections
│   └── storage.js        ← Image upload/delete helpers
├── pages/            # One file per route
│   ├── Home.jsx
│   ├── Shop.jsx
│   ├── ProductDetails.jsx
│   ├── Cart.jsx
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── SellerDashboard.jsx
│   ├── AdminPanel.jsx
│   ├── OrderHistory.jsx
│   ├── About.jsx
│   └── Contact.jsx
├── utils/
│   └── helpers.js    ← formatPrice, truncate, CATEGORIES, etc.
├── App.jsx           ← Routing + providers
├── main.jsx          ← React entry point
└── index.css         ← Global styles + responsive breakpoints
```
