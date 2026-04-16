// ============================================================
// Firebase Storage helpers for image uploads
// ============================================================

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from './config'
import { v4 as uuidv4 } from 'uuid'

/**
 * Upload a product image to Firebase Storage.
 * Returns the public download URL.
 */
export const uploadProductImage = async (file, sellerUid) => {
  // Unique filename: products/<sellerUid>/<uuid>.<ext>
  const ext = file.name.split('.').pop()
  const filename = `products/${sellerUid}/${uuidv4()}.${ext}`
  const storageRef = ref(storage, filename)

  const snapshot = await uploadBytes(storageRef, file)
  const url = await getDownloadURL(snapshot.ref)
  return { url, path: filename }
}

/**
 * Delete an image from Firebase Storage by its path.
 */
export const deleteProductImage = async (path) => {
  if (!path) return
  const storageRef = ref(storage, path)
  await deleteObject(storageRef)
}
