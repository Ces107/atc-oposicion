# ATC Radar Trainer (`trainer-radar.html`)

Single file, vanilla JS, no dependencies, English UI, keyboard first, dark theme. Open it by double-click in Chrome or Edge (works from `file://`). It is the fourth aptitude trainer; the look and the CSV format follow `aptitude-trainer.html` (which was not edited).

## What it trains and why

| Module | Skill | Where it maps (believed, not officially published) |
|---|---|---|
| 1. Conflict detection | Reading a static radar picture and deciding which pairs will lose 5 NM / 1000 ft within N minutes; using constant-bearing-decreasing-range (CBDR, rumbo constante y distancia decreciente) as a shortcut | Phase 2 computer-based tests (FEAST / PDEA-type conflict and planning tasks) and the professional reasoning of a controller |
| 2. Heading arithmetic | Reciprocal headings, turns, wind drift by the 1-in-60 rule, ground speed, time / distance / speed, multi-step chains, all under time pressure | Numerical and spatial aptitude items; everyday controller mental arithmetic |
| 3. Fast categorization | "Assign objects to categories" by a rule shown on screen, keyboard only, with rule switching (mirrored keys) at high levels | FEAST-style categorization and rule-following speed; the anti-acceleration rule protects accuracy |

The mapping to the real tests is our own inference from public descriptions, not a confirmed match; the trainer teaches the underlying skills, not the exact test items.

## Modes

* **Manual:** choose any level from 1 up to the highest one you have unlocked.
* **Adaptive:** the trainer plays your current level. It goes up after **three consecutive valid sessions (accuracy at least 96 %) played at that level**, and down one level after **two consecutive sessions below 96 %**. It never goes up while accuracy is below 96 % (the only way up is three valid sessions in a row).
* **Custom:** sliders for every main parameter (aircraft, window, time limit, pictures, traps, exposure; angle step, time limit, items, multi-step share and depth; rule complexity, speed, objects, rounds, mirrored-key share; dual-task on/off; harder time/distance/speed numbers; hint level). Custom sessions are recorded (level column shows `Custom`) but never move the level, the streak or personal bests.
* A session played at a level different from the adaptive level (manual, lower or higher), a session that used hints, and any Custom session never move the adaptive state.
* A numeric goal must be typed before every session (for example `≥96 % accuracy today`, `≤3.0 s with ≥95 %`, `8 correct`). If the text cannot be parsed, the trainer asks you whether you met it.

## The ten-level ladder

Level 5 (Competitive) is the level a well-prepared candidate should master (target for Phase 2). Levels 7 and above are beyond the competition. Level 10 (Impossible) is calibrated so that even an excellent performer reaches 96 % accuracy less than half the time; a failure there is normal.

Names: 1 Warm-up, 2 Easy, 3 Steady, 4 Standard, 5 Competitive, 6 Hard, 7 Elite, 8 Extreme, 9 Superhuman, 10 Impossible.

### Module 1: conflict detection

Trap pairs (distractors) are pairs that look dangerous but are not conflicts: a pair saved only by 1000 ft or more of vertical separation, or a lateral near miss of 6 to 9 NM. "Traps" is the minimum number in every picture. Time limit is per picture; when it expires whatever is typed is submitted (empty = blank). Exposure = seconds the picture stays visible; afterwards the radar and the aircraft table disappear and you answer from memory.

| Level | Aircraft | Window (min) | Time per picture | Pictures | Trap pairs (min) | Picture visible | Hints up to tier |
|---|---|---|---|---|---|---|---|
| 1 Warm-up | 2 | 5 | untimed | 8 | 0 | always | 3 |
| 2 Easy | 3 | 6 | 90 s | 8 | 0 | always | 3 |
| 3 Steady | 3 | 8 | 60 s | 10 | 1 | always | 3 |
| 4 Standard | 4 | 8 | 50 s | 10 | 1 | always | 3 |
| 5 Competitive | 4 | 10 | 40 s | 10 | 2 | always | 2 |
| 6 Hard | 5 | 10 | 35 s | 12 | 2 | always | 1 |
| 7 Elite | 6 | 10 | 28 s | 12 | 3 | always | none |
| 8 Extreme | 6 | 12 | 20 s | 12 | 4 | always | none |
| 9 Superhuman | 6 | 12 | 14 s | 12 | 5 | 10 s | none |
| 10 Impossible | 6 | 15 | 9 s | 15 | 6 | 6 s | none |

Dual-task load does not apply here (the input field needs the keyboard). Rules of the picture: level flight, constant heading and speed; loss only if lateral < 5 NM **and** vertical < 1000 ft (exactly 5.0 NM or 1000 ft is separated).

