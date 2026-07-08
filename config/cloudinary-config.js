// ============================================================
// cloudinary-config.js
// ------------------------------------------------------------
// Replace with your real Cloudinary cloud name and unsigned
// upload preset (Cloudinary Console → Settings → Upload →
// Upload presets → Add upload preset → Signing Mode: Unsigned).
//
// Unsigned presets are safe for client-side uploads: they let
// the browser upload directly to Cloudinary without exposing
// your API secret. Restrict the preset's allowed formats/size
// in the Cloudinary dashboard for extra safety.
// ============================================================

export const CLOUDINARY_CONFIG = {
  cloudName: "dkbadi6hs",
  uploadPreset: "AKUBASE-APP",
  uploadUrl: null // set below, derived from cloudName
};
CLOUDINARY_CONFIG.uploadUrl =
  `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`;

/**
 * Uploads a single File object to Cloudinary.
 * Returns { url, publicId } on success.
 */
export async function uploadImageToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset);

  const res = await fetch(CLOUDINARY_CONFIG.uploadUrl, {
    method: "POST",
    body: formData
  });

  if (!res.ok) {
    throw new Error(`Cloudinary upload failed: ${res.status}`);
  }

  const data = await res.json();
  return { url: data.secure_url, publicId: data.public_id };
}

/**
 * Uploads multiple files in parallel.
 * Returns an array of { url, publicId }, in the same order as input.
 */
export async function uploadMultipleImages(fileList) {
  const files = Array.from(fileList);
  return Promise.all(files.map(uploadImageToCloudinary));
}
