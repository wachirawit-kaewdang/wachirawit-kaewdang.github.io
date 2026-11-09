// Pieces of the preprint look shared by the home page and the case study.

import { Fragment, useEffect, useRef, useState } from 'react';
import { jumpTo, refTrail, tableId } from './paper-utils.js';

// A hyperref-style cross-reference ("Table 1", "§1.1") to something on the same page. Inside a
// hash route (the appendix) the link keeps the route, as "#/cs403/table-a1", and the address bar
// is kept up to date too, so the reference can be copied and still opens the right page.
export function Ref({ to, route, children }) {
  const href = route ? `${route}/${to}` : `#${to}`;
  const follow = (e) => {
    if (!document.getElementById(to)) return;
    e.preventDefault();
    // A history entry per jump, added before scrolling, so Back returns to the reading position.
    // Following the same reference twice adds nothing, or Back would seem to do nothing.
    if (window.location.hash !== href) {
      refTrail.push({ from: window.location.href, link: e.currentTarget, top: window.scrollY });
      history.pushState({ seen: true }, '', href);
    }
    jumpTo(to);
  };
  return (
    <a className="ref" href={href} onClick={follow}>
      {children}
    </a>
  );
}

// An outbound link that opens in a new tab and says so to screen readers, so a reader is never
// moved out of the page without warning. Sighted readers get the small arrow.
export function ExtLink({ children, ...props }) {
  return (
    <a {...props} target="_blank" rel="noreferrer">
      {children}
      <svg className="ext" viewBox="0 0 10 10" aria-hidden="true">
        <path d="M3 1.5h5.5V7M8.5 1.5l-7 7" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
      <span className="visually-hidden"> (opens in a new tab)</span>
    </a>
  );
}

// Links separated by middots. Each separator stays on the line of the link before it, so a
// wrapped line never opens with "·".
export function LinkLine({ className, children }) {
  const links = [children].flat().filter(Boolean);
  return (
    <p className={className}>
      {links.map((link, i) => (
        <span key={i} className="linkitem">
          {link}
          {i < links.length - 1 && <span className="sep" aria-hidden="true">·</span>}
        </span>
      ))}
    </p>
  );
}

// A booktabs table with its numbered caption above, as in a paper. The first column is the
// row label; the rest are figures, right-aligned in tabular numerals. An optional note sits
// under the bottom rule for sources and the test setup.
// `groups` labels runs of rows, as { at: first row's index, label }.
export function NumberedTable({ number, caption, note, columns, rows, emphasis = 0, groups = [] }) {
  const frame = useRef(null);
  const [scrolls, setScrolls] = useState(false);
  useEffect(() => {
    const element = frame.current;
    const measure = () => setScrolls(element.scrollWidth > element.clientWidth);
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    // A tab stop only when the table scrolls here, on a narrow phone; -1 keeps it a jump target.
    <div
      ref={frame}
      className="results"
      id={tableId(number)}
      tabIndex={scrolls ? 0 : -1}
      role="group"
      aria-label={`Table ${number}`}
    >
      <table>
        <caption>
          <span className="caplabel">Table {number}.</span> {caption}
        </caption>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col} scope="col">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, ...values], i) => {
            const group = groups.find(({ at }) => at === i);
            return (
              <Fragment key={i}>
                {group && (
                  <tr className="group">
                    <th scope="colgroup" colSpan={columns.length}>{group.label}</th>
                  </tr>
                )}
                <tr className={i < emphasis ? 'emphasis' : undefined}>
                  <th scope="row">{label}</th>
                  {values.map((v, j) => (
                    <td key={j}>{v}</td>
                  ))}
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {note && <p className="tablenote">{note}</p>}
    </div>
  );
}
