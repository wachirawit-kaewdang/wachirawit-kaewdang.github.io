import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { profile } from './src/data.js'

// index.html's share tags need the site's absolute URL. It comes from src/data.js, so the
// domain is written in one place: %SITE_URL% in index.html is replaced at build time.
const siteUrl = {
  name: 'site-url',
  transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', profile.site),
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), siteUrl],
})
