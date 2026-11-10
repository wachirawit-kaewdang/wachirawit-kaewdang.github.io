// Hashes of the files copied in or built by hand. They live here so both npm run check and the git
// hooks (scripts/check-phone.mjs) can compare against them. A binary file can't be scanned for a
// phone number, so each one is tied by hash to something that can.

// Charts and the share image, in public/. If a change was meant, update the hash here.
export const pinnedFiles = {
  // A screenshot of the recipe app's MyRecipe page, made with made-up recipes (see src/data.js).
  "recipe/myrecipe.png": "808a8de7ae2b3dc35735d11a9398fd9dc2428a40c52bdc284eb82dd48f03d32c",
  "cs403/rank_disagreement_summary.webp": "2b215d8a06e9c1579707f17e7de5ee9d60447213934a47c5474b13f3c505040d",
  "cs403/sector_shap.webp": "503a30afb4b6f4ef2d944ecc809e18e94f037af1be2b34fc51ec4680aacd78dd",
  "cs403/final_summary.webp": "ce5bbc984ad03bc040fcf34f5138945b0d506689885bc179e6f2124846304340",
  "og-image.png": "36a9427873355fbfd3775dbf94d022f06e231b5338c7887948f6ad14d2ffb257"
};

// og/og-image.html, the scanned source the share image is captured from, with LF line endings.
export const shareSourceHash = '2135da5a82ed67b733c8e1078bb800c72365cec67ea454fe72532415af500664';
