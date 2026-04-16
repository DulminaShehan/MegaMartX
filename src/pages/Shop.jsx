// ============================================================
// Shop Page — full listing with search, sort, price filter
// ============================================================

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FiSearch, FiSliders, FiX } from 'react-icons/fi'
import CategoryBar from '../components/CategoryBar'
import ProductCard from '../components/ProductCard'
import { FullPageLoader } from '../components/Loader'
import { getAllProducts } from '../firebase/firestore'

const SORTS = [
  { label: 'Newest First',       value: 'newest' },
  { label: 'Price: Low → High',  value: 'price_asc' },
  { label: 'Price: High → Low',  value: 'price_desc' },
  { label: 'Name A–Z',           value: 'name_asc' },
]

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [all, setAll]         = useState([])
  const [shown, setShown]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState(searchParams.get('search') || '')
  const [category, setCat]    = useState(searchParams.get('category') || 'All')
  const [sort, setSort]       = useState('newest')
  const [maxPrice, setMax]    = useState(10000)
  const [filters, showFilters] = useState(false)

  useEffect(() => {
    getAllProducts().then(setAll).catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let r = [...all]
    if (category !== 'All') r = r.filter(p => p.category === category)
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(p => p.title?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
    }
    r = r.filter(p => p.price <= maxPrice)
    if (sort === 'price_asc') r.sort((a, b) => a.price - b.price)
    else if (sort === 'price_desc') r.sort((a, b) => b.price - a.price)
    else if (sort === 'name_asc') r.sort((a, b) => a.title?.localeCompare(b.title))
    setShown(r)
  }, [all, category, search, sort, maxPrice])

  const handleCat = (cat) => {
    setCat(cat)
    setSearchParams(cat !== 'All' ? { category: cat } : {})
  }

  return (
    <div style={{ background: '#fff', minHeight: '80vh' }}>
      <CategoryBar selected={category} onSelect={handleCat} />

      <div style={s.container}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <h1 style={s.title}>{category === 'All' ? 'All Products' : category}</h1>
            <p style={s.count}><span style={s.countNum}>{shown.length}</span> products found</p>
          </div>

          <div style={s.controls}>
            {/* Search */}
            <div style={s.searchBox}>
              <FiSearch size={14} color="#90caf9" />
              <input
                style={s.searchInput}
                placeholder="Search products…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button style={s.clearBtn} onClick={() => setSearch('')}><FiX size={13} /></button>
              )}
            </div>

            {/* Sort */}
            <select style={s.select} value={sort} onChange={e => setSort(e.target.value)}>
              {SORTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {/* Filter toggle */}
            <button
              style={{ ...s.filterBtn, ...(filters ? s.filterBtnActive : {}) }}
              onClick={() => showFilters(p => !p)}
            >
              <FiSliders size={14} /> Filters
            </button>
          </div>
        </div>

        {/* Filter panel */}
        {filters && (
          <div style={s.filterPanel}>
            <div style={s.filterGroup}>
              <label style={s.filterLabel}>
                Max Price: <strong style={{ color: '#2196F3' }}>${maxPrice.toLocaleString()}</strong>
              </label>
              <input
                type="range" min={0} max={10000} step={50}
                value={maxPrice}
                onChange={e => setMax(Number(e.target.value))}
                style={s.range}
              />
              <div style={s.rangeRow}><span>$0</span><span>$10,000</span></div>
            </div>
          </div>
        )}

        {/* Grid */}
        {loading ? <FullPageLoader /> : shown.length === 0 ? (
          <div style={s.empty}>
            <p style={s.emptyTitle}>No products found</p>
            <p style={s.emptySub}>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div style={s.grid}>
            {shown.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  container: { maxWidth: '1280px', margin: '0 auto', padding: '32px 20px 64px' },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', flexWrap: 'wrap',
    gap: '16px', marginBottom: '24px',
  },
  title: { color: '#000', fontSize: '26px', fontWeight: 700, margin: '0 0 4px' },
  count: { color: '#777', fontSize: '13px', margin: 0 },
  countNum: { color: '#2196F3', fontWeight: 700 },
  controls: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' },

  searchBox: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: '#f0f8ff', border: '1.5px solid #bbdefb',
    borderRadius: '10px', padding: '8px 12px',
    minWidth: '220px',
  },
  searchInput: {
    background: 'none', border: 'none', outline: 'none',
    color: '#000', fontSize: '13px', flex: 1,
  },
  clearBtn: {
    background: 'none', border: 'none', color: '#aaa',
    cursor: 'pointer', display: 'flex', padding: 0,
  },

  select: {
    background: '#f0f8ff', border: '1.5px solid #bbdefb',
    borderRadius: '10px', color: '#000',
    fontSize: '13px', padding: '8px 12px', cursor: 'pointer',
  },
  filterBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: '#f0f8ff', border: '1.5px solid #bbdefb',
    borderRadius: '10px', color: '#555',
    fontSize: '13px', padding: '8px 14px', cursor: 'pointer',
  },
  filterBtnActive: { background: '#e3f2fd', border: '1.5px solid #2196F3', color: '#2196F3' },

  filterPanel: {
    background: '#f0f8ff', border: '1px solid #bbdefb',
    borderRadius: '12px', padding: '20px 24px', marginBottom: '24px',
  },
  filterGroup: { maxWidth: '320px' },
  filterLabel: { color: '#555', fontSize: '13px', display: 'block', marginBottom: '10px' },
  range: { width: '100%', accentColor: '#2196F3' },
  rangeRow: { display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: '12px', marginTop: '4px' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' },
  empty: { textAlign: 'center', padding: '80px 24px' },
  emptyTitle: { color: '#000', fontSize: '20px', fontWeight: 600, margin: '0 0 8px' },
  emptySub: { color: '#777', fontSize: '14px', margin: 0 },
}

export default Shop
