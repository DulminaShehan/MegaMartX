// ============================================================
// Shared utility functions used across the app
// ============================================================

/** Format a number as a currency string (LKR or USD) */
export const formatPrice = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

/** Truncate a long string with ellipsis */
export const truncate = (str, maxLen = 60) => {
  if (!str) return ''
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str
}

/** Return a placeholder image URL when a product image fails */
export const imgFallback = (w = 400, h = 300) =>
  `https://placehold.co/${w}x${h}/e3f2fd/2196F3?text=No+Image`

/** Convert a Firestore Timestamp to a readable date string */
export const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A'
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** All product categories used across the app */
export const CATEGORIES = [
  'All',
  'Electronics',
  'Fashion',
  'Home & Living',
  'Sports',
  'Beauty',
  'Books',
  'Toys',
  'Grocery',
  'Automotive',
]

/** Order status badge color map */
export const STATUS_COLORS = {
  pending:          '#f59e0b',
  processing:       '#3b82f6',
  packed:           '#06b6d4',
  shipped:          '#8b5cf6',
  out_for_delivery: '#f97316',
  delivered:        '#10b981',
  cancelled:        '#ef4444',
}
