# ATC Mental Math and Estimation Coach — README

File: `game-mental-math.html` (single file, vanilla JS/CSS, no dependencies, English UI, dark theme, works by double-click in Chrome/Edge from `file://`). Companion of `aptitude-trainer.html` (same look, same CSV convention); this coach owns mental arithmetic, aviation quick-math and multi-aircraft prediction, which `aptitude-trainer.html` does not cover.

## What it trains, and why

Phase 1 has no calculator: candidates who are asked for a fix time, a descent point or a wind component must get an exact or bounded-error answer in seconds, under a proctor's clock. Phase 2 (FEAST/PDEA) adds simultaneous demands: tracking a target while doing arithmetic resembles the controller's core skill of solving a numeric problem while monitoring something else (the resemblance is by design, not validated). This tool trains three layers:

1. **Pure mental-arithmetic techniques** (multiplication/division shortcuts, squares, complements, percentages, estimation) — the FEAST/PDEA numerical-reasoning and arithmetic-speed components, and every ATFCM/navigation calculation in Phase 1.
2. **Aviation quick-math formulas** (distance/speed/time, 1-in-60, 3:1 descent, wind components, UTC, fuel, wake spacing, unit conversions) — used directly in topics 5 (navigation), 6 (flight plan/ATFCM) and 9 (aerodynamics), and in FEAST's air-traffic scenarios.
3. **Multi-aircraft prediction** (where will it be, who arrives first, when does A overtake B, distance to lose height) — a paper-style format that resembles the PDEA/FEAST dynamic-spatial-reasoning tasks (two to four moving aircraft, one resolution asked); the resemblance is by design, not validated.
4. **Dual-task mode** — FEAST explicitly measures performance under divided attention. Tracking + arithmetic, monitoring + arithmetic, call-sign recognition + arithmetic and rule-switching + arithmetic are four independent secondary loads that can be dialled in on top of any drill, and the results screen reports the **dual-task cost** (accuracy drop versus the same level run single-task).

## The ten-level ladder

Time per item is the level's base seconds **multiplied by a per-technique factor** (1.0 for plain arithmetic such as "multiply by 11"; up to 2.0 for multi-aircraft prediction items, which need more reading and working) and, in estimate-only mode, by 0.6 again (less time, because the accepted error is wider). Hints are counted per session and capped by the level; a hinted correct answer counts as "Correct" but not "unassisted" (does not count for personal bests, the up-level streak or the adaptive engine).

| Level | Name | s/item | Items | Distractors | Max hint | Dual-task load | Meaning |
|---|---|---|---|---|---|---|---|
| 1 | Warm-up | 30 | 10 | 0 | 3 | 1 | learn the techniques |
| 2 | Easy | 24 | 12 | 0 | 3 | 1 | build accuracy |
| 3 | Steady | 20 | 15 | 0 | 3 | 2 | below target |
| 4 | Standard | 16 | 15 | 1 | 2 | 2 | below target |
| 5 | Competitive | 12 | 20 | 1 | 1 | 2 | **Phase 2 target** — what a well-prepared candidate should master |
| 6 | Hard | 9 | 20 | 2 | 1 | 3 | safety margin above target |
| 7 | Elite | 7 | 25 | 2 | 0 | 3 | beyond the competition (no hints from here) |
| 8 | Extreme | 5.5 | 25 | 3 | 0 | 3 | beyond the competition |
| 9 | Superhuman | 4.5 | 30 | 3 | 0 | 4 | stress training, failing it is expected |
| 10 | Impossible | 3.5 | 30 | 4 | 0 | 4 | calibrated so an excellent performer clears it under 96 % less than half the time (design intent, not a live measurement) |

**Distractors** are irrelevant data lines shown with the question (squawk, frequency, other traffic, runway, ATIS letter, weather...), forcing the reader to identify what matters — the same skill as filtering a busy radar picture.

Full detail and the exam-relevance blurb per level are in-app under "Levels and goals" (menu key 8).

### Adaptive mode
Starts at a chosen level (1-4). Progress is tracked in blocks of 25 items: a block needs 96 % or better (at most 1 error in 25) to count as clean; a **second error fails the block immediately** and a new block starts. After **N consecutive clean blocks** (N configurable, default 2) the level goes up by one; after **2 failed blocks** the level goes down by one. **The engine never recommends more speed while the running accuracy is below 96 %** — this is enforced both inside the adaptive engine (it cannot go up on a failed block) and separately as the anti-acceleration rule described below, which also applies to Ladder and Custom modes.

### Anti-acceleration rule (guards against speeding up and losing accuracy)
Before starting any session, the setup screen compares the requested level/time against the **last counted session**. If that session ended below 96 % and the new request is faster (higher level, or a shorter time limit at the same or a custom level), the Start button is blocked and a red box explains why; the candidate must explicitly tick "I understand, start anyway" to override. Slowing down or repeating at the same pace is always allowed without a warning.

### Custom mode
Six sliders/selects: number difficulty (1-10, drives the size of the numbers independently of level-derived timing), seconds per item (0 = untimed), item count, distractor count, hint level, dual-task load — plus the same Focus, Answer-mode and Second-task controls as the other modes.

## Technique catalogue (48 techniques, 3 categories)

