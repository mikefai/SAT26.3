#!/usr/bin/env node
// Validates module item files against the binding grid (data/blueprint.json),
// the taxonomy (data/taxonomy.json), and the item-writing rules.
// Usage: node tools/validate.mjs            (all three modules, all must exist)
//        node tools/validate.mjs --module m1 (one module; used while authoring)
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const MODULE_IDS = ['m1', 'm2-higher', 'm2-lower'];
const LETTERS = ['A', 'B', 'C', 'D'];
const BLANK = '______';
const STIMULUS_TYPES = ['prose', 'poem', 'paired', 'notes', 'table', 'chart', 'sentence'];
const RS_INTRO = 'While researching a topic, a student has taken the following notes:';
const SEC_STEM = 'Which choice completes the text so that it conforms to the conventions of Standard English?';
// Skills whose stem is fixed on the real exam format.
export const STEMS = {
  'SEC.BND': SEC_STEM,
  'SEC.FSS': SEC_STEM,
  'EOI.TRN': 'Which choice completes the text with the most logical transition?',
  'INI.INF': 'Which choice most logically completes the text?',
};

const BANNED_PHRASES = [
  /all of the above/i, /none of the above/i, /college board/i, /bluebook/i, /official (sat|test|question)/i, /\bSAT\b/,
];
// Culture-bound knowledge an international test taker may lack.
const BANNED_TERMS = [
  /thanksgiving/i, /halloween/i, /christmas/i, /\beaster\b/i, /diwali/i, /ramadan/i, /hanukkah/i, /independence day/i,
  /super bowl/i, /baseball/i, /home run/i, /quarterback/i, /\bcricket match\b/i,
  /\bcongress(ional)?\b/i, /\bsenat(e|or)\b/i, /supreme court/i, /electoral/i, /\bprom\b/i, /\bhomecoming (dance|game|week)\b/i,
  /\bdollars?\b/i, /\beuros?\b/i, /\byen\b/i, /\brupees?\b/i, /\bcents?\b/i, /[$€£¥]/,
];

const words = s => (s || '').replace(/\{\/?u\}/g, '').split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length;

export function stimulusText(st) {
  if (!st) return '';
  const parts = [st.title, st.text, st.text1, st.text2, st.intro, ...(st.notes || []), st.attribution];
  if (st.table) parts.push(st.table.caption, ...(st.table.columns || []), ...(st.table.rows || []).flat().map(String));
  if (st.chart) parts.push(st.chart.caption, st.chart.xLabel, st.chart.yLabel, ...(st.chart.categories || []),
    ...(st.chart.series || []).map(s => s.label));
  return parts.filter(Boolean).join(' ');
}

function passageWords(st) {
  switch (st.type) {
    case 'paired': return words(st.text1) + words(st.text2);
    case 'notes': return (st.notes || []).reduce((a, n) => a + words(n), 0);
    case 'table': return words(st.text) + words(st.table?.caption);
    case 'chart': return words(st.text) + words(st.chart?.caption);
    default: return words(st.text);
  }
}

const countBlanks = s => (s.match(/_{6,}/g) || []).length;

export function loadJSON(rel) { return JSON.parse(readFileSync(join(ROOT, rel), 'utf8')); }

