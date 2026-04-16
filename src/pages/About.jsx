// ============================================================
// About Us Page — white & light blue theme, no team section
// ============================================================

import { FiTarget, FiHeart, FiAward, FiUsers } from 'react-icons/fi'

const stats = [
  { label: 'Products Listed', val: '50,000+' },
  { label: 'Registered Sellers', val: '5,000+' },
  { label: 'Happy Customers', val: '200,000+' },
  { label: 'Countries Served', val: '25+' },
]

const About = () => (
  <div style={styles.page}>
    {/* Hero */}
    <section style={styles.hero}>
      <h1 style={styles.heroTitle}>
        About <span style={styles.accent}>MegaMartX</span>
      </h1>
      <p style={styles.heroSub}>
        We're on a mission to make online shopping accessible, affordable, and
        enjoyable for everyone — from first-time buyers to power sellers.
      </p>
    </section>

    {/* Stats */}
    <section style={styles.statsSection}>
      <div style={styles.statsGrid}>
        {stats.map((s) => (
          <div key={s.label} style={styles.statCard}>
            <p style={styles.statVal}>{s.val}</p>
            <p style={styles.statLabel}>{s.label}</p>
          </div>
        ))}
      </div>
    </section>

    {/* Values */}
    <div style={styles.container}>
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Our Values</h2>
        <div style={styles.valuesGrid}>
          {[
            { icon: FiTarget, title: 'Our Mission', text: 'To connect buyers and sellers seamlessly, creating a marketplace that empowers local businesses and delights customers worldwide.' },
            { icon: FiHeart, title: 'Customer First', text: 'Everything we build is designed with our customers in mind. From fast delivery to easy returns, we put your satisfaction first.' },
            { icon: FiAward, title: 'Quality Assured', text: 'We work with verified sellers and monitor product quality to ensure you always get what you expect — or better.' },
            { icon: FiUsers, title: 'Community Driven', text: "MegaMartX is more than a marketplace. It's a thriving community of sellers and buyers who support each other." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} style={styles.valueCard}>
              <div style={styles.valueIcon}>
                <Icon size={24} color="#1565C0" />
              </div>
              <h3 style={styles.valueTitle}>{title}</h3>
              <p style={styles.valueText}>{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  </div>
)

const styles = {
  page: { background: '#ffffff' },

  hero: {
    background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
    padding: '80px 24px',
    textAlign: 'center',
    borderBottom: '1px solid #90caf9',
  },
  heroTitle: {
    color: '#0d1b2a',
    fontSize: 'clamp(28px, 5vw, 48px)',
    fontWeight: 800,
    margin: '0 0 16px',
  },
  accent: { color: '#E53935' },
  heroSub: {
    color: '#546e7a',
    fontSize: '16px',
    lineHeight: '1.7',
    maxWidth: '600px',
    margin: '0 auto',
  },

  statsSection: {
    background: '#f0f8ff',
    borderBottom: '1px solid #bbdefb',
    padding: '40px 24px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '16px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  statCard: {
    textAlign: 'center',
    padding: '20px',
    background: '#ffffff',
    border: '1px solid #90caf9',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(21,101,192,0.08)',
  },
  statVal: { color: '#E53935', fontSize: '28px', fontWeight: 800, margin: '0 0 4px' },
  statLabel: { color: '#607d8b', fontSize: '13px', margin: 0 },

  container: { maxWidth: '1100px', margin: '0 auto', padding: '0 16px' },
  section: { padding: '64px 0' },
  sectionTitle: {
    color: '#0d1b2a',
    fontSize: '24px',
    fontWeight: 700,
    margin: '0 0 32px',
    textAlign: 'center',
  },

  valuesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
  },
  valueCard: {
    background: '#f0f8ff',
    border: '1px solid #90caf9',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 10px rgba(21,101,192,0.07)',
  },
  valueIcon: {
    width: '48px',
    height: '48px',
    background: '#e3f2fd',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  valueTitle: { color: '#0d1b2a', fontSize: '16px', fontWeight: 600, margin: '0 0 10px' },
  valueText: { color: '#546e7a', fontSize: '13px', lineHeight: '1.7', margin: 0 },
}

export default About
