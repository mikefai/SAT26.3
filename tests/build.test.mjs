import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { bundleJs, studentMd, keyMd, blueprintMd } from '../tools/build.mjs';
import { makeAll, loadContracts } from './fixtures/make-fixture.mjs';

const { blueprint, taxonomy } = loadContracts();
const form = JSON.parse(readFileSync(new URL('../data/form.json', import.meta.url), 'utf8'));
const modules = makeAll();

test('bundleJs defines window.SAT_DATA that browsers can load as a classic script', () => {
  const ctx = { window: {} };
  vm.runInNewContext(bundleJs({ form, taxonomy, blueprint, modules }), ctx);
  assert.equal(ctx.window.SAT_DATA.modules.m1.items.length, 30);
  assert.equal(ctx.window.SAT_DATA.form.routing.threshold, 18);
});

test('student edition is clean: every question, no keys or annotations', () => {
  const md = studentMd(form, modules.m1);
  assert.equal((md.match(/^### Question \d+$/gm) || []).length, 30);
  assert.ok(!/rationale|Key:|Trap|rating|Fixture topic/i.test(md), 'student edition leaks annotations');
  assert.ok(md.includes('\\_\\_\\_\\_\\_\\_'), 'blanks are escaped for Markdown');
  assert.ok(md.includes(form.disclaimer));
});

test('answer key contains key table, rationale, and a named trap for each distractor', () => {
  const md = keyMd(form, taxonomy, modules['m2-higher']);
  assert.equal((md.match(/^\| \d+ \| \*\*[ABCD]\*\* \|/gm) || []).length, 30);
  assert.equal((md.match(/^- \*\*[ABCD] — /gm) || []).length, 90);
  assert.equal((md.match(/\*\*Key: [ABCD]\.\*\*/g) || []).length, 30);
});

test('blueprint document lists all three grids', () => {
  const md = blueprintMd(form, blueprint, taxonomy);
  for (const h of ['Grid — Module 1', 'Grid — Module 2 — Higher route', 'Grid — Module 2 — Lower route']) assert.ok(md.includes(h));
  assert.ok(md.includes('Deviations from the real exam'));
});