### Module 2: heading arithmetic

Angles are generated in steps of 10, 5 or 1 degrees. Question types: **recip** (reciprocal), **turn** (left/right by X), **wind** (ground speed with head/tail wind), **drift** (track by the 1-in-60 rule: drift = 60 × crosswind / TAS; wind from the right gives track = heading − drift), **tds** (time / distance / speed, 6 NM per minute at 360 kt). **Multi-step** questions chain turns, reversals and a final crosswind correction; the answer is always a whole number. "Wide" tds = any groundspeed in steps of 10 kt and up to 30 minutes.

| Level | Angle step | Types | Time per question | Questions | Multi-step share (steps) | tds numbers | Dual-task monitor | Hints up to tier |
|---|---|---|---|---|---|---|---|---|
| 1 | 10° | recip, turn | untimed | 15 | 0 | n/a | off | 3 |
| 2 | 10° | recip, turn | 20 s | 15 | 0 | n/a | off | 3 |
| 3 | 10° | recip, turn, wind | 15 s | 20 | 0 | n/a | off | 3 |
| 4 | 5° | all five | 12 s | 20 | 0 | round speeds | off | 3 |
| 5 | 5° | all five | 9 s | 20 | 0 | round speeds | off | 2 |
| 6 | 5° | all five | 7 s | 25 | 15 % (2) | wide | off | 1 |
| 7 | 1° | all five | 6 s | 25 | 30 % (2) | wide | off | none |
| 8 | 1° | all five | 5 s | 25 | 50 % (3) | wide | off | none |
| 9 | 1° | all five | 4 s | 30 | 80 % (3) | wide | on | none |
| 10 | 1° | all five | 3 s | 30 | 100 % (3) | wide | on | none |

### Module 3: fast categorization

Each round shows a rule set; objects (colour × shape) then appear one by one and you press the matching key (F left, J right; D far left, K far right with four categories). Rule complexity: 1 = two keys by colour; 2 = two keys, one colour against one shape; 3 = four keys by colour; 4 = four keys, two colours and two shapes. Only objects that match **exactly one** key are ever shown (the generator filters the pool), so no item is ambiguous or unassigned. From level 7 a share of objects has an **orange frame**: press the **mirrored** key (F↔J, D↔K); the mirror is a one-to-one map, so the item is still unambiguous. An object not answered within the time limit is a blank (its key is shown). The rule bar stays on screen up to level 6 and disappears after the intro from level 7.

| Level | Rule complexity | Time per object | Objects per round × rounds | Mirrored-key frames | Rule bar | Dual-task monitor | Hints up to tier |
|---|---|---|---|---|---|---|---|
| 1 | 1 | 5 s | 10 × 2 | 0 % | visible | off | 3 |
| 2 | 1 | 4 s | 12 × 2 | 0 % | visible | off | 3 |
| 3 | 2 | 3.5 s | 15 × 2 | 0 % | visible | off | 3 |
| 4 | 2 | 3 s | 15 × 2 | 0 % | visible | off | 3 |
| 5 | 3 | 2.2 s | 15 × 2 | 0 % | visible | off | 2 |
| 6 | 4 | 1.8 s | 20 × 2 | 0 % | visible | off | 1 |
| 7 | 4 | 1.5 s | 20 × 2 | 25 % | hidden | off | none |
| 8 | 4 | 1.2 s | 20 × 3 | 30 % | hidden | off | none |
| 9 | 4 | 1.0 s | 25 × 3 | 40 % | hidden | on | none |
| 10 | 4 | 0.7 s | 30 × 3 | 50 % | hidden | on | none |

Dual-task monitor: a MONITOR light in the header turns amber at random every 4 to 9 seconds for 1.6 s; press **Space** while it is amber. Hits, signals and false presses are reported separately on the result screen. Compare your main accuracy against a session without the monitor: the difference is your dual-task cost.

#### 150-object benchmark and rule changes in the middle of a block (batch b1123)

Mode **Referencia · 150 objetos · 1,8 s** (only in Categorías) is a fixed block that matches the length of the platform's sorting session (about 150 objects in 4.5 minutes) and the top-result target of the training protocol (at least 96 % at 1.8 s or less per object; an internal goal, not an official norm).

| Parameter | Value |
|---|---|
| Objects | 150 in one round, no level change inside the block |
| Rule set | complexity 4 (two colours, two shapes, keys D F J K), as level 6 |
| Time per object | 1.8 s; no answer in time = blank |
| Rule bar | shown at the start, then hidden |
| Rule changes | 4, at unannounced points: one per fifth of the block, jittered by up to 45 % of a fifth, never in the first 5 objects, at least 6 objects apart and at least 5 before the end |
| Change message | the new rule replaces the object for 3 s (keys ignored meanwhile), then the stream goes on |
| Mirrored frames, dual task, hints | none |

