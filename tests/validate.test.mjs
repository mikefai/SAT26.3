import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { validateForm, validateModule, loadJSON, MODULE_IDS } from '../tools/validate.mjs';
import { makeAll, loadContracts } from './fixtures/make-fixture.mjs';

const { blueprint, taxonomy } = loadContracts();
const clone = o => JSON.parse(JSON.stringify(o));
const errorsFor = mutate => {
  const mods = makeAll();
  mutate(mods);
  return validateForm(mods, blueprint, taxonomy).join('\n');
};

test('the binding grid itself satisfies the form rules (fixture passes)', () => {
  assert.deepEqual(validateForm(makeAll(), blueprint, taxonomy), []);
});

test('flags adjacent hard items', () => {
  // M1 position 4 is hard; make position 3 hard as well.
  const errs = errorsFor(m => { m.m1.items[2].rating = 4; m.m1.items[2].band = 'Hard'; });
  assert.match(errs, /hard items adjacent at positions 3 and 4/);
});

test('flags a key letter repeated three times in a row', () => {
  const errs = errorsFor(m => {
    for (const i of [0, 1, 2]) {
      const it = m.m1.items[i];
      const old = it.key;
      if (old === 'A') continue;
      it.key = 'A';
      it.distractors[old] = it.distractors.A;
      delete it.distractors.A;
    }
  });
  assert.match(errs, /key A repeats 3 times/);
});

test('flags unknown and inapplicable trap ids', () => {
  const errs = errorsFor(m => {
    const it = m.m1.items[0];
    const [l1, l2] = Object.keys(it.distractors);
    it.distractors[l1].trap = 'not-a-trap';
    it.distractors[l2].trap = 'comma-splice'; // grammar trap on a words-in-context item
  });
  assert.match(errs, /unknown trap "not-a-trap"/);
  assert.match(errs, /trap "comma-splice" does not apply to CAS\.WIC/);
});

test('flags a conventions item without a blank', () => {
  const errs = errorsFor(m => { m.m1.items[16].stimulus.text = m.m1.items[16].stimulus.text.replace('______', 'very'); });
  assert.match(errs, /exactly one blank/);
});

test('flags culture-bound terms and banned phrases', () => {
  const errs = errorsFor(m => {
    m.m1.items[0].stimulus.text += ' It cost ten dollars at the baseball game.';
    m.m1.items[1].options.D = 'All of the above';
  });
  assert.match(errs, /culture-bound term/);
  assert.match(errs, /banned phrase/);
});

test('does not flag ordinary words that contain banned substrings', () => {
  const errs = errorsFor(m => { m.m1.items[0].stimulus.text += ' Rain fell on the eastern slopes during the homecoming of the geese.'; });
  assert.doesNotMatch(errs, /culture-bound/);
});

test('enforces standard stems, INF blank at end, and RS note rules', () => {
  const errs = errorsFor(m => {
    m.m1.items[16].stem = 'Which option is grammatical?';
    const inf = m.m1.items.find(it => it.skillCode === 'INI.INF');
    inf.stimulus.text = inf.stimulus.text.replace('______', 'x') + ' ______ and more words after.';
    const rs = m.m1.items.find(it => it.skillCode === 'EOI.RS');
    rs.stimulus.notes = rs.stimulus.notes.slice(0, 3);
    rs.stimulus.intro = 'Some notes:';
  });
  assert.match(errs, /non-standard stem for SEC\.BND/);
  assert.match(errs, /INF passage must end with the blank/);
  assert.match(errs, /4-6 notes/);
  assert.match(errs, /RS intro must be the standard sentence/);
});

test('flags duplicate topics across modules and wrong distractor letters', () => {
  const errs = errorsFor(m => {
    m['m2-lower'].items[0].topic = m.m1.items[0].topic;
    const it = m.m1.items[5];
    it.distractors[it.key] = { trap: 'too-narrow', explanation: 'The key cannot also be a distractor.' };
  });
  assert.match(errs, /duplicate topic/);
  assert.match(errs, /distractors must be exactly/);
});

test('flags items that drift from the grid', () => {
  const mod = clone(makeAll().m1);
  mod.items[0].targetSeconds = 999;
  mod.items[1].skillCode = 'CAS.TSP';
  const errs = validateModule(mod, 'm1', blueprint, taxonomy).join('\n');
  assert.match(errs, /targetSeconds is 999/);
  assert.match(errs, /skillCode is "CAS.TSP"/);
});

const realPresent = MODULE_IDS.every(id => existsSync(new URL(`../data/modules/${id}.json`, import.meta.url)));
test('real authored modules pass validation', { skip: !realPresent && 'module files not written yet' }, () => {
  const mods = Object.fromEntries(MODULE_IDS.map(id => [id, loadJSON(`data/modules/${id}.json`)]));
  assert.deepEqual(validateForm(mods, blueprint, taxonomy), []);
});
