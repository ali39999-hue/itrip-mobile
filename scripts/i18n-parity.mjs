// i18n Parity Gate — verifies all locale files share the exact same key structure.
// Usage: node scripts/i18n-parity.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const localesDir = new URL('../src/i18n/locales/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

function flatten(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') keys.push(...flatten(v, path));
    else keys.push(path);
  }
  return keys.sort();
}

const files = readdirSync(localesDir).filter((f) => f.endsWith('.json'));
const structures = new Map();

for (const file of files) {
  const data = JSON.parse(readFileSync(join(localesDir, file), 'utf-8'));
  structures.set(file, flatten(data));
}

const [baseFile] = files;
const baseKeys = structures.get(baseFile);
let failed = false;

for (const [file, keys] of structures) {
  const missing = baseKeys.filter((k) => !keys.includes(k));
  const extra = keys.filter((k) => !baseKeys.includes(k));
  if (missing.length || extra.length) {
    failed = true;
    console.error(`✗ ${file}: missing=${JSON.stringify(missing)} extra=${JSON.stringify(extra)}`);
  } else {
    console.log(`✓ ${file}: ${keys.length} keys, parity OK`);
  }
}

process.exit(failed ? 1 : 0);
