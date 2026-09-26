// Builds and verifies the position grids for M1, M2H, M2L; prints markdown tables.
const SK = {
  WIC: ['CAS.WIC', 'Words in Context', 'Craft and Structure'],
  TSP: ['CAS.TSP', 'Text Structure and Purpose', 'Craft and Structure'],
  CTC: ['CAS.CTC', 'Cross-Text Connections', 'Craft and Structure'],
  CID: ['INI.CID', 'Central Ideas and Details', 'Information and Ideas'],
  COET: ['INI.COET', 'Command of Evidence: Textual', 'Information and Ideas'],
  COEQ: ['INI.COEQ', 'Command of Evidence: Quantitative', 'Information and Ideas'],
  INF: ['INI.INF', 'Inferences', 'Information and Ideas'],
  BND: ['SEC.BND', 'Boundaries', 'Standard English Conventions'],
  FSS: ['SEC.FSS', 'Form, Structure, and Sense', 'Standard English Conventions'],
  TRN: ['EOI.TRN', 'Transitions', 'Expression of Ideas'],
  RS: ['EOI.RS', 'Rhetorical Synthesis', 'Expression of Ideas'],
};
const SEC_T = { 1: 35, 2: 45, 3: 60, 4: 75, 5: 90 };
const ADJ = { CTC: 10, COEQ: 10 };
const band = r => (r <= 2 ? 'Easy' : r === 3 ? 'Medium' : 'Hard');

const specs = {
  M1: {
    blocks: [
      [['WIC', 4], ['TSP', 2], ['CTC', 2], [1, 2, 3, 4, 3, 4, 3, 5]],
      [['CID', 2], ['COET', 2], ['COEQ', 2], ['INF', 2], [2, 3, 4, 3, 3, 4, 3, 5]],
      [['BND', 4], ['FSS', 3], [1, 2, 3, 4, 3, 3, 5]],
      [['TRN', 3], ['RS', 4], [2, 3, 3, 4, 3, 3, 5]],
    ],
    target: [6, 14, 10], keys: { A: 8, B: 8, C: 7, D: 7 },
  },
  M2H: {
    blocks: [
      [['WIC', 3], ['TSP', 2], ['CTC', 2], [2, 3, 4, 3, 4, 3, 5]],
      [['CID', 2], ['COET', 2], ['COEQ', 1], ['INF', 2], [3, 3, 4, 3, 4, 3, 5]],
      [['BND', 4], ['FSS', 4], [2, 4, 3, 4, 3, 4, 3, 5]],
      [['TRN', 4], ['RS', 4], [2, 4, 3, 4, 3, 5, 3, 5]],
    ],
    target: [3, 13, 14], keys: { A: 7, B: 7, C: 8, D: 8 },
  },
  M2L: {
    blocks: [
      [['WIC', 3], ['TSP', 2], ['CTC', 2], [1, 2, 3, 4, 3, 3, 4]],
      [['CID', 2], ['COET', 2], ['COEQ', 1], ['INF', 2], [1, 2, 3, 4, 3, 3, 4]],
      [['BND', 4], ['FSS', 4], [1, 1, 2, 3, 4, 3, 3, 4]],
      [['TRN', 4], ['RS', 4], [1, 2, 3, 3, 3, 3, 3, 4]],
    ],
    target: [9, 14, 7], keys: { A: 8, B: 7, C: 8, D: 7 },
  },
};

function rng(seed) { let s = seed; return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648); }

function assignKeys(n, quota, seed) {
  const r = rng(seed);
  for (let attempt = 0; attempt < 100000; attempt++) {
    const bag = Object.entries(quota).flatMap(([k, c]) => Array(c).fill(k));
    for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
    let ok = true;
    for (let i = 2; i < n; i++) if (bag[i] === bag[i - 1] && bag[i] === bag[i - 2]) ok = false;
    if (ok) return bag;
  }
  throw new Error('no key arrangement');
}

const errors = [];
const out = {};
let seed = 7;
for (const [mod, spec] of Object.entries(specs)) {
  const rows = [];
  for (const blk of spec.blocks) {
    const ratings = blk[blk.length - 1];
    const skills = blk.slice(0, -1).flatMap(([s, c]) => Array(c).fill(s));
    if (skills.length !== ratings.length) errors.push(`${mod} block length mismatch`);
    const n = ratings.length, h = Math.floor(n / 2);
    const first = ratings.slice(0, h), second = ratings.slice(n - h);
    const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
    if (ratings[0] !== Math.min(...ratings)) errors.push(`${mod} block first not min`);
    if (ratings[n - 1] !== Math.max(...ratings)) errors.push(`${mod} block last not max`);
    if (!(mean(second) > mean(first))) errors.push(`${mod} block halves not rising`);
    skills.forEach((s, i) => rows.push({ skill: s, rating: ratings[i] }));
  }
  const keys = assignKeys(rows.length, spec.keys, seed++);
  rows.forEach((r, i) => {
    r.pos = i + 1; r.id = `${mod}-${String(i + 1).padStart(2, '0')}`; r.key = keys[i];
    r.band = band(r.rating); r.secs = SEC_T[r.rating] + (ADJ[r.skill] || 0);
  });
  const cnt = [0, 0, 0]; rows.forEach(r => cnt[r.band === 'Easy' ? 0 : r.band === 'Medium' ? 1 : 2]++);
  if (cnt.join() !== spec.target.join()) errors.push(`${mod} EMH ${cnt} != ${spec.target}`);
  for (let i = 1; i < rows.length; i++) if (rows[i].band === 'Hard' && rows[i - 1].band === 'Hard') errors.push(`${mod} adjacent hard at ${i + 1}`);
  const total = rows.reduce((a, r) => a + r.secs, 0);
  if (total > 2160) errors.push(`${mod} time ${total}`);
  if (rows.length !== 30) errors.push(`${mod} length ${rows.length}`);
  out[mod] = { rows, cnt, total };
}

for (const [mod, { rows, cnt, total }] of Object.entries(out)) {
  console.log(`\n### ${mod}  (E/M/H = ${cnt.join('/')}, target-time sum = ${total}s)\n`);
  console.log('| Pos | Item ID | Domain | Skill code | Skill | Band | Rating | Key | Target s |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) console.log(`| ${r.pos} | ${r.id} | ${SK[r.skill][2]} | ${SK[r.skill][0]} | ${SK[r.skill][1]} | ${r.band} | ${r.rating} | ${r.key} | ${r.secs} |`);
  const kc = {}; rows.forEach(r => (kc[r.key] = (kc[r.key] || 0) + 1));
  console.log(`\nKey tally: ${JSON.stringify(kc)} · key sequence: ${rows.map(r => r.key).join('')}`);
}
const bank = [0, 0, 0]; Object.values(out).forEach(o => o.cnt.forEach((c, i) => (bank[i] += c)));
console.log(`\nBank E/M/H = ${bank.join('/')} of 90`);
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : '\nALL GRID CHECKS PASS');
