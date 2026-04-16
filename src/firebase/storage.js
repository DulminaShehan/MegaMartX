// ============================================================
// storage.js — Firebase Storage removed.
// Image upload now uses multer (POST /api/upload on the server).
// deleteProductImage is a no-op: the server cleans up old images
// when a product is updated or deleted.
// ============================================================

/**
 * No longer used — image upload goes through SellerDashboard
 * via axios POST /api/upload (multer).
 */
export const uploadProductImage = async () => {
  throw new Error('Use the /api/upload endpoint (multer) for image uploads.')
}

/**
 * No-op — the server handles file cleanup.
 */
export const deleteProductImage = async () => {}
