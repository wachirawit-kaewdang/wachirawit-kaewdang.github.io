// What the check modules share: paths into the repo and the hash they all compare with.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const root = resolve(import.meta.dirname, '..', '..');
export const pub = (path) => resolve(root, 'public', path);
export const read = (path) => readFileSync(resolve(root, path), 'utf8');
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
