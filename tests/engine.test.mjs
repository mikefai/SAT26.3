import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { makeAll } from './fixtures/make-fixture.mjs';

const require = createRequire(import.meta.url);
const E = require('../js/engine.js');
const form = JSON.parse(readFileSync(new URL('../data/form.json', import.meta.url), 'utf8'));
const modules = makeAll();

/** Answers with exactly `n` correct in the given module (the rest wrong). */
function answersWithCorrect(mod, n) {
  const out = {};
  mod.items.forEach((it, i) => {
    out[it.id] = i < n ? it.key : E.LETTERS.find(l => l !== it.key);
  });
  return out;
}

test('scoreModule counts correct answers and ignores invalid letters', () => {
  const m1 = modules.m1;
  const a = answersWithCorrect(m1, 10);
  a[m1.items[29].id] = 'Z';
  const s = E.scoreModule(m1, a);
  assert.equal(s.raw, 10);
  assert.equal(s.total, 30);
  assert.equal(s.results[29].chosen, null);
});

test('routing threshold: 17 correct → lower, 18 correct → higher', () => {
  assert.equal(E.routeFor(modules.m1, answersWithCorrect(modules.m1, 17), form.routing).route, 'm2-lower');
  assert.equal(E.routeFor(modules.m1, answersWithCorrect(modules.m1, 18), form.routing).route, 'm2-higher');
  assert.equal(E.routeFor(modules.m1, {}, form.routing).route, 'm2-lower');
  assert.equal(E.routeFor(modules.m1, answersWithCorrect(modules.m1, 30), form.routing).route, 'm2-higher');
});

test('scoreForm totals, per-domain counts, and route consistency', () => {
  const m1Answers = answersWithCorrect(modules.m1, 20);
  const m2Answers = answersWithCorrect(modules['m2-higher'], 12);
  const r = E.scoreForm(modules, { m1Answers, route: 'm2-higher', m2Answers }, form.routing);
  assert.equal(r.raw, 32);
  assert.equal(r.total, 60);
  assert.equal(r.routeConsistent, true);
  for (const d of Object.values(r.byDomain)) assert.equal(d.total, 15);
  assert.equal(Object.values(r.bySkill).reduce((a, s) => a + s.total, 0), 60);
  const wrong = E.scoreForm(modules, { m1Answers: {}, route: 'm2-higher', m2Answers: {} }, form.routing);
  assert.equal(wrong.routeConsistent, false);
});

test('studentView strips every answer-revealing field', () => {
  const v = E.studentView(modules.m1);
  for (const it of v.items) {
    for (const f of E.ANNOTATION_FIELDS) assert.equal(f in it, false, `${it.id} still has ${f}`);
    assert.ok(it.options && it.stem && it.stimulus);
  }
  assert.ok(!JSON.stringify(v).includes('"rationale"'));
});

test('encodeResult / decodeResult round-trip and reject malformed input', () => {
  const result = { m1Answers: answersWithCorrect(modules.m1, 5), route: 'm2-lower', m2Answers: { [modules['m2-lower'].items[3].id]: 'C' } };
  const enc = E.encodeResult(modules, result);
  assert.match(enc, /^[ABCD-]{30}\.l\.[ABCD-]{30}$/);
  const dec = E.decodeResult(modules, enc);
  assert.deepEqual(dec.m1Answers, result.m1Answers);
  assert.deepEqual(dec.m2Answers, result.m2Answers);
  assert.equal(dec.route, 'm2-lower');
  assert.equal(E.decodeResult(modules, 'garbage'), null);
  assert.equal(E.decodeResult(modules, 'AB.h.CD'), null);
});

test('formatTime', () => {
  assert.equal(E.formatTime(2160), '36:00');
  assert.equal(E.formatTime(61.9), '1:01');
  assert.equal(E.formatTime(-5), '0:00');
});
