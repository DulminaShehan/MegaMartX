// ============================================================
// Navbar — white background, light blue & black text theme
// ============================================================

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FiShoppingCart, FiSearch, FiMenu, FiX,
  FiUser, FiLogOut, FiPackage, FiShield, FiChevronDown, FiKey,
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import toast from 'react-hot-toast'

const Navbar = () => {
  const { currentUser, userProfile, logout, isAdmin, isSeller } = useAuth()
  const { cartCount } = useCart()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setMenuOpen(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out successfully')
    navigate('/')
    setDropdownOpen(false)
  }

  const NAV_LINKS = [
    { to: '/', label: 'Home' },
    { to: '/shop', label: 'Shop' },
    { to: '/about', label: 'About' },
    { to: '/contact', label: 'Contact' },
  ]

  return (
    <nav style={s.nav}>
      <div style={s.container}>

        {/* ── Logo ── */}
        <Link to="/" style={s.logo}>
          Mega<span style={s.logoBlue}>Mart</span>X
        </Link>

        {/* ── Search bar ── */}
        <form onSubmit={handleSearch} style={s.searchForm}>
          <div style={s.searchWrap}>
            <FiSearch size={16} color="#90caf9" style={{ flexShrink: 0 }} />
            <input
              style={s.searchInput}
              type="text"
              placeholder="Search for products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" style={s.searchBtn}>Search</button>
          </div>
        </form>

        {/* ── Desktop nav links ── */}
        <div style={s.navLinks}>
          {NAV_LINKS.map(({ to, label }) => (
            <Link key={to} to={to} style={s.navLink}>{label}</Link>
          ))}
        </div>

        {/* ── Right side actions ── */}
        <div style={s.actions}>

          {/* Cart icon */}
          <Link to="/cart" style={s.cartBtn}>
            <FiShoppingCart size={21} />
            {cartCount > 0 && <span style={s.badge}>{cartCount}</span>}
          </Link>

          {/* Logged-in user dropdown */}
          {currentUser ? (
            <div style={s.userMenu}>
              <button style={s.userBtn} onClick={() => setDropdownOpen(p => !p)}>
                {userProfile?.photoURL
                  ? <img src={userProfile.photoURL} alt="avatar" style={s.avatar} />
                  : <div style={s.avatarPlaceholder}>{userProfile?.name?.[0]?.toUpperCase() || <FiUser size={14} />}</div>
                }
                <span style={s.userName}>{userProfile?.name?.split(' ')[0] || 'Account'}</span>
                <FiChevronDown size={13} color="#555" />
              </button>

              {dropdownOpen && (
                <>
                  {/* Backdrop */}
                  <div style={s.dropBackdrop} onClick={() => setDropdownOpen(false)} />
                  <div style={s.dropdown}>
                    <div style={s.dropHeader}>
                      <p style={s.dropName}>{userProfile?.name || 'User'}</p>
                      <p style={s.dropEmail}>{currentUser.email}</p>
                    </div>
                    <Link to="/orders" style={s.dropItem} onClick={() => setDropdownOpen(false)}>
                      <FiPackage size={15} /> My Orders
                    </Link>
                    {isSeller && (
                      <Link to="/seller" style={s.dropItem} onClick={() => setDropdownOpen(false)}>
                        <FiPackage size={15} /> Seller Dashboard
                      </Link>
                    )}
                    {isAdmin && (
                      <Link to="/admin" style={s.dropItem} onClick={() => setDropdownOpen(false)}>
                        <FiShield size={15} /> Admin Panel
                      </Link>
                    )}
                    {isAdmin && (
                      <Link to="/admin?section=apikeys" style={s.dropItem} onClick={() => setDropdownOpen(false)}>
                        <FiKey size={15} /> API Keys
                      </Link>
                    )}
                    <div style={s.dropDivider} />
                    <button style={s.dropLogout} onClick={handleLogout}>
                      <FiLogOut size={15} /> Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div style={s.authBtns}>
              <Link to="/login" style={s.loginBtn}>Login</Link>
              <Link to="/register" style={s.signupBtn}>Sign Up</Link>
              <Link to="/seller-register" style={s.sellerBtn}>Become a Seller</Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button style={s.hamburger} onClick={() => setMenuOpen(p => !p)}>
            {menuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {menuOpen && (
        <div style={s.mobileMenu}>
          <form onSubmit={handleSearch} style={s.mobileSearchForm}>
            <div style={{ ...s.searchWrap, flex: 1 }}>
              <FiSearch size={15} color="#90caf9" style={{ flexShrink: 0 }} />
              <input
                style={s.searchInput}
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" style={s.searchBtn}>Go</button>
            </div>
          </form>

          {NAV_LINKS.map(({ to, label }) => (
            <Link key={to} to={to} style={s.mobileLink} onClick={() => setMenuOpen(false)}>
              {label}
            </Link>
          ))}

          <div style={s.mobileDivider} />

          {currentUser ? (
            <>
              <Link to="/orders" style={s.mobileLink} onClick={() => setMenuOpen(false)}>My Orders</Link>
              {isSeller && <Link to="/seller" style={s.mobileLink} onClick={() => setMenuOpen(false)}>Seller Dashboard</Link>}
              {isAdmin && <Link to="/admin" style={s.mobileLink} onClick={() => setMenuOpen(false)}>Admin Panel</Link>}
              {isAdmin && <Link to="/admin?section=apikeys" style={s.mobileLink} onClick={() => setMenuOpen(false)}>API Keys</Link>}
              <button style={s.mobileLogout} onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '8px', padding: '8px 0', flexWrap: 'wrap' }}>
              <Link to="/login" style={{ ...s.loginBtn, flex: 1, textAlign: 'center' }} onClick={() => setMenuOpen(false)}>Login</Link>
              <Link to="/register" style={{ ...s.signupBtn, flex: 1, textAlign: 'center' }} onClick={() => setMenuOpen(false)}>Sign Up</Link>
              <Link to="/seller-register" style={{ ...s.sellerBtn, width: '100%', textAlign: 'center' }} onClick={() => setMenuOpen(false)}>Become a Seller</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}

const s = {
  nav: {
    background: '#ffffff',
    borderBottom: '1px solid #e3f2fd',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    boxShadow: '0 2px 16px rgba(33,150,243,0.08)',
  },
  container: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '0 20px',
    height: '66px',
    display: 'flex',
    alignItems: 'center',
    gap: '18px',
  },
  logo: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#000000',
    whiteSpace: 'nowrap',
    letterSpacing: '-0.5px',
    flexShrink: 0,
  },
  logoBlue: { color: '#2196F3' },

  // Search
  searchForm: { flex: 1, maxWidth: '460px' },
  mobileSearchForm: { marginBottom: '8px' },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#f0f8ff',
    border: '1.5px solid #bbdefb',
    borderRadius: '10px',
    padding: '0 6px 0 12px',
    transition: 'border-color .2s',
  },
  searchInput: {
    flex: 1,
    background: 'none',
    border: 'none',
    outline: 'none',
    color: '#000',
    fontSize: '13px',
    padding: '9px 0',
  },
  searchBtn: {
    background: '#2196F3',
    color: '#fff',
    border: 'none',
    borderRadius: '7px',
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  // Nav links
  navLinks: { display: 'flex', gap: '2px' },
  navLink: {
    color: '#000000',
    padding: '7px 12px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'background .15s, color .15s',
  },

  // Actions
  actions: { display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' },
  cartBtn: {
    position: 'relative',
    color: '#000',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    borderRadius: '8px',
    transition: 'background .15s',
  },
  badge: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    background: '#2196F3',
    color: '#fff',
    fontSize: '10px',
    fontWeight: 700,
    borderRadius: '50%',
    width: '16px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // User menu
  userMenu: { position: 'relative' },
  userBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    background: '#f0f8ff',
    border: '1.5px solid #bbdefb',
    borderRadius: '10px',
    color: '#000',
    cursor: 'pointer',
    padding: '5px 10px 5px 6px',
    fontSize: '13px',
    fontWeight: 500,
  },
  avatar: { width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' },
  avatarPlaceholder: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    background: '#2196F3',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 700,
  },
  userName: { maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

  dropBackdrop: { position: 'fixed', inset: 0, zIndex: 199 },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    background: '#ffffff',
    border: '1px solid #e3f2fd',
    borderRadius: '12px',
    minWidth: '200px',
    overflow: 'hidden',
    boxShadow: '0 12px 32px rgba(33,150,243,0.14)',
    zIndex: 200,
    animation: 'fadeIn .15s ease',
  },
  dropHeader: {
    padding: '12px 16px',
    background: '#f0f8ff',
    borderBottom: '1px solid #e3f2fd',
  },
  dropName: { color: '#000', fontSize: '13px', fontWeight: 700, margin: 0 },
  dropEmail: { color: '#555', fontSize: '11px', margin: '2px 0 0' },
  dropItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
    padding: '10px 16px',
    color: '#000',
    fontSize: '13px',
    borderBottom: '1px solid #f0f8ff',
    transition: 'background .15s',
  },
  dropDivider: { borderTop: '1px solid #e3f2fd' },
  dropLogout: {
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
    width: '100%',
    padding: '10px 16px',
    color: '#e53935',
    background: 'none',
    border: 'none',
    fontSize: '13px',
    cursor: 'pointer',
    textAlign: 'left',
  },

  // Auth buttons
  authBtns: { display: 'flex', gap: '8px' },
  loginBtn: {
    color: '#2196F3',
    padding: '7px 16px',
    border: '1.5px solid #2196F3',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    transition: 'all .15s',
  },
  signupBtn: {
    color: '#fff',
    padding: '7px 16px',
    background: '#2196F3',
    border: '1.5px solid #2196F3',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    transition: 'all .15s',
  },
  sellerBtn: {
    color: '#fff',
    padding: '7px 16px',
    background: 'linear-gradient(135deg, #2196F3 0%, #1565C0 100%)',
    border: '1.5px solid #1565C0',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 700,
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 8px rgba(33,150,243,0.3)',
  },

  // Mobile
  hamburger: {
    background: 'none',
    border: 'none',
    color: '#000',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '8px',
    display: 'flex',
  },
  mobileMenu: {
    background: '#ffffff',
    borderTop: '1px solid #e3f2fd',
    padding: '12px 20px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    boxShadow: '0 8px 24px rgba(33,150,243,0.08)',
  },
  mobileLink: {
    color: '#000',
    padding: '11px 8px',
    fontSize: '15px',
    fontWeight: 500,
    borderBottom: '1px solid #f0f8ff',
  },
  mobileDivider: { borderTop: '1px solid #e3f2fd', margin: '6px 0' },
  mobileLogout: {
    background: 'none',
    border: 'none',
    color: '#e53935',
    padding: '11px 8px',
    fontSize: '15px',
    cursor: 'pointer',
    textAlign: 'left',
  },
}

export default Navbar
