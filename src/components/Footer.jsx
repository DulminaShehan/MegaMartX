// ============================================================
// Footer — white + light blue theme
// ============================================================

import { Link } from 'react-router-dom'
import { FiFacebook, FiTwitter, FiInstagram, FiYoutube, FiMail, FiPhone, FiMapPin } from 'react-icons/fi'

const Footer = () => (
  <footer style={s.footer}>
    <div style={s.top}>
      <div style={s.grid}>

        {/* Brand */}
        <div style={s.col}>
          <h2 style={s.brand}>Mega<span style={s.blue}>Mart</span>X</h2>
          <p style={s.tagline}>Your one-stop online shopping destination. Quality products at unbeatable prices.</p>
          <div style={s.socials}>
            {[FiFacebook, FiTwitter, FiInstagram, FiYoutube].map((Icon, i) => (
              <a key={i} href="#" style={s.socialIcon}><Icon size={16} /></a>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div style={s.col}>
          <h4 style={s.colTitle}>Quick Links</h4>
          {[['/shop','Shop All Products'],['/about','About Us'],['/contact','Contact Us'],['/register','Become a Seller']].map(([to, label]) => (
            <Link key={to} to={to} style={s.link}>{label}</Link>
          ))}
        </div>

        {/* Help */}
        <div style={s.col}>
          <h4 style={s.colTitle}>Help & Support</h4>
          {[['/orders','Track Orders'],['#','Return Policy'],['#','FAQ'],['#','Privacy Policy']].map(([to, label]) => (
            <Link key={label} to={to} style={s.link}>{label}</Link>
          ))}
        </div>

        {/* Contact */}
        <div style={s.col}>
          <h4 style={s.colTitle}>Contact Us</h4>
          {[
            { Icon: FiMapPin, text: '123 Market Street, Colombo, Sri Lanka' },
            { Icon: FiPhone, text: '+94 77 123 4567' },
            { Icon: FiMail, text: 'support@megamartx.com' },
          ].map(({ Icon, text }) => (
            <div key={text} style={s.contactRow}>
              <Icon size={14} color="#2196F3" style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Bottom bar */}
    <div style={s.bottom}>
      <p style={s.copy}>&copy; {new Date().getFullYear()} MegaMartX. All rights reserved.</p>
      <p style={s.copy}>Made with ❤️ for great shopping experiences</p>
    </div>
  </footer>
)

const s = {
  footer: {
    background: '#f0f8ff',
    borderTop: '1px solid #bbdefb',
    marginTop: 'auto',
  },
  top: { maxWidth: '1280px', margin: '0 auto', padding: '48px 20px 28px' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: '36px',
  },
  col: { display: 'flex', flexDirection: 'column', gap: '10px' },
  brand: { fontSize: '22px', fontWeight: 800, color: '#000', margin: 0 },
  blue: { color: '#2196F3' },
  tagline: { color: '#555', fontSize: '13px', lineHeight: '1.65', margin: 0 },
  socials: { display: 'flex', gap: '8px', marginTop: '4px' },
  socialIcon: {
    width: '32px', height: '32px',
    background: '#fff', border: '1px solid #bbdefb',
    borderRadius: '8px', color: '#2196F3',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all .2s',
    boxShadow: '0 1px 4px rgba(33,150,243,0.08)',
  },
  colTitle: {
    color: '#000', fontSize: '13px', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 4px',
  },
  link: { color: '#555', fontSize: '13px', transition: 'color .15s' },
  contactRow: { display: 'flex', gap: '8px', color: '#555', fontSize: '13px', alignItems: 'flex-start' },
  bottom: {
    borderTop: '1px solid #bbdefb',
    padding: '14px 20px',
    maxWidth: '1280px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '6px',
  },
  copy: { color: '#888', fontSize: '12px', margin: 0 },
}

export default Footer
