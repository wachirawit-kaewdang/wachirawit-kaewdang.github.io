import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { profile } from './src/data.js'

// index.html's share tags need the site's absolute URL and the title line. Both come from
// src/data.js, so each is written in one place: %SITE_URL% and %ROLE% in index.html are
// replaced at build time.
// A placeholder left unreplaced would ship as a broken share URL, so it fails the build instead.
const siteUrl = {
  name: 'site-url',
  transformIndexHtml(html) {
    const out = html.replaceAll('%SITE_URL%', profile.site).replaceAll('%ROLE%', profile.role)
    const left = out.match(/%[A-Z_]+%/)
    if (left) throw new Error(`index.html: no value for ${left[0]}`)
    return out
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), siteUrl],
})
