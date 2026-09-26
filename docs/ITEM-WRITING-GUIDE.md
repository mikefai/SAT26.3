# Item-Writing Guide

Binding rules for every item in `data/modules/*.json`. `tools/validate.mjs` enforces the machine-checkable ones; the rest are checked in review.

> Unofficial, original practice material; not affiliated with or endorsed by College Board. SAT is a trademark of College Board.

## 1. The grid is the contract

`data/blueprint.json` fixes, for every position in every module: `id`, `position`, `domain`, `skillCode`, `skill`, `band`, `rating`, `key`, `targetSeconds`. Copy these values into the item **exactly**. Write the item so that the correct answer sits at the grid's key letter. Never change the grid.

## 2. Item JSON schema

```json
{
  "id": "M1-01",
  "position": 1,
  "domain": "Craft and Structure",
  "skill": "Words in Context",
  "skillCode": "CAS.WIC",
  "band": "Easy",
  "rating": 1,
  "targetSeconds": 35,
  "topic": "Seed dispersal by ants",
  "stimulus": {
    "type": "prose",
    "text": "Passage text. Use ______ (six underscores) for a blank. Use {u}...{/u} to underline a portion."
  },
  "stem": "Which choice completes the text with the most logical and precise word or phrase?",
  "options": { "A": "…", "B": "…", "C": "…", "D": "…" },
  "key": "A",
  "rationale": "Why the key is the only defensible answer, citing the text.",
  "distractors": {
    "B": { "trap": "common-meaning", "explanation": "Why B is wrong, tied to the trap class." },
    "C": { "trap": "wrong-connotation", "explanation": "…" },
    "D": { "trap": "illogical-in-context", "explanation": "…" }
  }
}
```

Module file wrapper:

```json
{ "moduleId": "m1", "title": "Reading and Writing — Module 1", "route": null, "timeLimitSeconds": 2160, "items": [ … 30 items in position order … ] }
```

`moduleId`/`route` values: `m1` (route `null`), `m2-higher` (route `"higher"`), `m2-lower` (route `"lower"`).

### Stimulus types

| type | fields | use |
|---|---|---|
| `prose` | `text`, optional `title`, `attribution` | most items |
| `poem` | `text` (lines separated by `\n`), `title`, `attribution` (fictional poet) | literary WIC/TSP/CID/INF/COET |
| `paired` | `text1`, `text2` | CTC only |
| `notes` | `intro`, `notes` (array, 4–6 bullets) | RS only; goal goes in the stem |
| `table` | `text`, `table: {caption, columns[], rows[][]}` | COEQ |
| `chart` | `text`, `chart: {caption, xLabel, yLabel, categories[], series:[{label, values[]}]}` | COEQ (bar chart) |

`attribution` for literary texts must name a **fictional** author and work, e.g. `"Adapted from Mira Okonjo's novel *The Salt Road* (fictional)"`. Do not use real authors or works.

## 3. Real-exam format rules

- One short passage (25–150 words) and one question per item. For notes, count the words of all bullets. For tables and charts, count text plus caption; the minimum is 15.
- Four options, A–D. All four must be distinct and roughly parallel in length and grammatical form. Never use "all of the above" or "none of the above".
- Exactly **one** defensible answer. Every distractor must be wrong for a reason you can state from the text or from grammar rules, not from outside knowledge.
- Each of the three distractors gets a `trap` id from `data/taxonomy.json` whose `appliesTo` includes the item's `skillCode`, plus a one- or two-sentence `explanation`.
- SEC and TRN passages must contain the blank `______`. WIC items normally use a blank too. INF items end with a blank completing the final sentence. COEQ items may use a blank.
- CTC uses `paired` with "Text 1" and "Text 2" by different fictional researchers or writers.
- RS uses `notes`: `intro` is "While researching a topic, a student has taken the following notes:". The stem is "The student wants to <goal>. Which choice most effectively uses relevant information from the notes to accomplish this goal?"

### Standard stems

