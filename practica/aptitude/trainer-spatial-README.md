# Spatial reasoning trainer (`trainer-spatial.html`)

Single file, vanilla HTML/JS/CSS, English UI, works by double-click (file://) in Chrome or Edge. Storage key `atc_spatial_v1` (separate from `aptitude-trainer.html`).

## What it trains and why

The aptitude battery of Phase 1 and the FEAST/PDEA computer tests are believed to contain spatial items. Five exercises:

1. **3D mental rotation** (rotación mental 3D): Shepard-Metzler style block figures in isometric SVG. Which option is the reference turned (not mirrored)?
2. **Cube nets** (desarrollo de un cubo): which cube can be built from this net; opposite-faces logic; arrows on faces at level 5+.
3. **2D rotation and reflection**: rotate-only items and "which is the mirror image" items (from level 3).
4. **Paper folding and punching** (plegado y perforado): straight folds and, from level 6, a final diagonal fold; the holes must be unfolded.
5. **Views** (vistas): "which picture is the top/front/right view of this solid" and "from which side is this picture the view" (from level 2).

## How correctness is guaranteed

Each item is built with the answer by construction. Then `verifyItem` re-checks it with an independent function and the item is regenerated if the check fails, so each item has exactly one correct option. The independent path differs from the generating path:

| Exercise | Generation | Independent check |
|---|---|---|
| 3D rotation | random rotation from the closure of two 90-degree turns; distractors = mirror image, one cube moved, or both | canonical form under the 24 rotations built as signed permutation matrices with determinant +1; exactly one option equals the reference; mirror options must equal the canonical form of the mirror and differ from the reference; all options pairwise different; the reference must be chiral |
| Nets | net folded by the frame-rolling algorithm; option = visible corner (top, left, right faces) after a random rotation | the option must be reachable by one of the 24 signed-permutation rotations of the folded cube; distractors are kept only if no rotation gives them |
| 2D shapes | quarter-turn repetition and mirror | explicit rotation matrices; "rotate" variant: exactly one option equals the reference under rotation; "mirror" variant: option is not a rotation of the reference but its mirror is |
| Folding | reverse unfolding (reflect the holes across each crease, last fold first) | forward pass: every cell of the paper is pushed through the folds and checked against the punched cells |
| Views | scatter of every cube onto the picture | gather: for every pixel look along the line of sight |

All levels (since 2026-09-25) also reject solids whose hidden cubes (invisible in the drawing) would change any of the six views.

## The ten levels (manual ladder)

| Level | Name | Time limit per item | Options | Reference visible | Dual task | Hints |
|---|---|---|---|---|---|---|
| 1 | Warm-up | 60 s | 3 | always | off | 0-3 |
| 2 | Easy | 45 s | 3 | always | off | 0-3 |
| 3 | Steady | 35 s | 4 | always | off | 0-3 |
| 4 | Standard | 28 s | 4 | always | off | 0-3 |
| 5 | Competitive | 22 s | 4 | always | off | 0-3 |
| 6 | Hard | 18 s | 4 | always | off | 0-3 |
| 7 | Elite | 15 s | 5 | always | off | off |
| 8 | Extreme | 12 s | 5 | 8 s | light (digit every 3.0 s) | off |
| 9 | Superhuman | 10 s | 6 | 5 s | medium (2.2 s) | off |
| 10 | Impossible | 8 s | 6 | 3 s | heavy (1.6 s) | off |

Items per session: 20 (Custom: 5-40). When the limit expires the item is counted as blank. Level 5 is the intended target for Phase 2; level 7 and above are beyond the competition. Level 10 (6 options, huge figures or papers with dozens of holes, 8 s, reference visible 3 s, heavy dual task) is designed so that even an excellent performer rarely reaches the target accuracy.

### Complexity per exercise and level

| Level | 3D rotation (arms x length, cubes) | Net (arrowed faces, distractor types) | 2D shape (grid, squares, coloured) | Folding (straight folds, diag, punches) | Views (footprint, max height) |
|---|---|---|---|---|---|
| 1 | 3 x 2, 7 | 0; opposite/impossible corner; only nets with a strip of 4 | 4x4, 5, 0 | 1, no, 1 | 3x3, 2 |
| 2 | 3 x 2-3, 7-10 | 0; + swapped faces; strip-of-4 nets | 4x4, 6, 0 | 2, no, 1 | 3x3, 3 |
| 3 | 4 x 1-2, 5-9 | 0; swapped/impossible; strip-of-4 nets | 5x5, 7, 0 (mirror variant starts) | 2, no, 2 | 3x4, 3 |
| 4 | 4 x 2, 9 | 0; swapped/impossible; all 11 nets | 5x5, 8, 0 | 3, no, 1 | 4x4, 2 |
| 5 | 4-5 x 2, 9-11 | 2; arrows, swaps | 5x5, 9, 1 | 3, no, 2 | 4x4, 3 |
| 6 | 5 x 2-3, 11-16 | 3; arrows, swaps | 6x6, 10, 2 | 2, yes, 1 | 4x4, 4 |
| 7 | 5-6 x 2, 11-13 | 4; arrows, swaps | 6x6, 12, 2 | 2, yes, 2 | 5x4, 4 |
| 8 | 6 x 2-3, 13-19 | 5; arrows, swaps (finer) | 7x7, 14, 3 | 2, yes, 3 | 5x5, 4 |
| 9 | 7 x 2-3, 15-22 | 6; arrows, swaps | 7x7, 16, 3 | 4, no, 3 (up to 48 holes) | 5x5, 5 |
| 10 | 8 x 2-3, 17-25 | 6; arrows, swaps | 8x8, 20, 4 | 4 + diagonal, 3 (up to 64 holes) | 6x5, 5 |

From level 6 the moved-cube / moved-square distractors stay within 2 steps of the original place (subtle). The number of options (3 to 6) comes from the ladder. "3D cubes" counts are from the generator parameters.

## Modes

- **Manual**: pick a level (1-10).
- **Adaptive**: starts at level 2 (or where the last adaptive session ended). Complexity +1 after 5 correct answers in a row, -1 after 2 failures in a row. The time limit follows a separate "speed level" capped by `speedCap`, which rises only when the last 10 answers are at least 96 % accurate. Speed therefore never tightens while accuracy is low. Dual task is off; hints allowed up to the chosen hint level below level 7.
- **Custom**: sliders for complexity level, time limit (0 = none), options (2-6), reference exposure (0 = always), dual task (0-3), items (5-40); hint level from the setup screen.

## Session, scoring, records

- Numeric goal is required before starting (accepts `85 %`, `15 s`, `14 correct`, combined with "and").
- Accuracy = correct answers **without hints** / items. Wrong = wrong answers plus hinted items (a hinted item counts as wrong, so hints never inflate accuracy). Blank = skipped or timed out. Seconds per item = mean over all items.
- **15-second rule** (setup option): Off / Warn (bar turns red and the screen says to commit to a best guess at 15 s; default) / Enforce (an item still open at 15 s is counted as blank). Levels 7+ have limits of 15 s or less, so the rule is built in. Results show the percentage of items answered within 15 s.
- **Hints** (H key): 1 nudge, 2 method, 3 full worked solution; unavailable from level 7.
- Results: level, accuracy, s/item, personal best per level (manual sessions without hints), streak of met goals, a plain statement of the level against the target, a recommendation that never suggests speeding up below 96 % accuracy, breakdown by exercise, and a review of mistakes with the reason each distractor fails.
- History in localStorage (all accesses inside try/catch; the page works without storage) and CSV export: `;` separator, UTF-8 BOM, decimal point, columns `Date;Module;Level;Correct;Wrong;Blank;Seconds per item;Accuracy %;Goal;Met`. Level column: number, `Custom n` or `Adaptive x.x`.
- Keys: 1-6 or A-F answer, H hint, S skip, Enter next, K dual task, Esc abort.

## Techniques panel (opens on the home screen)

Adjacency technique for nets (floor face, neighbours stay adjacent, clockwise order around a corner); opposite-faces rule (in a straight line, faces separated by exactly one face are opposite; opposite faces are never visible together); mirror check (handedness of three perpendicular consecutive arms, right-hand rule; longest-arm alignment for flat shapes); paper folding (unfold in reverse, mirror each hole across each crease); views (tallest stack per column); the 15-second rule.

## Weekly use (suggestion)

3-4 sessions per week of 20 items (about 8 minutes each), one exercise type per session early on, mixed later. Stay at a level until you hold at least 96 % accuracy at its time limit in two sessions, then go up one level. Read the techniques panel before the first sessions. Use levels 7-10 only occasionally, for ceiling training; do not judge yourself by their accuracy.

