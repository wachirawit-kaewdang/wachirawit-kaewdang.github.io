// Finds Thai phone numbers in text, in any common format: 0812345678, 081-234-5678, 081.234.5678,
// 081/234/5678, +66 81 234 5678, +66 (0)81 234 5678, Tel.081-234-5678, typeset with en dashes or
// &nbsp;, or in Thai digits. Formats differ, so it compares digits only. A phone number must never
// reach the public repo, site or résumé; the private résumé is kept outside this repo. Use only the
// made-up numbers in `madeUp` as examples, here or anywhere.
// A run is any stretch of digit groups and the separators between them. A number can sit inside
// a longer run (Bangkok 10200, 081-234-5678 or 1. 081-…), so every stretch of up to five
// neighbouring groups is tested on its own, not only the whole run.
// A number may follow a label and a dot (Tel.081…, โทร.081…); a decimal's fraction (0.0812…) may not.
const candidate = /\d[\d\s(),./+-]*\d|\d/g;

// Markup, where tags can split a number that the browser shows whole: <b>081</b>-234-5678.
const markup = /\.(html?|jsx|tsx|svg|xml|md)$/i;
// The text a browser would show: tags removed and runs of spaces collapsed, as HTML does.
export const shownText = (html) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ');

// The made-up numbers the tests use, as digits. They are the only numbers allowed in the repo.
export const madeUp = new Set(['0812345678', '021234567']);

// Images, PDFs and fonts hold no readable text to scan. Each one in this repo is tied by hash to a
// text source that is scanned (scripts/checks/pins.mjs, resume/resume.sha256).
export const binaryFile = /\.(pdf|png|webp|jpe?g|gif|ico|woff2?|ttf|otf)$/i;

// A number's digits in the local 0… form, so every way of writing it compares equal.
export function phoneDigits(run) {
  let digits = run.replace(/\D/g, '');
  if (digits.startsWith('660')) digits = `66${digits.slice(3)}`; // +66 (0)81 …
  if (digits.startsWith('66')) digits = `0${digits.slice(2)}`;
  return digits;
}

// Typeset text the way the matcher reads it: HTML entities decoded (&nbsp;, &#8211;), every dash
// and hyphen as "-", every kind of space as " ", invisible characters dropped, and Thai and
// full-width digits as 0-9.
const entities = { nbsp: ' ', ensp: ' ', emsp: ' ', thinsp: ' ', ndash: '-', mdash: '-', minus: '-', hyphen: '-', dash: '-' };
export function plainText(text) {
  return text
    // Web-address codes for a space, plus, minus, dot and brackets (Call%20081…, tel:%2B66…).
    .replace(/%(20|2B|2D|2E|28|29)/gi, (whole, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code) => {
      if (code[0] !== '#') return entities[code.toLowerCase()] ?? whole;
      const point = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return point <= 0x10ffff ? String.fromCodePoint(point) : whole;
    })
    .replace(/[\u0e50-\u0e59]/g, (d) => String(d.charCodeAt(0) - 0x0e50))
    .replace(/[\uff10-\uff19]/g, (d) => String(d.charCodeAt(0) - 0xff10))
    .replace(/[\u2010-\u2015\u2212\ufe58\ufe63\uff0d]/g, '-')
    .replace(/[\u00a0\u2000-\u200a\u202f\u205f\u3000]/g, ' ')
    .replace(/[\u00ad\u200b-\u200d\u2060\ufeff]/g, '');
}

