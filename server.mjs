#!/usr/bin/env node
// Minimal zero-dependency static server. The site also works by opening index.html directly;
// this exists for `npm start` and for hosting on a machine or intranet.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, extname, normalize, resolve, sep } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};
// Only these top-level paths are public; tooling, tests, and dot-folders are never served.
const PUBLIC = new Set(['index.html', 'test.html', 'review.html', 'print.html', 'css', 'js', 'docs', 'data', 'README.md']);

export function createServer(root = ROOT) {
  const base = resolve(root);
  return http.createServer(async (req, res) => {
    const send = (code, body, type = 'application/json; charset=utf-8') => {
      res.writeHead(code, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : body);
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, JSON.stringify({ error: 'method not allowed' }));
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { return send(400, JSON.stringify({ error: 'bad request' })); }
    if (pathname.includes('\0')) return send(400, JSON.stringify({ error: 'bad request' }));
    if (pathname === '/') pathname = '/index.html';
    const rel = normalize(pathname).replace(/^[/\\]+/, '');
    const top = rel.split(/[/\\]/)[0];
    const file = resolve(base, rel);
    if (!PUBLIC.has(top) || (file !== base && !file.startsWith(base + sep))) return send(404, JSON.stringify({ error: 'not found' }));
    try {
      const s = await stat(file);
      if (!s.isFile()) return send(404, JSON.stringify({ error: 'not found' }));
      const body = await readFile(file);
      return send(200, body, MIME[extname(file).toLowerCase()] || 'application/octet-stream');
    } catch {
      return send(404, JSON.stringify({ error: 'not found' }));
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => console.log(`Practice form running at http://localhost:${port}/`));
}
