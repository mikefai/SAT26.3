# Routing Rule

> Unofficial, original practice material; not affiliated with or endorsed by College Board. SAT is a trademark of College Board.

| Module 1 raw score | Accuracy | Module 2 route |
|---|---|---|
| 18–30 correct | ≥ 60% | **Higher** (`m2-higher`): 3 Easy / 13 Medium / 14 Hard |
| 0–17 correct | < 60% | **Lower** (`m2-lower`): 9 Easy / 14 Medium / 7 Hard |

Unanswered Module 1 questions count as incorrect. The rule is implemented in `js/engine.js` (`routeFor`) and configured in `data/form.json` (`routing.threshold`).

## Why 18 of 30

- **Module 1 difficulty.** Module 1 is built to the balanced mix (6 Easy / 14 Medium / 10 Hard). A student who gets all Easy and most Medium items right, but few Hard items, lands around 16–19. The cut is set at the point where the student has shown command of the Medium items: 6 Easy + 12 of 14 Medium = 18.
- **The two routes differ in their hardest items.** The higher route replaces easy items with hard ones: 14 Hard against the lower route's 7. Routing a student who has not yet mastered Medium items into that module would mostly measure frustration, not skill.
- **Each route stays balanced.** Both routes contain 15 items per domain across Modules 1 and 2. Averaged together, their difficulty mix matches the form target of 20 / 45 / 35.

## What this rule is not

The real Digital SAT routes students with an item-response-theory model that weights each question by its statistical properties, and it does not publish a raw cutoff. This threshold is a transparent rule for **this practice form only**. It should not be read as a prediction of real routing.
