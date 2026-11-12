// Tests for the phone-number guard. Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findPhones } from './checks/phone.mjs';

// Made-up numbers in every format a contact line might use.
const phones = [
  '0812345678',
  '081 234 5678',
  '081-234-5678',
  '08-1234-5678',
  '081.234.5678',
  '+66812345678',
  '+66 81 234 5678',
  '+66-81-234-5678',
  '+66 (0)81 234 5678',
  '(+66) 812345678',
  '02 123 4567',
  'Tel.081-234-5678',
  'โทร.081-234-5678',
  'Tel:081 234 5678',
  '081-234-\n      5678',
  '081\u2013234\u20135678',
  '081\u2011234\u20115678',
  '081&nbsp;234&nbsp;5678',
  '081&#8211;234&#8211;5678',
  '081/234/5678',
  'Tel081-234-5678',
  '\u0e50\u0e58\u0e51\u0e52\u0e53\u0e54\u0e55\u0e56\u0e57\u0e58',
  '\uff10\uff18\uff11-\uff12\uff13\uff14-\uff15\uff16\uff17\uff18',
];

test('finds a phone number in every common format', () => {
  for (const phone of phones) {
    assert.equal(findPhones(`Bangkok, Thailand · ${phone} · name@example.com`).length, 1, phone);
  }
});

// Other digits right before a number used to join it into one long run that was then skipped.
test('finds a number that follows other digits, a list marker or a web-address code', () => {
  const stuck = [
    'Bangkok 10200, 081-234-5678',
    'Bangkok 10200 081 234 5678',
    '1. 081-234-5678',
    '2) 081 234 5678',
    '25, 0812345678',
    'Updated 2026 081 234 5678',
    'Call%20081-234-5678',
    'tel:%2B66812345678',
    '081  234  5678',
  ];
  for (const text of stuck) assert.equal(findPhones(text).length, 1, text);
});

// Digits glued to letters are skipped as hashes and IDs, unless the letters are a label or a suffix.
// Test numbers are built here from made-up parts.
test('finds a number glued to a label or a suffix, but not to a hash', () => {
  const digits = ['089', '765', '4321'].join('');
  for (const label of ['Tel', 'tel', 'TEL', 'Phone', 'Mobile', 'Call', 'Fax', 'Tel:', 'โทร']) {
    assert.equal(findPhones(`contact ${label}${digits} here`).length, 1, label);
  }
  assert.equal(findPhones(`my ${digits}th line`).length, 1, 'th suffix');
  assert.equal(findPhones(`my ${digits}th`).length, 1, 'th suffix at the end');
  // Hex strings, IDs and unknown words next to the same digits stay skipped.
  const hash = 'a3f9c2d1e8b7064f5a3c9d2e1b8f7a06';
  for (const text of [`f${digits}`, `${hash}${digits}`, `ab12cd${digits}`, `id${digits}`, `x${digits}y`,
    `${digits}abc`, `Tel${digits}abc`, `Tel${digits}${'ab12cd'.repeat(3)}`]) {
    assert.deepEqual(findPhones(text), [], text);
  }
});

test('leaves the site\'s own numbers alone', () => {
  const ordinary = [
    '2022 – May 2026',
    'Jan 2020 – Apr 2025',
    'F1 0.707 and ROC-AUC 0.568',
    '1600x791',
    'Project-CS403 @ 0c4ef04',
    '0c34c8839b6f093b0550ec0f2bc8e2078b47fba96500a1fc6b0ab723ddf1cdb3',
    '"acc": 0.5469, "f1": 0.6942',
    '3 layers, hidden size 128, over a 60-day window',
    '0.6000       0.4327',
    '0.50    0.5469   0',
    'built 2025/11/09',
    'JPM 0.608 0.756 0.756 UNH 0.600 0.750 0.750 GS 0.567',
    'Bangkok 10200, Thailand',
    'sha f0812345678',
  ];
  for (const text of ordinary) assert.deepEqual(findPhones(text), [], text);
});

test('files it cannot read are reported as unreadable, by type or by content', async () => {
  const { unreadable } = await import('./checks/phone.mjs');
  assert.equal(unreadable(Buffer.from('plain text'), 'notes.txt'), false);
  assert.equal(unreadable(Buffer.from('x'), 'shot.jpg'), true);
  assert.equal(unreadable(Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2]), 'resume.docx'), true);
  assert.equal(unreadable(Buffer.from([0xc3, 0x28, 0xa0, 0xa1, 0xe2, 0x28, 0xa1, 0x80, 0xf0, 0x28]), 'blob.bin'), true);
});

test('a number split by tags or spaced out in markup is found as the browser shows it', async () => {
  const { phonesIn } = await import('./checks/phone.mjs');
  const parts = ['089', '765', '4321'];
  const cases = [
    `<span>${parts.join('</span>-<span>')}</span>`,
    `<p>${parts.join('  ')}</p>`,
    `<p>${parts.join(',')}</p>`,
    `<p>tel_${parts.join('')}_home</p>`,
  ];
  for (const html of cases) assert.equal(phonesIn(Buffer.from(html), 'resume.html').length, 1, html);
  // Plain text keeps its table-column rule: a run of spaces there is columns, not one number.
  assert.equal(phonesIn(Buffer.from('0.6000       0.4327'), 'notes.txt').length, 0);
});

test('a path with a space keeps its file type, with or without a commit suffix', async () => {
  const { withPhones } = await import('./phone-sources.mjs');
  const split = Buffer.from(`<b>${['089', '765', '4321'].join('</b>-<b>')}</b>`);
  assert.deepEqual(withPhones([['my cv.html', split], ['my cv.html in abc1234', split]]), ['my cv.html', 'my cv.html in abc1234']);
});