| Skill | Stem(s) |
|---|---|
| WIC | "Which choice completes the text with the most logical and precise word or phrase?" / "As used in the text, what does the word \"X\" most nearly mean?" |
| TSP | "Which choice best describes the function of the underlined sentence in the text as a whole?" / "Which choice best states the main purpose of the text?" / "Which choice best describes the overall structure of the text?" |
| CTC | "Based on the texts, how would <Text 2 author> most likely respond to <claim in Text 1>?" / "Which choice best describes a difference in how the authors of Text 1 and Text 2 view …?" |
| CID | "Which choice best states the main idea of the text?" / "According to the text, …?" / "Based on the text, what is true about …?" |
| COET | "Which finding, if true, would most directly support <claim>?" / "Which quotation from the <poem/novel> most effectively illustrates the claim?" / "Which finding, if true, would most directly weaken …?" |
| COEQ | "Which choice most effectively uses data from the table to complete the <example/statement>?" / "Which choice best describes data from the graph that support <claim>?" |
| INF | "Which choice most logically completes the text?" |
| BND, FSS | "Which choice completes the text so that it conforms to the conventions of Standard English?" |
| TRN | "Which choice completes the text with the most logical transition?" |
| RS | See above. |

## 4. Difficulty by rating

| Rating | What makes it this hard |
|---|---|
| 1 | Short, concrete passage; key clearly signalled; distractors plainly off-topic or ungrammatical. |
| 2 | Concrete passage; one distractor tempting on a quick read. |
| 3 | Moderately dense passage or one step of inference; two distractors tempting (half-right, too narrow). |
| 4 | Dense or abstract passage, qualified claims, less common vocabulary; distractors differ from the key by one nuance. |
| 5 | Most complex syntax or reasoning (e.g., nested qualification, evidence that must fit a precise claim, subtle nonessential-clause punctuation); every distractor survives a surface read. |

Grammar difficulty comes from sentence complexity: long intervening phrases, inverted order, nonessential elements, and titles or names before appositives. It never comes from obscure rules.

## 5. Originality and fairness

- Every passage, poem, story, study, researcher, institution, and dataset is **invented for this form**. You may state universally known general facts, such as "water expands when it freezes".
- Never attribute an invented finding to a real person, organization, journal, or named real study.
- Culture-neutral: no local sports, national holidays, national politics or civics, currency amounts, brand names, slang or idioms. No knowledge beyond the passage should be needed. Use names from many world cultures.
- Avoid distressing topics (violence, disease outbreaks, disasters with casualties).
- No topic may repeat across the 90 items. Use the seed below for each position.

## 6. Topic seeds (one per position; do not swap)

### Module 1 (`m1`)
| Pos | Skill | Topic seed |
|---|---|---|
| 1 | WIC | Seed dispersal by ants (natural science) |
| 2 | WIC | A ceramicist who repairs pottery with visible gold seams (arts) |
| 3 | WIC | Fiction: a lighthouse keeper's daughter watching a storm (literature) |
| 4 | WIC | Contact languages that form in port cities (social science) |
| 5 | TSP | Original poem: a river in winter (poetry) |
| 6 | TSP | Tardigrades surviving desiccation (natural science) |
| 7 | CTC | Car-free city streets: two researchers' views (social science) |
| 8 | CTC | Where the Moon's water came from: two hypotheses (natural science) |
| 9 | CID | Fiction: a baker opening her shop before dawn (literature) |
| 10 | CID | Salt caravans across a desert in earlier centuries (history) |
| 11 | COET | Song dialects among birds on neighbouring islands (natural science) |
| 12 | COET | A fictional novel's unreliable narrator (literature) |
| 13 | COEQ | Share of electricity from renewable sources in four fictional regions (table) |
| 14 | COEQ | Bee visits to flowers of different colours (bar chart) |
| 15 | INF | How river deltas build and lose land (earth science) |
| 16 | INF | Handwriting versus typing and memory for lecture notes (psychology) |
| 17 | BND | Formation of volcanic islands (earth science) |
| 18 | BND | Early keyboard instruments and how their sound changed (music history) |
| 19 | BND | Bamboo scaffolding on tall buildings (engineering) |
| 20 | BND | Feathered dinosaur fossils (paleontology) |
| 21 | FSS | A fictional village savings cooperative (economics) |
| 22 | FSS | Why iron rusts faster near the sea (chemistry) |
| 23 | FSS | A fictional painter's mineral pigments (art history) |
| 24 | TRN | How cacti store water (botany) |
| 25 | TRN | Whistled languages in mountain valleys (linguistics) |
| 26 | TRN | Base isolation that protects buildings in earthquakes (engineering) |
| 27 | RS | Finding exoplanets by the transit method (astronomy) |
| 28 | RS | A fictional study of community gardens (sociology) |
| 29 | RS | Early movable-type printing (history of technology) |
| 30 | RS | Two fictional studies of octopus camouflage (biology) |