Report: accuracy (correct / 150; blanks count as errors), mean response time and mean of the slowest 10 % of responses (answered objects only), errors in the 5 objects right after each change versus the rest, a table per rule (objects, wrong, blank, errors after the change) and per rule type (colour or shape), and **whether the target was met** (accuracy ≥ 96 % and mean response ≤ 1.8 s). A benchmark never moves the adaptive level, the streak or the personal bests.

Custom mode has the slider **Cambios de regla por ronda** (0 to 4) with the same mechanism; when the rule bar is visible (hint tier 1 or more) it switches to the new rule after the message. The ten-level ladder is unchanged (mid-block changes only in the benchmark and in Custom).

## Hints (tiers 0 to 3)

Press **?** during play. Tier 0 = none. Tiers are available up to level 4 (tier 3), level 5 (tier 2), level 6 (tier 1); none from level 7 up. In Custom mode any tier can be chosen. A session that used any hint is recorded but is **not valid** for progression, personal bests or the streak (accuracy counts, the Valid column says No). Tier 3 shows the full solution and the item counts as blank.

| Module | Tier 1 nudge | Tier 2 method | Tier 3 full worked solution |
|---|---|---|---|
| Conflict detection | How many conflicting pairs there are | Candidate pairs (vertical < 1000 ft only) with their bearing rate and closing/opening | The conflicting pairs with CPA and loss start; the picture counts as blank |
| Heading arithmetic | Name of the technique (for example 1-in-60 rule) | Technique plus the numbers with the last step blanked | The worked solution and the answer; counts as blank |
| Fast categorization | (rule bar is visible anyway up to level 6) | After half of the time limit the correct key is highlighted | The correct key is highlighted at once (only when tier 3 is chosen) |

After every wrong arithmetic answer the worked solution is shown; after every picture the full solution table and drawing are shown: closest point of approach, time to CPA, vertical distance, bearing rate in degrees per minute (CBDR flagged when the bearing barely changes while the range shrinks), the loss interval, and the radar drawing with one-minute dots and 2.5 NM circles at the moment separation is first lost.

## Result screen, history and CSV

The result screen shows level and mode, correct / wrong / blank, seconds per item, accuracy, whether the goal was met, a plain statement of where the level sits (level 5 = target for Phase 2; 7 and above = beyond the competition), the personal best at this level (lowest seconds per item among valid sessions), your adaptive level, streak and highest unlocked level, and the dual-task report when on. Accuracy = correct / (correct + wrong + blank). Seconds per item = mean response time of answered items (blank items after a time-out are excluded).

History is stored in `localStorage` under the key `atc_radar_v2` (every read and write is inside try/catch; if the browser refuses, a warning shows and the data lives only while the tab is open). **CSV export**: separator `;`, decimal point, UTF-8 with BOM, columns `Date;Module;Level;Correct;Wrong;Blank;Seconds per item;Accuracy %;Goal;Met`. Date is `dd/mm/yyyy hh:mm`. The level column contains 1 to 10 or `Custom`; a benchmark row has level 6 and the module `Fast categorization [benchmark]`.

Benchmark sessions are stored with the others (same `sessions` list, same module name `Fast categorization`) and carry extra fields: `bench: true`, `mode: 'bench'`, `level: 6`, `target` (true / false), `changes` (number of rule changes), `rtMean` and `rtSlow10` (seconds), `post` and `rest` as `[objects, correct, wrong, blank]`, `byRule` as `[objects, correct, wrong, blank, post-change objects, post-change errors]` per rule, `byAttr` as `{color: [...], shape: [...]}`. A Custom session with rule changes stores the same fields except `bench` and `target`. Older sessions without these fields load unchanged. The dashboard reads the benchmark as a level-6 categorization session and shows it against the 150-object target.

## How to use it in the weekly plan

* Categorization: two to three 10-minute blocks a week; once a week (Sunday check) play one **Referencia · 150** block and compare it with the target.
* 3 to 4 sessions a week, 15 to 20 minutes each, on days you also do the other aptitude trainers. Alternate modules: for example Monday conflict detection + heading arithmetic, Wednesday categorization, Friday whichever module has the lowest accuracy.
* One session = one module at one level. Do not chase level 10: pass level 5 at 96 % repeatedly first, then treat 6 to 10 as margin.
* Play levels 1 to 4 mainly to build accuracy, then use Adaptive mode as the daily default. Do a dual-task session once a week from level 5 to measure the dual-task cost.
* If two sessions in a row fall below 96 %, go back down: do not fix accuracy by speeding up.

