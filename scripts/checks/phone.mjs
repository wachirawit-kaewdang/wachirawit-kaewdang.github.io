// Finds Thai phone numbers in text, in any common format: 0812345678, 081-234-5678, 081.234.5678,
// +66 81 234 5678, +66 (0)81 234 5678. Formats differ, so it compares digits only. A phone number
// must never reach the public site or résumé; the private résumé is kept outside this repo.
const candidate = /(?<![\w.])\+?\(?\d[\d\s().-]{7,18}\d(?!\w)/g;

export function findPhones(text) {
  return [...text.matchAll(candidate)].map(([run]) => run).filter((run) => {
    let digits = run.replace(/\D/g, '');
    if (digits.startsWith('660')) digits = `66${digits.slice(3)}`; // +66 (0)81 …
    if (digits.startsWith('66')) digits = `0${digits.slice(2)}`;
    // Mobile numbers are 10 digits from 06, 08 or 09; landlines 9 digits from 02 to 07.
    return /^0[689]\d{8}$/.test(digits) || /^0[2-7]\d{7}$/.test(digits);
  });
}
