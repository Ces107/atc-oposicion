# Abstract reasoning trainer (matrices, series, analogies, odd one out, logic matrices)

File: `trainer-matrices.html` (single file, no dependencies, double-click in Chrome/Edge, English UI, keyboard first, same dark look as `../aptitude-trainer.html`).

## What it trains and why
Abstract (non-verbal) reasoning of the Raven type (razonamiento abstracto): inferring a hidden rule from figures and applying it fast and without error. It is the closest free proxy for the aptitude battery of Phase 1 and for the rule-finding and pattern components believed to be in the Phase 2 computer tests (FEAST/PDEA). It also trains what the exam punishes most: **speeding up and losing accuracy**. Hence the 96 % anti-acceleration rule below. ENAIRE doesn't publish the exact content of its aptitude test; this is a proxy, not a copy.

## Item types (all generated from rules, seeded, one correct answer)

| Type | What you see | What you do |
|---|---|---|
| Matrix | 3x3 grid, last cell missing | pick the figure that completes it |
| Logic matrix | 3x3 grid of dot-grids with marks; third cell = operator(first two) | pick the result (OR, AND, XOR, first-minus-second, second-minus-first, XNOR) |
| Figure series | 5 figures then "?" | pick the 6th |
| Analogy | A : B :: C : ? | apply the A-to-B change to C (relative change) |
| Odd one out | 5 to 8 figures | click the one that breaks the shared rule |

## Rules catalogue
Attributes: shape (12 shapes; only 4 asymmetric ones when rotation is a rule), number of shapes (1-5), shading (white, hatched, grey, black), size (3), rotation (8 steps of 45 deg), position (8 places round the cell edge; forces one small shape).

- Matrix per attribute: constant; constant per row/column; progression (step +-1, +-2, and +-3 for rotation/position); distribution of three (Latin square); arithmetic on the count (add or subtract). Rules can run along rows or down columns (random transposition from level 3).
- Series per attribute: constant; progression (wraps round); alternation of two values; cycle of three; two interleaved sequences (each with its own step); bounce (reverses at the ends of the scale).
- Logic: per glyph group one operator; 1 to 3 groups (told apart by glyph shape); 4, 6 or 9 slots.
- Analogy: 1 to 4 attributes change by a step (relative change); shape always stays.
- Odd one out: "all but one share a value" and "all but one keep the same index difference between two ordinal attributes" (count/shading/size), one to three constraints, the odd one breaks exactly one.
- Feedback after each item lists the rule of every attribute, why your wrong choice was wrong (each distractor differs from the answer in exactly one attribute, or for logic items in one operator/one slot), and the time used.

## Difficulty system (10 levels)

| Level | Name | Guess prompt at | Auto-skip | Hints | Matrix attrs changing | Options (matrix) | Near distractors |
|---|---|---|---|---|---|---|---|
| 1 | Warm-up | 40 s | no | 0-3 | 1 | 4 | 0 % |
| 2 | Easy | 30 s | no | 0-3 | 1 | 5 | 0 % |
| 3 | Steady | 24 s | no | 0-3 | 2 | 6 | 10 % |
| 4 | Standard | 18 s | no | 0-3 | 2 | 6 | 20 % |
| 5 | Competitive (target for Phase 2; the 15-second rule) | 15 s | no | 0-3 | 3 | 8 | 35 % |
| 6 | Hard | 13 s | 22 s | 0-3 | 3 | 8 | 50 % |
| 7 | Elite | 11 s | 16 s | off | 3 | 8 | 65 % |
| 8 | Extreme | 9 s | 12 s | off | 4 | 9 | 80 % |
| 9 | Superhuman | 7 s | 9 s | off | 4 | 10 | 95 % |
| 10 | Impossible | 5 s | 6 s | off | 5 (all attributes) | 10 | 100 % |

Other dimensions by level (see `MATRIX_P`, `SERIES_P`, `ANALOGY_P`, `ODD_P`, `LOGIC_P` in the code): rule catalogue (level 1 only constant/progression; arithmetic from 5; step 3 from 6; no constant-per-line rule from 7), rotation from 4 and position from 5, series with 1 to 5 changing attributes and interleaved/bounce rules from 5-6, analogies with 1 to 4 changes of up to 4 steps, odd-one-out from a plain shared value (1-2) to relations with near-miss violations among 8 figures (9-10), logic from 4 slots and OR/AND (1) to 9 slots, three glyph groups and six operators (9-10, up to 10 options). "Near distractors" = share of distractor values chosen as the nearest wrong value instead of at random. "Prompt at" is the level's 15-second-rule time: when it passes without an answer the trainer asks you to guess (G) and move on; from level 6 the item is skipped automatically (blank). Level 10 is meant to be completed at 96 % accuracy less than half the time even by an excellent performer: five simultaneous rules, ten near-identical options, 5 s. The calibration is by design, not by measurement; adjust after a few real sessions.

## Modes

- **Manual**: choose type (mixed or one type) and level; 20 items.
- **Adaptive**: starts at level 2, blocks of 5 items; two consecutive blocks at 96 % or more go up one level; two consecutive blocks below 75 % go down; 75-96 % keeps the level and resets the streaks. Never a speed-up recommendation below 96 %.
- **Custom**: sliders for item complexity (1-10), time limit (3-60 s), number of items (5-60), options (4-10, relaxed deterministically if a type cannot supply that many distinct distractors) and optional auto-skip at 1.5x the limit; dual task and hint level as in the other modes.
- **Hints** (level 1-6 only): 1 = which attributes change; 2 = method and kind of rule per attribute; 3 = full worked solution and the correct option highlighted (the item counts as blank).
- **Dual task** (optional): a lamp turns red at random every 6-12 s for 2.5 s; press K. Hits, misses and false presses are reported.
- **Goal**: a numeric goal is required before each session (`96 %`, `15 s`, `18 correct`, or combined). Met/Not met is stored.
- **Results screen**: level, accuracy, s/item, goal, streak of sessions at 96 % or more, personal best per level (best s/item at 96 % or more, manual mode), recommendation (anti-acceleration), plain statement of where the level sits (level 5 = Phase 2 target, 7+ beyond the competition), accuracy by item type, item-by-item table. Seed is shown; entering it in the menu replays the same items.

## History and CSV
localStorage key `atc_matrices_v1` (all access in try/catch; warns if unavailable). CSV: `;` separator, decimal point, UTF-8 with BOM, columns `Date;Module;Level;Correct;Wrong;Blank;Seconds per item;Accuracy %;Goal;Met`. Module carries the item type and, outside manual mode, `[adaptive]` or `[custom]`; Level is the level (adaptive: rounded average). Note: this is the new 10-column format (with Level); it is separate from the storage of `aptitude-trainer.html`.

## Recommended use
3 to 4 sessions per week of 20 items (about 8-10 minutes), mixed type, at the highest level where you hold 96 %. Level 5 is the target: reach 96 % at 15 s there first, then use 6-8 as stress sessions and 9-10 rarely (they are not for judging yourself). After a wrong item read the rule before continuing: the learning is in the feedback. Use the dual task once a week.

