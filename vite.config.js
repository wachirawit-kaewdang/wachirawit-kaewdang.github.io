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

// The page may load only what the built site ships: its own script, stylesheet, fonts and images.
// Style attributes are allowed because the bars' widths are set that way (never a <style> element).
// A meta tag can't carry frame-ancestors, so that isn't set. The tag is added to the build only:
// the dev server injects inline scripts and a socket, which this policy would block.
const policy = [
  "default-src 'none'", "script-src 'self'", "style-src 'self'", "style-src-attr 'unsafe-inline'",
  "img-src 'self'", "font-src 'self'", "base-uri 'none'", "form-action 'none'",
].join('; ')
const contentPolicy = {
  name: 'content-policy',
  apply: 'build',
  transformIndexHtml: () => [
    { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' },
  ],
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), siteUrl, contentPolicy],
})
