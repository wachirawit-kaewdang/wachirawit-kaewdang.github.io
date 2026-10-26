// Plain helpers for the preprint look, kept apart from the components in paper.jsx.

// Vite serves files from /public at the site root; BASE_URL keeps links correct
// whether the site is deployed at "/" or under a sub-path.
export const asset = (path) => `${import.meta.env.BASE_URL}${path}`;

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Move to an element on the current page without changing the hash route: scroll, hand focus
// to it for keyboard and screen reader users, and briefly tint it so the eye lands there.
export function jumpTo(id, { tint = true } = {}) {
  const target = document.getElementById(id);
  if (!target) return false;
  target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  target.focus({ preventScroll: true });
  if (tint) {
    target.classList.remove('flash');
    void target.offsetWidth; // restart the tint when the same reference is followed twice
    target.classList.add('flash');
  }
  return true;
}

// The CS403 write-up is Appendix A, shown at this hash route. Anchors inside it extend the route
// ("#/cs403/figure-a1") so they still open the appendix when loaded directly.
export const APPENDIX = '#/cs403';

// "1" -> "table-1", "A.1" -> "table-a1".
export const tableId = (number) => `table-${String(number).toLowerCase().replace('.', '')}`;