/** Validate one module object. Returns array of error strings. */
export function validateModule(mod, moduleId, blueprint, taxonomy) {
  const errs = [];
  const E = (id, msg) => errs.push(`[${moduleId}${id ? ' ' + id : ''}] ${msg}`);
  const grid = blueprint.modules[moduleId];
  if (!grid) return [`[${moduleId}] no grid in blueprint`];
  const traps = new Map(taxonomy.trapClasses.map(t => [t.id, t]));
  const bandOf = r => taxonomy.bands.find(b => b.ratings.includes(r))?.name;

  if (!mod || typeof mod !== 'object') return [`[${moduleId}] module is not an object`];
  if (mod.moduleId !== moduleId) E('', `moduleId must be "${moduleId}"`);
  const expectedRoute = { m1: null, 'm2-higher': 'higher', 'm2-lower': 'lower' }[moduleId];
  if ((mod.route ?? null) !== expectedRoute) E('', `route must be ${JSON.stringify(expectedRoute)}`);
  if (mod.timeLimitSeconds !== 2160) E('', 'timeLimitSeconds must be 2160');
  const items = Array.isArray(mod.items) ? mod.items : [];
  if (items.length !== grid.length) E('', `expected ${grid.length} items, found ${items.length}`);

  items.forEach((it, i) => {
    const g = grid[i];
    const id = it?.id || `#${i + 1}`;
    if (!g) return;
    for (const f of ['id', 'position', 'domain', 'skillCode', 'skill', 'band', 'rating', 'key', 'targetSeconds']) {
      if (it[f] !== g[f]) E(id, `${f} is ${JSON.stringify(it[f])}, grid requires ${JSON.stringify(g[f])}`);
    }
    if (bandOf(it.rating) !== it.band) E(id, `band ${it.band} inconsistent with rating ${it.rating}`);
    if (!it.topic || typeof it.topic !== 'string') E(id, 'topic missing');
    if (!it.stem || it.stem.trim().length < 10) E(id, 'stem missing');
    if (!it.rationale || it.rationale.trim().length < 30) E(id, 'rationale missing or too short');

    // options
    const opts = it.options || {};
    const keys = Object.keys(opts).sort();
    if (keys.join('') !== 'ABCD') E(id, `options must be exactly A-D (found ${keys.join(',')})`);
    const norm = LETTERS.map(l => String(opts[l] ?? '').trim().toLowerCase());
    if (norm.some(o => !o)) E(id, 'empty option');
    if (new Set(norm).size !== 4) E(id, 'options are not distinct');
    if (!LETTERS.includes(it.key)) E(id, 'key must be A-D');

    // distractors
    const d = it.distractors || {};
    const dk = Object.keys(d).sort().join('');
    const expected = LETTERS.filter(l => l !== it.key).join('');
    if (dk !== expected) E(id, `distractors must be exactly ${expected} (found ${dk || 'none'})`);
    for (const [l, v] of Object.entries(d)) {
      const t = traps.get(v?.trap);
      if (!t) E(id, `distractor ${l}: unknown trap "${v?.trap}"`);
      else if (!t.appliesTo.includes(it.skillCode)) E(id, `distractor ${l}: trap "${t.id}" does not apply to ${it.skillCode}`);
      if (!v?.explanation || v.explanation.trim().length < 15) E(id, `distractor ${l}: explanation missing or too short`);
    }

    // stimulus
    const st = it.stimulus || {};
    if (!STIMULUS_TYPES.includes(st.type)) E(id, `stimulus.type "${st.type}" invalid`);
    const wc = passageWords(st);
    const min = st.type === 'table' || st.type === 'chart' ? 15 : 25;
    if (wc < min || wc > 150) E(id, `passage word count ${wc} outside ${min}-150`);
    const allText = stimulusText(st);
    const code = it.skillCode;
    if (code.startsWith('SEC.') || code === 'EOI.TRN') {
      if (countBlanks(st.text || '') !== 1) E(id, `stimulus.text must contain exactly one blank "${BLANK}"`);
    }
    if (countBlanks(allText) > 1) E(id, 'more than one blank in stimulus');
    if (code === 'CAS.CTC' && (st.type !== 'paired' || !st.text1 || !st.text2)) E(id, 'CTC requires paired text1 and text2');
    if (st.type === 'paired' && code !== 'CAS.CTC') E(id, 'paired stimulus only allowed for CTC');
    if (st.type === 'paired' && (/^\s*Text [12]\b/.test(st.text1 || '') || /^\s*Text [12]\b/.test(st.text2 || ''))) E(id, 'paired texts must not start with a Text 1/Text 2 label');
    if (code === 'INI.COEQ') {
      if (st.type === 'table') {
        const cols = st.table?.columns || [];
        const rows = st.table?.rows || [];
        if (!st.table?.caption || cols.length < 2 || rows.length < 2) E(id, 'table needs caption, >=2 columns, >=2 rows');
        if (rows.some(r => r.length !== cols.length)) E(id, 'table row length mismatch');
      } else if (st.type === 'chart') {
        const c = st.chart || {};
        const cats = c.categories || [];
        if (!c.caption || !c.xLabel || !c.yLabel || cats.length < 2 || !(c.series || []).length) E(id, 'chart needs caption, xLabel, yLabel, >=2 categories, >=1 series');
        for (const s of c.series || []) {
          if (!s.label || (s.values || []).length !== cats.length || s.values.some(v => typeof v !== 'number')) E(id, `chart series "${s.label}" invalid`);
        }
      } else E(id, 'COEQ requires table or chart stimulus');
    }
    if (STEMS[code] && it.stem !== STEMS[code]) E(id, `non-standard stem for ${code}`);
    if (code === 'INI.INF' && !/_{6,}[.?!"”]?\s*$/.test(st.text || '')) E(id, 'INF passage must end with the blank');
    if (st.type === 'poem' && (!st.title || !st.attribution)) E(id, 'poem requires title and fictional attribution');
    if (code === 'EOI.RS') {
      const nn = (st.notes || []).length;
      if (st.type !== 'notes' || nn < 4 || nn > 6) E(id, 'RS requires notes stimulus with 4-6 notes');
      if (st.intro !== RS_INTRO) E(id, 'RS intro must be the standard sentence');
      if (!/The student wants to /.test(it.stem || '')) E(id, 'RS stem must state the goal ("The student wants to ...")');
    }
    if (st.type === 'notes' && code !== 'EOI.RS') E(id, 'notes stimulus only allowed for RS');
    const uOpen = (allText.match(/\{u\}/g) || []).length, uClose = (allText.match(/\{\/u\}/g) || []).length;
    if (uOpen !== uClose) E(id, 'unbalanced {u}{/u} underline markup');
    if (/underlined/i.test(it.stem || '') && uOpen === 0) E(id, 'stem mentions underlined text but none is marked');
    if (st.attribution && !/fictional/i.test(st.attribution)) E(id, 'attribution must mark the source as fictional');

    // content screens
    const everything = [allText, it.stem, ...LETTERS.map(l => opts[l])].join(' ');
    for (const re of BANNED_PHRASES) if (re.test(everything)) E(id, `banned phrase ${re}`);
    for (const re of BANNED_TERMS) if (re.test(everything)) E(id, `culture-bound term ${re}`);
  });

  // form-level checks (recomputed from items, not trusted from grid)
  if (items.length === grid.length) {
    const hard = items.map(it => it.rating >= 4);
    for (let i = 1; i < hard.length; i++) if (hard[i] && hard[i - 1]) E('', `hard items adjacent at positions ${i} and ${i + 1}`);
    const ks = items.map(it => it.key);
    for (let i = 2; i < ks.length; i++) if (ks[i] === ks[i - 1] && ks[i] === ks[i - 2]) E('', `key ${ks[i]} repeats 3 times ending at position ${i + 1}`);
    const tally = Object.fromEntries(LETTERS.map(l => [l, ks.filter(k => k === l).length]));
    const vals = Object.values(tally);
    if (Math.max(...vals) - Math.min(...vals) > 1) E('', `key letters unbalanced ${JSON.stringify(tally)}`);
    const secs = items.reduce((a, it) => a + (it.targetSeconds || 0), 0);
    if (secs > mod.timeLimitSeconds) E('', `target time sum ${secs}s exceeds limit`);
    // domain blocks in fixed order, rising rule within each block
    const order = taxonomy.domainOrder;
    let last = -1;
    const blocks = [];
    for (const it of items) {
      const di = order.indexOf(it.domain);
      if (di < last) E(it.id, 'domain order violated');
      if (di !== last) blocks.push([]);
      last = di;
      blocks[blocks.length - 1].push(it.rating);
    }
    blocks.forEach((r, bi) => {
      const n = r.length, h = Math.floor(n / 2);
      const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
      if (r[0] !== Math.min(...r)) E('', `block ${bi + 1}: first item is not the easiest`);
      if (r[n - 1] !== Math.max(...r)) E('', `block ${bi + 1}: last item is not the hardest`);
      if (!(mean(r.slice(n - h)) > mean(r.slice(0, h)))) E('', `block ${bi + 1}: difficulty does not rise`);
    });
  }
  return errs;
}

/** Cross-module checks over whatever modules are supplied. */
export function validateForm(modules, blueprint, taxonomy) {
  const errs = [];
  for (const [id, mod] of Object.entries(modules)) errs.push(...validateModule(mod, id, blueprint, taxonomy));
  const seenId = new Map(), seenTopic = new Map(), seenPassage = new Map();
  for (const [mid, mod] of Object.entries(modules)) {
    for (const it of mod?.items || []) {
      if (seenId.has(it.id)) errs.push(`[${mid} ${it.id}] duplicate id (also in ${seenId.get(it.id)})`);
      seenId.set(it.id, mid);
      const t = (it.topic || '').trim().toLowerCase();
      if (t && seenTopic.has(t)) errs.push(`[${mid} ${it.id}] duplicate topic (also ${seenTopic.get(t)})`);
      seenTopic.set(t, it.id);
      // Compare passage bodies only; RS intros and standard captions are shared by design.
      const st = it.stimulus || {};
      const p = [st.text, st.text1, st.text2, ...(st.notes || [])].filter(Boolean).join(' ').slice(0, 120).toLowerCase();
      if (p && seenPassage.has(p)) errs.push(`[${mid} ${it.id}] passage reused (also ${seenPassage.get(p)})`);
      seenPassage.set(p, it.id);
    }
  }
  // bank difficulty: only meaningful when all three modules are present
  if (MODULE_IDS.every(m => modules[m])) {
    const all = MODULE_IDS.flatMap(m => modules[m].items || []);
    const c = { Easy: 0, Medium: 0, Hard: 0 };
    all.forEach(it => { c[it.band] = (c[it.band] || 0) + 1; });
    const pct = k => (100 * c[k]) / all.length;
    if (Math.abs(pct('Easy') - 20) > 2.5 || Math.abs(pct('Medium') - 45) > 2.5 || Math.abs(pct('Hard') - 35) > 2.5) {
      errs.push(`[bank] difficulty mix ${JSON.stringify(c)} deviates from 20/45/35 by more than 2.5 points`);
    }
    // each route (M1 + M2) must contain 15 items per domain
    for (const m2 of ['m2-higher', 'm2-lower']) {
      const route = [...modules.m1.items, ...modules[m2].items];
      for (const dname of taxonomy.domainOrder) {
        const n = route.filter(it => it.domain === dname).length;
        if (n !== 15) errs.push(`[route m1+${m2}] ${dname} has ${n} items, expected 15`);
      }
    }
  }
  return errs;
}

function main() {
  const args = process.argv.slice(2);
  const only = args.includes('--module') ? args[args.indexOf('--module') + 1] : null;
  const blueprint = loadJSON('data/blueprint.json');
  const taxonomy = loadJSON('data/taxonomy.json');
  const ids = only ? [only] : MODULE_IDS;
  const modules = {};
  const errs = [];
  for (const id of ids) {
    const rel = `data/modules/${id}.json`;
    if (!existsSync(join(ROOT, rel))) { errs.push(`[${id}] missing file ${rel}`); continue; }
    try { modules[id] = loadJSON(rel); } catch (e) { errs.push(`[${id}] invalid JSON: ${e.message}`); }
  }
  errs.push(...validateForm(modules, blueprint, taxonomy));
  if (errs.length) {
    console.error(`VALIDATION FAILED — ${errs.length} problem(s):`);
    for (const e of errs) console.error('  • ' + e);
    process.exit(1);
  }
  const n = Object.values(modules).reduce((a, m) => a + m.items.length, 0);
  console.log(`VALIDATION PASSED — ${Object.keys(modules).length} module(s), ${n} items.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
