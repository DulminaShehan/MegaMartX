// ============================================================
// Loader — blue spinner on white background
// ============================================================

export const FullPageLoader = () => (
  <div style={s.full}>
    <div style={s.spinner} />
    <p style={s.text}>Loading…</p>
  </div>
)

export const InlineLoader = () => (
  <div style={s.inline}>
    <div style={s.spinnerSm} />
  </div>
)

const s = {
  full: {
    minHeight: '50vh',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: '14px',
  },
  spinner: {
    width: '42px', height: '42px',
    border: '4px solid #e3f2fd',
    borderTop: '4px solid #2196F3',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  text: { color: '#888', fontSize: '14px', margin: 0 },
  inline: { display: 'flex', justifyContent: 'center', padding: '24px' },
  spinnerSm: {
    width: '26px', height: '26px',
    border: '3px solid #e3f2fd',
    borderTop: '3px solid #2196F3',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
}
