// Finds Thai phone numbers in text, in any common format: 0812345678, 081-234-5678, 081.234.5678,
// +66 81 234 5678, +66 (0)81 234 5678, Tel.081-234-5678. Formats differ, so it compares digits
// only. A phone number must never reach the public repo, site or résumé; the private résumé is
// kept outside this repo. Use only the made-up numbers in `madeUp` as examples, here or anywhere.
// A number may follow a label and a dot (Tel.081…, โทร.081…); only a decimal like 0.5469 may not.
const candidate = /(?<!\w|\d\.)\+?\(?\d[\d\s().-]{7,18}\d(?!\w)/g;

// The made-up numbers the tests use, as digits. They are the only numbers allowed in the repo.
export const madeUp = new Set(['0812345678', '021234567']);

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

// The phone numbers in a file's bytes, apart from the made-up ones. A file with a NUL byte is
// binary (an image, a PDF) and is skipped.
export function phonesIn(bytes) {
  if (bytes.includes(0)) return [];
  return findPhones(bytes.toString('utf8')).filter((run) => !madeUp.has(phoneDigits(run)));
}
