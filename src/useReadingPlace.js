import { useEffect, useRef } from 'react';
import { profile } from './data.js';
import { APPENDIX, jumpTo, refTrail } from './paper-utils.js';

// The page's own title from index.html, restored when leaving the appendix.
const homeTitle = document.title;

// After Back or Forward the browser restores the position but not focus, which can be left far
// away, so the next Tab would jump there. This moves it to the jump target nearest the reading place.
function focusNearby() {
  const here = [...document.querySelectorAll('main [tabindex="-1"]')]
    .filter((element) => element.getBoundingClientRect().top < window.innerHeight)
    .at(-1);
  (here ?? document.getElementById('main'))?.focus({ preventScroll: true });
}

// The reading position per address, for a reload. Storage can be blocked, and that only costs the place.
const readingKey = () => `reading:${window.location.hash}`;
function saveReading() {
  try {
    sessionStorage.setItem(readingKey(), String(window.scrollY));
  } catch { /* the reader just keeps the browser's own behaviour */ }
}
function savedReading() {
  try {
    if (performance.getEntriesByType('navigation')[0]?.type !== 'reload') return null;
    const saved = sessionStorage.getItem(readingKey());
    return saved === null ? null : Number(saved);
  } catch {
    return null;
  }
}

// While Back or Forward swaps the page, the old page's scroll events would overwrite the new
// entry's saved place, so saving pauses until the swap has settled.
let settling = false;
let lastSaved = 0;
let saveLater;
function savePlace() {
  if (settling) return;
  history.replaceState({ ...history.state, seen: true, top: window.scrollY }, '');
}

// Keeps the reading place and the focus right across Back, Forward, reloads and page switches
// between the home page and the appendix. `home` is the id the home page lands on when the
// reader comes back from the appendix; `setMissing` shows or clears the "no such section" notice.
export function useReadingPlace({ hash, isCaseStudy, home, setMissing }) {
  // Remembers whether the last route was the appendix, so leaving it with browser Back (which
  // returns to an empty hash) lands the reader on the home page, where they came from.
  const wasCaseStudy = useRef(false);
  const mounted = useRef(false);

  // Back after a cross-reference: focus returns to the link that was followed.
  useEffect(() => {
    const onPop = () => {
      settling = true;
      setTimeout(() => { settling = false; }, 400);
      if (refTrail.at(-1)?.from !== window.location.href) return;
      const { link, top } = refTrail.pop();
      // After the browser's own handling: on the home page a hash names a real element, and the
      // browser would otherwise scroll to it and focus it.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        window.scrollTo({ top, behavior: 'instant' });
        if (link.isConnected) link.focus({ preventScroll: true });
      }));
    };
    const onClick = (e) => {
      const followed = e.target.closest?.('a[href^="#"]');
      if (!followed) return;
      // Where the reader left this page, and which link they followed, kept on its history entry
      // for Back from the other page. The entry survives a reload, which memory would not.
      const link = [...document.querySelectorAll('main a')].indexOf(followed);
      history.replaceState({ ...history.state, seen: true, top: window.scrollY, link }, '');
      setMissing(false);
    };
    // A reload rebuilds the page after the browser has tried to restore the position, so that
    // restore fails on a real connection. The place is saved as the reader scrolls instead.
    const onLeave = () => saveReading();
    // The place is also kept as the reader scrolls, so leaving with Back and returning with
    // Forward finds it too. History updates are rate-limited by browsers, hence the throttle.
    const onScroll = () => {
      saveReading();
      clearTimeout(saveLater);
      if (Date.now() - lastSaved > 250) {
        lastSaved = Date.now();
        savePlace();
      } else {
        saveLater = setTimeout(savePlace, 250);
      }
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', onLeave);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', onLeave);
      document.removeEventListener('click', onClick, true);
    };
  }, [setMissing]);

  // After switching pages, land in the right place and say where we are: the tab title names
  // the page, and focus moves to it so a screen reader announces the change. In the appendix
  // that is the anchor the link named, or else its title; at home, the section named.
  useEffect(() => {
    // An entry already marked is the reader returning with Back or Forward. On the same page the
    // browser restores the position itself, and jumping here would fight it.
    const firstLoad = !mounted.current;
    const returning = !firstLoad && history.state?.seen;
    const samePage = wasCaseStudy.current === isCaseStudy;
    mounted.current = true;
    if (!history.state?.seen) history.replaceState({ seen: true }, '');
    if (returning && samePage) {
      setMissing(false);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const { top, bottom } = document.activeElement.getBoundingClientRect();
        if (document.activeElement === document.body || bottom < 0 || top > window.innerHeight) focusNearby();
      }));
      return;
    }

    document.title = isCaseStudy ? `Appendix A: Stock Direction Prediction · ${profile.name}` : homeTitle;
    // Back or Forward between the two pages: the browser can't restore a page that wasn't there.
    const spot = returning ? history.state?.top : undefined;
    if (spot != null) {
      window.scrollTo({ top: spot, behavior: 'instant' });
      // Focus goes back to the link the reader followed, if it's in view; else to what is.
      const followed = document.querySelectorAll('main a')[history.state?.link ?? -1];
      const rect = followed?.getBoundingClientRect();
      if (rect && rect.bottom > 0 && rect.top < window.innerHeight) followed.focus({ preventScroll: true });
      else focusNearby();
      // The notice depends on whether the page has the target, which only an effect can see.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMissing(false);
      wasCaseStudy.current = isCaseStudy;
      return;
    }

    // Fonts arrive after the first paint and can change the page's height, so it's set again then.
    const reading = firstLoad ? savedReading() : null;
    if (reading !== null) {
      const restore = () => window.scrollTo({ top: reading, behavior: 'instant' });
      restore();
      document.fonts?.ready.then(restore);
      wasCaseStudy.current = isCaseStudy;
      return;
    }

    let found = true;
    if (isCaseStudy) {
      const anchor = hash.slice(APPENDIX.length + 1);
      if (!(anchor && jumpTo(anchor, { tint: false }))) {
        found = !anchor;
        // A reload of the plain page keeps the browser's restored position.
        if (anchor || !firstLoad) window.scrollTo({ top: 0, behavior: 'instant' });
        // On a fresh load the browser starts at the top, so Tab still meets the running head.
        if (!firstLoad) document.getElementById('appendix-title')?.focus({ preventScroll: true });
      }
    } else {
      const named = hash.length > 1 ? hash.slice(1) : wasCaseStudy.current ? home : null;
      const target = named && document.getElementById(named);
      // "top" always means the start of the page, which the running head's name links to.
      found = !named || named === 'top' || Boolean(target);
      if (!found) window.scrollTo({ top: 0, behavior: 'instant' });
      if (target) {
        target.scrollIntoView();
        target.focus({ preventScroll: true });
      }
    }
    setMissing(!found);
    wasCaseStudy.current = isCaseStudy;
  }, [hash, isCaseStudy, home, setMissing]);
}