### Module 2 — higher (`m2-higher`)
| Pos | Skill | Topic seed |
|---|---|---|
| 1 | WIC | Falsifiability in scientific theories (philosophy of science) |
| 2 | WIC | Fiction: a violinist and her rival (literature) |
| 3 | WIC | Sleep and memory consolidation (neuroscience) |
| 4 | TSP | Original poem: migrating cranes (poetry) |
| 5 | TSP | The race to build clocks accurate enough for navigation at sea (history of science) |
| 6 | CTC | Fictional pilot programmes giving residents regular cash payments: two economists (economics) |
| 7 | CTC | Why a fictional ancient city was abandoned: two archaeologists (archaeology) |
| 8 | CID | Fiction: an elderly mapmaker revising an old chart (literature) |
| 9 | CID | Fungal networks linking tree roots (ecology) |
| 10 | COET | A fictional study of gift exchange in a fishing community (anthropology) |
| 11 | COET | A fictional play's ambitious protagonist (literature/drama) |
| 12 | COEQ | Glacier retreat in three fictional valleys (bar chart) |
| 13 | INF | The toughness of spider silk (materials science) |
| 14 | INF | Dark matter in small galaxies: a fictional survey (astrophysics) |
| 15 | BND | Deep-sea hydrothermal vents (oceanography) |
| 16 | BND | Long-exposure photography (arts/technology) |
| 17 | BND | Plant-based textile dyes (chemistry/crafts) |
| 18 | BND | Slow sand filtration for drinking water (engineering) |
| 19 | FSS | Map projections and distortion (geography) |
| 20 | FSS | Tool use by crows (animal cognition) |
| 21 | FSS | The number zero as a written symbol (history of mathematics) |
| 22 | FSS | Deep ocean currents (oceanography) |
| 23 | TRN | Terrace farming on steep hillsides (agriculture) |
| 24 | TRN | A fictional study of default choices in savings plans (behavioural economics) |
| 25 | TRN | Catalysts in chemical reactions (chemistry) |
| 26 | TRN | Films before recorded sound (film history) |
| 27 | RS | Humpback whale song changing over seasons (marine biology) |
| 28 | RS | Two fictional studies of bilingual children (linguistics) |
| 29 | RS | Wind towers for passive cooling (architecture) |
| 30 | RS | Two fictional studies of drought-tolerant plant varieties (genetics) |

### Module 2 — lower (`m2-lower`)
| Pos | Skill | Topic seed |
|---|---|---|
| 1 | WIC | Penguins huddling for warmth (zoology) |
| 2 | WIC | Fiction: a child learning to swim in a lake (literature) |
| 3 | WIC | The abacus as a calculating tool (history of technology) |
| 4 | TSP | Original poem: a night market (poetry) |
| 5 | TSP | Salt flats and why they are so level (geography) |
| 6 | CTC | Homework and learning: two fictional education researchers (education) |
| 7 | CTC | Why zebras have stripes: two hypotheses (biology) |
| 8 | CID | Fiction: a gardener before a storm (literature) |
| 9 | CID | Young sunflowers tracking the sun (botany) |
| 10 | COET | A fictional study of plate colour and appetite (psychology) |
| 11 | COET | A fictional ancient library's catalogue (history) |
| 12 | COEQ | Bicycle commuting in four fictional cities (table) |
| 13 | INF | Why meteor showers recur each year (astronomy) |
| 14 | INF | A fictional study of dawn fish-market prices (economics) |
| 15 | BND | Parrotfish producing sand on coral reefs (marine biology) |
| 16 | BND | Handmade paper from plant fibres (crafts) |
| 17 | BND | Life in the rainforest canopy (ecology) |
| 18 | BND | Glassblowing techniques (arts/crafts) |
| 19 | FSS | Singing sand dunes (earth science) |
| 20 | FSS | Recycling aluminium (materials) |
| 21 | FSS | Glowing fungi (biology) |
| 22 | FSS | The history of kites (history of technology) |
| 23 | TRN | Solar cookers (technology) |
| 24 | TRN | How camels conserve water (zoology) |
| 25 | TRN | What causes tides (earth science) |
| 26 | TRN | Mosaic art from broken tiles (arts) |
| 27 | RS | The fast growth of bamboo (botany) |
| 28 | RS | How snow crystals form (atmospheric science) |
| 29 | RS | Leafcutter ants that farm fungus (biology) |
| 30 | RS | Two fictional footbridge designs (engineering) |

Use each seed's text (without the parenthetical) as the item's `topic` field. Topics must be unique across all 90 items.
