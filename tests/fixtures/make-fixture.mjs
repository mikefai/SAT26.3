// Generates synthetic modules that satisfy the binding grid and every validator rule.
// Used by tests and for smoke-testing the UI before real content exists:
//   node tests/fixtures/make-fixture.mjs <outDir>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { STEMS } from '../../tools/validate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LETTERS = ['A', 'B', 'C', 'D'];
const FILLER = 'The researchers recorded each observation carefully, compared the results with earlier measurements, and discussed what the pattern might mean for future work in the field.';

export function loadContracts() {
  return {
    blueprint: JSON.parse(readFileSync(join(ROOT, 'data/blueprint.json'), 'utf8')),
    taxonomy: JSON.parse(readFileSync(join(ROOT, 'data/taxonomy.json'), 'utf8')),
  };
}

function stimulusFor(row) {
  const lead = `Fixture passage ${row.id}.`;
  switch (row.skillCode) {
    case 'CAS.CTC':
      return { type: 'paired', text1: `${lead} Text one argues that the pattern is caused by temperature.`, text2: 'Text two argues that the pattern is caused by the length of daylight instead.' };
    case 'INI.COEQ':
      return {
        type: 'table',
        text: `${lead} The table reports measurements from two sites used to complete the ______.`,
        table: { caption: `Fixture measurements ${row.id}`, columns: ['Site', 'Value'], rows: [['North', '12'], ['South', '18']] },
      };
    case 'EOI.RS':
      return {
        type: 'notes',
        intro: 'While researching a topic, a student has taken the following notes:',
        notes: [`${lead} A fictional survey studied river birds.`, 'The survey covered four valleys over two years.', 'Birds nested earlier in warmer valleys.', 'The team plans a third year of observation.'],
      };
    case 'INI.INF':
      return { type: 'prose', text: `${lead} ${FILLER} Taken together, the observations suggest that the pattern ______.` };
    default: {
      const blank = row.skillCode.startsWith('SEC.') || row.skillCode === 'EOI.TRN' ? ' The final result was ______ clear to everyone involved.' : '';
      return { type: 'prose', text: `${lead} ${FILLER}${blank}` };
    }
  }
}

export function makeModule(moduleId, blueprint, taxonomy) {
  const route = { m1: null, 'm2-higher': 'higher', 'm2-lower': 'lower' }[moduleId];
  const items = blueprint.modules[moduleId].map(row => {
    const traps = taxonomy.trapClasses.filter(t => t.appliesTo.includes(row.skillCode));
    const distractors = {};
    LETTERS.filter(l => l !== row.key).forEach((l, i) => {
      distractors[l] = { trap: traps[i % traps.length].id, explanation: `Choice ${l} is wrong for fixture item ${row.id}.` };
    });
    return {
      ...row,
      topic: `Fixture topic ${row.id}`,
      stimulus: stimulusFor(row),
      stem: row.skillCode === 'EOI.RS'
        ? 'The student wants to summarize the survey. Which choice most effectively uses relevant information from the notes to accomplish this goal?'
        : STEMS[row.skillCode] || 'Which choice completes the text with the most logical and precise word or phrase?',
      options: Object.fromEntries(LETTERS.map(l => [l, `Option ${l} for ${row.id}`])),
      rationale: `Choice ${row.key} is correct for fixture item ${row.id} because the passage says so.`,
      distractors,
    };
  });
  return { moduleId, title: `Fixture ${moduleId}`, route, timeLimitSeconds: 2160, items };
}

export function makeAll() {
  const { blueprint, taxonomy } = loadContracts();
  return Object.fromEntries(['m1', 'm2-higher', 'm2-lower'].map(id => [id, makeModule(id, blueprint, taxonomy)]));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const out = resolve(process.argv[2] || 'fixture-modules');
  mkdirSync(out, { recursive: true });
  for (const [id, mod] of Object.entries(makeAll())) writeFileSync(join(out, `${id}.json`), JSON.stringify(mod, null, 2));
  console.log('wrote fixture modules to ' + out);
}
