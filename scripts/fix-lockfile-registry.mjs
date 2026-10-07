// Replit's npm goes through an internal package proxy, and `npm install` there can record that proxy's
// address in package-lock.json. Expo's build servers can't reach it, so `npm ci` fails on EAS.
// This rewrites those addresses to the public npm registry (the integrity hashes are unchanged, so every
// package is still verified byte for byte) and fails loudly if any other unexpected host shows up.
// Runs automatically on EAS before install ("eas-build-pre-install"); safe to run any time.
import fs from 'node:fs';

const LOCK = 'package-lock.json';
const PROXY = /^https?:\/\/package-firewall\.replit\.internal\/npm\//;
const REGISTRY = 'https://registry.npmjs.org/';

if (!fs.existsSync(LOCK)) { console.error(`fix-lockfile-registry: ${LOCK} not found`); process.exit(1); }
const lock = JSON.parse(fs.readFileSync(LOCK, 'utf8'));
let fixed = 0;
const unexpected = [];
for (const [name, entry] of Object.entries(lock.packages ?? {})) {
  if (typeof entry?.resolved !== 'string') continue;
  if (PROXY.test(entry.resolved)) { entry.resolved = entry.resolved.replace(PROXY, REGISTRY); fixed++; }
  else if (!entry.resolved.startsWith(REGISTRY)) unexpected.push(`${name} -> ${entry.resolved}`);
}
if (unexpected.length) {
  console.error('fix-lockfile-registry: FAIL, packages resolved from an unexpected host:\n  ' + unexpected.join('\n  '));
  process.exit(1);
}
if (fixed) fs.writeFileSync(LOCK, JSON.stringify(lock, null, 2) + '\n');
console.log(`fix-lockfile-registry: OK (${fixed} proxy address${fixed === 1 ? '' : 'es'} rewritten to the npm registry)`);
