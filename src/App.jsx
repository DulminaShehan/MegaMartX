import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Component } from 'react'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'

// Pages
import Home           from './pages/Home'
import Shop           from './pages/Shop'
import ProductDetails from './pages/ProductDetails'
import Cart           from './pages/Cart'
import Login          from './pages/Login'
import Register       from './pages/Register'
import SellerRegister  from './pages/SellerRegister'
import AdminRegister   from './pages/AdminRegister'
import SellerDashboard from './pages/SellerDashboard'
import AdminPanel     from './pages/AdminPanel'
import OrderHistory      from './pages/OrderHistory'
import OrderDetails      from './pages/OrderDetails'
import Checkout          from './pages/Checkout'
import OrderConfirmation from './pages/OrderConfirmation'
import About             from './pages/About'
import Contact           from './pages/Contact'

// ── Error boundary catches any render crash ──────────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px', background:'#fff', textAlign:'center' }}>
          <div style={{ fontSize:'48px', marginBottom:'16px' }}>⚠️</div>
          <h2 style={{ color:'#000', fontWeight:700, marginBottom:'10px' }}>Something went wrong</h2>
          <p style={{ color:'#555', marginBottom:'8px', maxWidth:'480px' }}>
            The app encountered an unexpected error. Make sure:
          </p>
          <ul style={{ color:'#555', textAlign:'left', marginBottom:'20px', lineHeight:'2' }}>
            <li>✅ MySQL is running and the <strong>server</strong> is started (<code>cd server && node index.js</code>)</li>
            <li>✅ <strong>DB_PASS</strong> and <strong>JWT_SECRET</strong> are set in your <strong>.env</strong> file</li>
            <li>✅ Restarted <strong>npm run dev</strong> after editing .env</li>
          </ul>
          <details style={{ color:'#e53935', fontSize:'12px', maxWidth:'600px', wordBreak:'break-all' }}>
            <summary style={{ cursor:'pointer', marginBottom:'6px' }}>Show error details</summary>
            {this.state.error.toString()}
          </details>
          <button
            style={{ marginTop:'20px', padding:'10px 24px', background:'#2196F3', color:'#fff', border:'none', borderRadius:'8px', fontWeight:600, cursor:'pointer', fontSize:'14px' }}
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ── 404 page ─────────────────────────────────────────────────
const NotFound = () => (
  <div style={{ minHeight:'70vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'14px', textAlign:'center', padding:'24px' }}>
    <h1 style={{ fontSize:'80px', fontWeight:800, color:'#2196F3', margin:0, lineHeight:1 }}>404</h1>
    <h2 style={{ color:'#000', margin:0 }}>Page Not Found</h2>
    <p style={{ color:'#777', margin:0 }}>The page you're looking for doesn't exist.</p>
    <a href="/" style={{ marginTop:'8px', padding:'12px 28px', background:'#2196F3', color:'#fff', borderRadius:'10px', fontWeight:700, textDecoration:'none', boxShadow:'0 4px 14px rgba(33,150,243,0.3)' }}>
      Go Home
    </a>
  </div>
)

// ── App ───────────────────────────────────────────────────────
const App = () => (
  <ErrorBoundary>
    <AuthProvider>
      <CartProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#fff',
                color: '#000',
                border: '1px solid #e3f2fd',
                fontSize: '14px',
                boxShadow: '0 4px 16px rgba(33,150,243,0.12)',
              },
              success: { iconTheme: { primary: '#2196F3', secondary: '#fff' } },
              error:   { iconTheme: { primary: '#e53935', secondary: '#fff' } },
            }}
          />

          <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh', background:'#fff' }}>
            <Navbar />
            <main style={{ flex: 1 }}>
              <Routes>
                {/* Public */}
                <Route path="/"            element={<Home />} />
                <Route path="/shop"        element={<Shop />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/cart"        element={<Cart />} />
                <Route path="/login"       element={<Login />} />
                <Route path="/register"         element={<Register />} />
                <Route path="/seller-register" element={<SellerRegister />} />
                <Route path="/admin-register"  element={<AdminRegister />} />
                <Route path="/about"       element={<About />} />
                <Route path="/contact"     element={<Contact />} />

                {/* Logged-in users */}
                <Route path="/checkout"                 element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
                <Route path="/order-confirmation/:id"   element={<ProtectedRoute><OrderConfirmation /></ProtectedRoute>} />
                <Route path="/orders"                   element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
                <Route path="/orders/:id"               element={<ProtectedRoute><OrderDetails /></ProtectedRoute>} />

                {/* Sellers */}
                <Route path="/seller" element={<ProtectedRoute role="seller"><SellerDashboard /></ProtectedRoute>} />

                {/* Admin */}
                <Route path="/admin" element={<ProtectedRoute role="admin"><AdminPanel /></ProtectedRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  </ErrorBoundary>
)

export default App
