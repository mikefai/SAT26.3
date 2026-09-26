import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../server.mjs';

let server, port;
before(async () => {
  server = createServer();
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  port = server.address().port;
});
after(() => new Promise(r => server.close(r)));

// Raw request so path traversal sequences are sent unnormalized.
const get = (path, method = 'GET') => new Promise((resolve, reject) => {
  const req = http.request({ host: '127.0.0.1', port, path, method }, res => {
    let body = '';
    res.on('data', c => { body += c; });
    res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'], body }));
  });
  req.on('error', reject);
  req.end();
});

test('serves the landing page and assets with correct types', async () => {
  const home = await get('/');
  assert.equal(home.status, 200);
  assert.match(home.type, /text\/html/);
  assert.match(home.body, /Reading and Writing Adaptive Practice Form/);
  const js = await get('/js/engine.js');
  assert.equal(js.status, 200);
  assert.match(js.type, /javascript/);
  const css = await get('/css/app.css');
  assert.match(css.type, /text\/css/);
});

test('blocks traversal, tooling, and dot-folders', async () => {
  for (const p of ['/../package.json', '/%2e%2e/package.json', '/js/../../server.mjs', '/tools/validate.mjs', '/tests/engine.test.mjs', '/.claude/plans', '/package.json']) {
    const r = await get(p);
    assert.equal(r.status, 404, p);
  }
});

test('JSON 404 for missing files and 405 for other methods', async () => {
  const r = await get('/nope.html');
  assert.equal(r.status, 404);
  assert.match(r.type, /application\/json/);
  const p = await get('/', 'POST');
  assert.equal(p.status, 405);
});
