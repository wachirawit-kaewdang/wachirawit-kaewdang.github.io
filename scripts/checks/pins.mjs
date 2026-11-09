// Hashes of the files copied in or built by hand. They live here so both npm run check and the git
// hooks (scripts/check-phone.mjs) can compare against them. A binary file can't be scanned for a
// phone number, so each one is tied by hash to something that can.

// Charts and the share image, in public/. If a change was meant, update the hash here.
export const pinnedFiles = {
  "cs403/rank_disagreement_summary.webp": "2b215d8a06e9c1579707f17e7de5ee9d60447213934a47c5474b13f3c505040d",
  "cs403/sector_shap.webp": "503a30afb4b6f4ef2d944ecc809e18e94f037af1be2b34fc51ec4680aacd78dd",
  "cs403/final_summary.webp": "ce5bbc984ad03bc040fcf34f5138945b0d506689885bc179e6f2124846304340",
  "og-image.png": "9cbc7ef5942807498ca17fcadbe43848546052a3fbc08edda0005ac43483082f"
};

// og/og-image.html, the scanned source the share image is captured from, with LF line endings.
export const shareSourceHash = '60908746c14395ec8b67374c65c45f73e4253ce1579b1fda2a5db81260d4b5b9';
