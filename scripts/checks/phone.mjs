// Finds Thai phone numbers in text, in any common format: 0812345678, 081-234-5678, 081.234.5678,
// +66 81 234 5678, +66 (0)81 234 5678, Tel.081-234-5678. Formats differ, so it compares digits
// only. A phone number must never reach the public repo, site or résumé; the private résumé is
// kept outside this repo. Use only the made-up numbers in `madeUp` as examples, here or anywhere.
// A number may follow a label and a dot (Tel.081…, โทร.081…); only a decimal like 0.5469 may not.
const candidate = /(?<!\w|\d\.)\+?\(?\d[\d\s().-]{7,18}\d(?!\w)/g;

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

export function findPhones(text) {
  // A number wrapped across indented lines (081-234- then 5678 on the next line) reads as one.
  const joined = text.replace(/[ \t]*\r?\n[ \t]*/g, ' ');
  return [...joined.matchAll(candidate)].map(([run]) => run).filter((run) => {
    // A run of spaces is a table's columns (0.6000     0.4327), never one number.
    if (/\s{2,}/.test(run)) return false;
    const digits = phoneDigits(run);
    // Mobile numbers are 10 digits from 06, 08 or 09; landlines 9 digits from 02 to 07.
    return /^0[689]\d{8}$/.test(digits) || /^0[2-7]\d{7}$/.test(digits);
  });
}

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

// The phone numbers in a file, apart from the made-up ones. Only the binary types above are skipped.
export function phonesIn(bytes, name = '') {
  if (binaryFile.test(name)) return [];
  return findPhones(decodeText(bytes)).filter((run) => !madeUp.has(phoneDigits(run)));
}
