import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const html = readFileSync('standalone.html', 'utf8');
const match = html.match(/<script type="module">([\s\S]*?)<\/script>/);
if (!match) {
  console.error('No <script type="module"> found');
  process.exit(1);
}
const tempFile = 'temp_check_script.mjs';
writeFileSync(tempFile, match[1], 'utf8');
try {
  execFileSync('node', ['--check', tempFile], { stdio: 'inherit' });
  console.log('standalone.html extracted module script syntax check PASSED!');
} finally {
  try { unlinkSync(tempFile); } catch (e) {}
}
