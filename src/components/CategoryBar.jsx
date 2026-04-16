// ============================================================
// CategoryBar — white background, blue active pill
// ============================================================

import { CATEGORIES } from '../utils/helpers'

const CategoryBar = ({ selected, onSelect }) => (
  <div style={s.wrapper}>
    <div style={s.bar}>
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          style={{ ...s.btn, ...(selected === cat ? s.active : {}) }}
          onClick={() => onSelect(cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  </div>
)

const s = {
  wrapper: {
    background: '#ffffff',
    borderBottom: '1px solid #e3f2fd',
    overflowX: 'auto',
    scrollbarWidth: 'none',
  },
  bar: {
    display: 'flex',
    gap: '6px',
    padding: '12px 20px',
    maxWidth: '1280px',
    margin: '0 auto',
    minWidth: 'max-content',
  },
  btn: {
    padding: '7px 18px',
    background: '#f0f8ff',
    border: '1.5px solid #bbdefb',
    borderRadius: '20px',
    color: '#555',
    fontSize: '13px', fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all .15s',
  },
  active: {
    background: '#2196F3',
    border: '1.5px solid #2196F3',
    color: '#fff',
    fontWeight: 700,
    boxShadow: '0 3px 10px rgba(33,150,243,0.25)',
  },
}

export default CategoryBar
