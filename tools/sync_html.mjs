// Single source of truth: standalone.html (the only game file to edit).
// Generates public/standalone.html (identical) and index.html (same, minus the importmap block).
// Usage: node tools/sync_html.mjs          -> write copies
//        node tools/sync_html.mjs --check  -> exit 1 if copies are out of date
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'standalone.html'), 'utf8');

const importmap = /[ \t]*<script type="importmap">[\s\S]*?<\/script>[ \t]*\r?\n/;
if (!importmap.test(src)) throw new Error('standalone.html has no <script type="importmap"> block; refusing to sync');

const outputs = {
  'public/standalone.html': src,
  'index.html': src.replace(importmap, ''),
};

// Release version + code name (bump both together; list in docs/RELEASES.md) and the exact git build, shown on the main menu.
const RELEASE = { version: 'ALPHA 1.5', codename: 'MONGOOSE' };
let commit = 'local', date = new Date().toISOString().slice(0, 10);
try {
  const { execSync } = await import('node:child_process');
  commit = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
  date = execSync('git log -1 --format=%cs', { cwd: root }).toString().trim();
  if (execSync('git status --porcelain -- standalone.html modules', { cwd: root }).toString().trim()) commit += '+edits';
} catch (e) { }
if (!process.argv.includes('--check')) outputs['public/build.json'] = JSON.stringify({ ...RELEASE, commit, date }, null, 2) + '\n';
const check = process.argv.includes('--check');
let stale = 0;
for (const [rel, body] of Object.entries(outputs)) {
  const path = join(root, rel);
  const current = existsSync(path) ? readFileSync(path, 'utf8') : null;
  if (current === body) continue;
  if (check) { console.error(`out of date: ${rel}`); stale++; }
  else { writeFileSync(path, body); console.log(`synced ${rel}`); }
}
if (check && stale) { console.error('Run: node tools/sync_html.mjs'); process.exit(1); }