export function findPhones(text) {
  // A number wrapped across indented lines (081-234- then 5678 on the next line) reads as one.
  const joined = plainText(text).replace(/[ \t]*\r?\n[ \t]*/g, ' ');
  const found = [];
  for (const { 0: run, index } of joined.matchAll(candidate)) {
    const before = joined[index - 1] ?? '';
    const after = joined[index + run.length] ?? '';
    // Odd places hold the digit groups, even places the separators around them.
    const parts = run.split(/(\d+)/);
    for (let i = 1; i < parts.length; i += 2) {
      // A group right after a digit and a dot is a decimal's fraction, not the start of a number.
      const lead = i === 1 ? before : parts[i - 1];
      if (lead === '.' && (i > 1 || /\d/.test(joined[index - 2] ?? ''))) continue;
      let digits = '';
      for (let j = i; j < parts.length && j <= i + 8; j += 2) {
        digits += parts[j];
        if (digits.length > 12) break;
        const stretch = parts.slice(i, j + 1).join('');
        // One unbroken string of digits against a letter is part of a hash or an ID.
        const touching = /[A-Za-z]/.test(i === 1 ? before : '') || /[A-Za-z]/.test(j === parts.length - 2 ? after : '');
        if (i === j && touching) continue;
        // A number written with dots uses only dots (081.234.5678). A dot beside other separators
        // is a decimal in a list or table (0.608 0.756 0.756, 0.6000     0.4327).
        if (stretch.includes('.') && /[^\d.]/.test(stretch)) continue;
        // A match is reported once; the search goes on after its last group.
        if (isPhone(phoneDigits(stretch))) { found.push(stretch); i = j; break; }
      }
    }
  }
  return found;
}

// Mobile numbers are 10 digits from 06, 08 or 09; landlines 9 digits from 02 to 07.
const isPhone = (digits) => /^0[689]\d{8}$/.test(digits) || /^0[2-7]\d{7}$/.test(digits);

// Text in any encoding a Windows tool might write. PowerShell 5.1's Out-File writes UTF-16, where
// every ASCII character carries a zero byte, so a zero byte alone never means "not text".
export function decodeText(bytes) {
  const utf16 = (le) => {
    const even = Buffer.from(bytes.subarray(0, bytes.length - (bytes.length % 2)));
    const text = (le ? even : even.swap16()).toString('utf16le');
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text; // drop the byte-order mark
  };
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return utf16(true);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return utf16(false);
  let oddZeros = 0;
  let evenZeros = 0;
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0 && i % 2) oddZeros++;
    else if (bytes[i] === 0) evenZeros++;
  }
  // Mostly-ASCII UTF-16 without a byte-order mark: zeros fill one half of the bytes.
  if (oddZeros > bytes.length / 4) return utf16(true);
  if (evenZeros > bytes.length / 4) return utf16(false);
  return bytes.toString('utf8').replaceAll('\0', '');
}

// Bytes the scan can't read as text: a listed binary type, a known binary header (zip, which also
// covers .docx and .xlsx; PDF, PNG, GIF, JPEG, WebP, gzip), or bytes that don't decode cleanly.
const binaryHeaders = [[0x50, 0x4b, 0x03, 0x04], [0x25, 0x50, 0x44, 0x46], [0x89, 0x50, 0x4e, 0x47],
  [0x47, 0x49, 0x46, 0x38], [0xff, 0xd8, 0xff], [0x52, 0x49, 0x46, 0x46], [0x1f, 0x8b]];
export function unreadable(bytes, name = '') {
  if (binaryFile.test(name)) return true;
  if (binaryHeaders.some((magic) => magic.every((byte, i) => bytes[i] === byte))) return true;
  const text = decodeText(bytes);
  // eslint-disable-next-line no-control-regex -- control characters are what marks bytes as not text
  const odd = text.match(/[\ufffd\x01-\x08\x0e-\x1f]/g)?.length ?? 0;
  return odd > Math.max(2, text.length / 100);
}

// The phone numbers in a file, apart from the made-up ones. A file it can't read returns none;
// scripts/phone-sources.mjs fails any such file that isn't tied by hash to a scanned source.
export function phonesIn(bytes, name = '') {
  if (unreadable(bytes, name)) return [];
  const text = decodeText(bytes);
  // Markup is read twice: as typed, and as a browser shows it.
  const runs = markup.test(name) ? [...findPhones(text), ...findPhones(shownText(text))] : findPhones(text);
  // The same number read both ways counts once.
  const numbers = new Map(runs.map((run) => [phoneDigits(run), run]));
  return [...numbers].filter(([digits]) => !madeUp.has(digits)).map(([, run]) => run);
}
