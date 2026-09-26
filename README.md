# Reading and Writing Adaptive Practice Form

An original, **unofficial** practice form in the Digital SAT Reading and Writing format, built as a static web app (HTML, CSS, JavaScript, JSON, Markdown).

> Unofficial, original practice material; not affiliated with or endorsed by College Board. SAT is a trademark of College Board. All passages, people, studies, and data are invented for this form.

## What's in the form

| | |
|---|---|
| Section | Reading and Writing, 2 modules |
| Module 1 | 30 questions, 36 minutes |
| Module 2 | Two adaptive variants (higher route and lower route), 30 questions each, 36 minutes |
| Domains | 15 items per domain on either route: Craft and Structure · Information and Ideas · Standard English Conventions · Expression of Ideas |
| Difficulty | 90-item bank: 18 Easy / 41 Medium / 31 Hard (20.0 / 45.6 / 34.4%) |
| Routing | Module 1 score **≥ 18/30 → higher route**, **≤ 17/30 → lower route** (see [docs/ROUTING.md](docs/ROUTING.md)) |

Every item has a skill tag, a difficulty rating from 1 to 5, a target solving time, a rationale for the key, and a teardown of each distractor naming its trap class. The full position grid is in [docs/BLUEPRINT.md](docs/BLUEPRINT.md).

## Using it

**No install needed:** open `index.html` in a browser. The data is bundled into `js/data.js`, so the pages work straight from disk.

Or serve it (Node 20+, no dependencies):

```bash
npm start
```

Then visit http://localhost:3000.

| Page | Purpose |
|---|---|
| `index.html` | Start or resume, format, routing rule, links to printable editions |
| `test.html` | Timed adaptive test: Module 1 → routing → Module 2. Includes a hideable timer, mark for review, cross-out, a question navigator, a check-your-work page, and auto-submit when time runs out. Progress is saved in the browser. |
| `review.html` | Score report: raw score, route, and domain/skill/difficulty breakdowns, plus every item with the key, rationale, and distractor teardowns |
| `print.html?module=m1` | **Deliverable 1:** clean, unannotated student edition of Module 1 |
| `print.html?module=m2-higher`, `?module=m2-lower` | **Deliverable 2:** student editions of both Module 2 variants |
| `print.html?module=all&key=1` | Teacher edition: answer keys, ratings, target times, teardowns |

Keyboard shortcuts in the test: A–D or 1–4 choose, ← → move between questions, M marks for review, Esc closes pop-ups.

Markdown copies of every edition are generated into `docs/student-edition/` and `docs/answer-key/`.

## Project layout

```
index.html  test.html  review.html  print.html
css/app.css  css/print.css
js/engine.js    scoring, routing, answer stripping, result encoding (shared with tests)
js/render.js    passage/poem/table/chart/notes rendering
js/test.js  js/review.js  js/print.js
js/data.js      GENERATED bundle of data/*.json
data/form.json        form metadata, timing, routing rule, deviations
data/taxonomy.json    domains, skills, bands, trap classes
data/blueprint.json   binding position grid (id, skill, rating, key, target time)
data/modules/{m1,m2-higher,m2-lower}.json   the 90 items
tools/validate.mjs    enforces the grid and every item rule
tools/build.mjs       builds js/data.js and the Markdown docs
server.mjs            optional zero-dependency static server
tests/                node:test suites (engine, validator, build, server)
docs/                 BLUEPRINT, ROUTING, ITEM-WRITING-GUIDE, editions
```

## Development

```bash
npm run validate
```

Checks every item against the grid and the item rules.

```bash
npm run build
```

Validates, then regenerates `js/data.js` and `docs/*.md`.

```bash
npm test
```

Runs the unit and integration tests.

After editing any file in `data/`, run `npm run build`.

The validator enforces the following:

- Domain, skill and difficulty counts, and exact match to the grid.
- No two Hard items adjacent, and the rising-difficulty rule within each domain group.
- Balanced answer letters, with no letter three times in a row.
- Target-time totals within the module limit.
- Four distinct options, and exactly three distractor teardowns, each with a trap class that applies to the skill.
- Passage length (25–150 words), plus required blanks, paired texts, tables and charts, and notes.
- No duplicate topics, and no culture-bound terms or banned phrases.

## Deviations from the real exam

- 60 questions (30 per module) as specified for this form; the real section has 54 (27 per module).
- 36 minutes per module, which keeps the real pace of about 71 seconds per question.
- Routing uses a stated raw-score threshold; the real exam uses an item-response-theory model.
- Raw scores only; no scaled 200–800 estimate.
- Equal domain weighting (15 items each).

Because this is a static site, the answer keys ship inside `js/data.js`. The test UI never renders them, but a determined student could read them from the file. Use the printed student editions for supervised testing.
