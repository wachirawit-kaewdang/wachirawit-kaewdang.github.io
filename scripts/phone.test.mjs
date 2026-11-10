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
