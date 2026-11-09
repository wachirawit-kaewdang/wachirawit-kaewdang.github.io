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
  ];
  for (const text of ordinary) assert.deepEqual(findPhones(text), [], text);
});
