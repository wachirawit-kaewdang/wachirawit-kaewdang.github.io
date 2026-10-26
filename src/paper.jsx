// Pieces of the preprint look shared by the home page and the case study.

import { jumpTo, tableId } from './paper-utils.js';

// A hyperref-style cross-reference ("Table 1", "§1.1") to something on the same page. Inside a
// hash route (the appendix) the link keeps the route, as "#/cs403/table-a1", and the address bar
// is updated to it, so the reference can be copied and still opens the right page.
export function Ref({ to, route, children }) {
  const href = route ? `${route}/${to}` : `#${to}`;
  const follow = (e) => {
    if (!jumpTo(to)) return;
    e.preventDefault();
    if (route) history.replaceState(null, '', href);
  };
  return (
    <a className="ref" href={href} onClick={follow}>
      {children}
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
export function NumberedTable({ number, caption, note, columns, rows }) {
  return (
    <div className="results" id={tableId(number)} tabIndex={-1}>
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
          {rows.map(([label, ...values]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              {values.map((v, i) => (
                <td key={i}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {note && <p className="tablenote">{note}</p>}
    </div>
  );
}
