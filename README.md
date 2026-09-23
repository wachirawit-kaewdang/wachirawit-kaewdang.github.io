# wachirawit-kaewdang.github.io

My portfolio site — live at **https://wachirawit-kaewdang.github.io**

Built with React + Vite and deployed to GitHub Pages by a GitHub Actions workflow
(`.github/workflows/deploy.yml`) on every push to `main`.

## Structure

- `src/data.js` — all site content (profile, projects, skills). Edit this to update the site.
- `src/App.jsx` — page layout, one small component per section.
- `src/index.css` — styles; light and dark mode follow the visitor's system setting.
- `public/` — static files served as-is (resume PDF, favicon).

## Run locally

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # production build into dist/
```
