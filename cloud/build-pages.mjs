import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const workerBuild = path.join(root, 'cloud', 'build.mjs');
execFileSync(process.execPath, [workerBuild], { cwd: root, stdio: 'inherit' });

const source = path.join(root, 'dist', 'server', 'index.js');
const targetDir = path.join(root, 'dist', 'pages');
fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(source, path.join(targetDir, '_worker.js'));

// Cloudflare Pages advanced mode recognizes _worker.js, but the file is staged
// for review only. No deployment or account credentials are needed to build.
const generated = fs.readFileSync(path.join(targetDir, '_worker.js'), 'utf8');
if (!generated.includes('export default') || !generated.includes('async fetch(request)')) {
  throw new Error('Expected Pages Worker fetch entrypoint is missing');
}
console.log('Prepared Cloudflare Pages preview artifact: dist/pages/_worker.js');