**Arithmetic (17):** multiply by 5/9/11/25/99-101-999, squares ending in 5, squares near 50, squares near 100, difference of squares (a+b)(a-b), left-to-right addition, complements to 100, complements to 1000, percentages by splitting 10%/1%, fractions to decimals, divide by 5/9/11, casting out nines (a check, not a calculation — answered Y/N), rounding and estimation with error bounds, doubling and halving, distributive shortcuts.

**Aviation (21):** distance = speed x time, NM/min and the 6-minute rule, 1-in-60 rule (track error, off-track distance, heading correction), 3:1 descent and top of descent, required rate of descent (GS x 5), climb/descent gradients, kt<->km/h / NM<->km, ft<->m and FL<->m, hPa<->inHg, IAS to TAS (+2%/1000ft), ISA temperature and deviation, Mach to TAS, headwind/crosswind (clock method, 5-7-9), drift and heading correction, closing speed and time to CPA, in-trail spacing, UTC and time-zone arithmetic, fuel and time, turn rate-one rules of thumb, wake-turbulence NM-to-time conversion.

**Prediction (10, 1 to 4 aircraft, radar-style grid shown on screen):** where will it be (x/y position), which arrives first/last, when does A overtake B, time to reach the fix, distance needed to lose height at 3:1, distance between two aircraft after N minutes (opposite tracks and perpendicular 3-4-5/6-8-10/5-12-13 tracks), time gap between two aircraft reaching a crossing point.

Each technique has: a one-line **nudge** (hint level 1), the general **method** (hint level 2), a **worked example**, **when to use it**, and — during a drill — the **method applied to the exact numbers on screen** (hint level 3 / the after-mistake coaching). The "Learn techniques" menu (key 5) lists every technique with a live example and a 5-question practice; the "Skill map" (key 6) ranks all 48 by weakness and lets you jump straight into the weakest one.

## Hints, coaching and spaced repetition

- **Hint levels 0-3**: 0 none, 1 nudge, 2 method, 3 full worked solution on the current numbers. Available levels are capped by the session's difficulty level (0 from level 7 up). Pressing `H` reveals the next level; hints stack visibly.
- **After every wrong or blank answer**, the coach screen names the fastest technique for that exact item, restates its rule, and shows the rule applied to the numbers just seen, before the next item starts.
- **Weak-category tracking / spaced repetition**: every technique has a 5-box Leitner counter (return after 1/2/4/8/16 days). A correct, hint-free answer promotes the box; a wrong answer resets it to box 1; a hinted correct answer does not promote it. `chooseTech` weights item selection towards techniques that are inaccurate, low-box or due, so an "All techniques" session naturally over-samples weak spots; "Focus: weakest technique" targets only the single worst one.
- **Estimate-only mode** accepts answers within 5% or 10% of the exact value (both the reference answer and the time limit adapt: the timer shortens by x0.6 since less precision is required).

## Dual-task mode

Four independent secondary tasks, loads 1-4, run concurrently with any drill (menu key 4, or "Second task" in any setup screen):

- **Tracking** — keep the mouse on a moving, randomly-turning circle; scored as % of time on target.
- **Monitoring** — four numeric tiles; press Space when one flashes and jumps; scored by hits minus a penalty for false alarms, against misses.
- **Call-signs** — your own call-sign is shown; press Z only when a displayed message is addressed to it (near-miss call-signs are generated deliberately, one character off).
- **Rule-switching** — a rule (parity or size) applies to numbers shown one at a time, answered Z/X; the rule flips every few trials, and accuracy right after a switch is reported separately.

The results screen shows both tasks' scores and the **dual-task cost**: the main-task accuracy under dual load minus the average of the last 3 single-task sessions at the same level and answer mode (reported in points and %, with guidance on whether to raise the load, repeat, or drop back to single-task).

## Results, history and CSV

Every result screen shows: level, unassisted accuracy, seconds/item, personal best at that level (best accuracy and best speed among valid, hint-free sessions), current streak (valid sessions in a row), and a plain sentence stating where the level sits against the exam (target / below / above / beyond the competition). A numeric goal (accuracy %, seconds/item, or a correct-answer count) is required before every session and is evaluated against the result.

History is kept in `localStorage` (all reads/writes wrapped in try/catch; the app still works, without persistence, if storage is blocked). CSV export uses `;` as separator, UTF-8 with a BOM, and columns `Date;Module;Level;Correct;Wrong;Blank;Seconds per item;Accuracy %;Goal;Met` — opens directly in Excel, same convention as `aptitude-trainer.html`.

## Recommended use in the weekly plan

- **Daily, 10-15 minutes:** Ladder or Adaptive, single-task, levels 2-5 depending on current accuracy. Accuracy first: do not move to a higher level (or let Adaptive move you up) until 96%+ is routine.
- **2-3x/week, 10 minutes:** "Learn techniques" for any technique flagged weak in the Skill map, followed by its 5-question practice.
- **2-3x/week, 10-15 minutes, once level 5 is comfortable single-task:** Dual-task at load 1-2, level 3-5. Increase load only once the dual-task cost is consistently under ~3 points at the current load.
- **Weekly, one session:** Estimate-only mode at level 5-6, to build the "close enough, fast" instinct FEAST rewards.
- **Occasionally, for confidence and stress-testing:** levels 7-10, single-task, no hints. Expect low accuracy at 9-10 — that is by design, not a sign of regression.
- Always type a real numeric goal; never raise the speed after a sub-96% session — the app enforces the second rule but the first is on the candidate.

