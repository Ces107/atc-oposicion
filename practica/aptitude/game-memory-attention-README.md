# Memory and attention gym (working memory, vigilance, task switching, interference)

File: `game-memory-attention.html` (single file, no dependencies, double-click in Chrome/Edge, English UI, keyboard first, same dark look as `../aptitude-trainer.html` and `trainer-matrices.html`).

## What it trains and why
Seven modules, each mapped to a controller cognitive skill and to a part of the selection process:

| Module | What it trains | Where it matters |
|---|---|---|
| 1. Flight strip recall | working memory for call signs, level, heading and next fix, held across a filled delay | the core of live control: holding several aircraft's data while doing something else; proxy for Phase 2 working-memory items and for real R/T |
| 2. Digit / letter span | verbal working-memory span (forward, backward, sequenced) under articulatory/arithmetic interference | classic working-memory-span paradigm used in aptitude and neuropsychological batteries; the aptitude test (Phase 1) and FEAST/PDEA (Phase 2) both load on span |
| 3. Read-back checker | "hearback": comparing a clearance and a pilot read-back field by field and spotting the error | a named ATC skill (hearback) and a frequent PDEA/FEAST item family: level/heading digit transpositions and similar call signs |
| 4. Instruction execution without rereading | executing a multi-step instruction from a single hearing, in order, without seeing it again | real R/T is heard once; FEAST II and the PDEA are believed to use exactly this "read once, act in order" format |
| 5. Vigilance | sustained attention: detecting a rare event over a long, low-stimulus run | classic vigilance-decrement paradigm; controllers must catch rare deviations during long quiet periods |
| 6. Task switching | changing rule mid-stream and the extra cost of a switch versus a repeat | controllers constantly switch between separation, sequencing and communication sub-tasks; switch cost is a standard executive-function measure used in aptitude testing |
| 7. Stroop-like interference | responding to one dimension (colour) while ignoring a conflicting one (word), with aviation stimuli (CLIMB/DESCEND/HOLD) | interference control / inhibition, a core executive-function construct; the aviation framing keeps it close to the R/T vocabulary |

ENAIRE doesn't publish the exact content of its aptitude test, FEAST II or the PDEA; these are proxies built from the published skill names (working memory, vigilance, task switching, interference control), not copies of any real item.

Every module also reports **accuracy by third of the session** (a fatigue curve), because the real risk is endurance rather than raw ability: a level you can pass in the first third but not sustain to the last third is the actual weak point to train.

## The 10-level ladder
Names and thresholds are shared with the other trainers: 1 Warm-up, 2 Easy, 3 Steady, 4 Standard, 5 Competitive (target for Phase 2), 6 Hard, 7 Elite, 8 Extreme, 9 Superhuman, 10 Impossible (calibrated so even a strong performer clears it at 96 % less than half the time). Hints (0-3) are available up to level 6 only; from level 7 up there is no hint button. The 96 % pass threshold and the anti-acceleration rule (never advise more speed while accuracy is below 96 %) are the same across every module. Full per-level parameter tables are also shown live in the app under "The 10 levels: parameters" for the selected module; the values below are the ones baked into the code (`M1_P` .. `M7_P`).

### Module 1 - Flight strip recall

| Level | Flights shown | Display time/flight | Distractor | Probes asked | Similar-callsign lures |
|---|---|---|---|---|---|
| 1 | 3 | 3.0 s | a silent pause, 3 s | 1 | 0 % |
| 2 | 3 | 2.6 s | a silent pause, 5 s | 2 | 0 % |
| 3 | 4 | 2.3 s | mental arithmetic, 6 s | 2 | 20 % |
| 4 | 5 | 2.1 s | mental arithmetic, 8 s | 3 | 30 % |
| 5 | 5 | 1.9 s | mental arithmetic, 9 s | 3 | 40 % |
| 6 | 6 | 1.7 s | mental arithmetic, 10 s | 4 | 50 % |
| 7 | 7 | 1.5 s | mental arithmetic, 11 s | 4 | 60 % |
| 8 | 8 | 1.3 s | mental arithmetic, 12 s | 5 | 70 % |
| 9 | 9 | 1.1 s | mental arithmetic, 13 s | 5 | 85 % |
| 10 | 10 | 1.0 s | mental arithmetic, 14 s | 6 | 100 % |

Each probe asks either "what was field X of callsign Y" or, in reverse, "which callsign had level/heading/fix Z" (4 options, exactly one correct). The mental-arithmetic distractor's own accuracy is reported separately in the results screen as an interference-load indicator; it is not scored into the main accuracy.

### Module 2 - Digit / letter span

| Level | Length | Alphabet | Order | Distractor |
|---|---|---|---|---|
| 1 | 3 | digits | forward | no |
| 2 | 4 | digits | forward | no |
| 3 | 5 | digits | forward | yes |
| 4 | 4 | digits | backward | no |
| 5 | 5 | digits | backward | yes |
| 6 | 5 | digits | sequenced (ascending) | yes |
| 7 | 6 | letters | forward | yes |
| 8 | 6 | letters | backward | yes |
| 9 | 7 | letters | sequenced | yes |
| 10 | 8 | digits+letters | random order each trial | yes |

Symbols are shown one at a time (900 ms each, independent of level: the span length itself is the load, as in standard span tasks). The letter set excludes vowels to avoid accidental words. The distractor is one mental-arithmetic problem inserted between encoding and recall (an articulatory-suppression stand-in).

### Module 3 - Read-back checker

| Level | Fields in the clearance | Chance of an error | Similar-callsign errors | Subtle numeric errors (e.g. FL180 vs FL108) |
|---|---|---|---|---|
| 1 | 2 (callsign, level) | 50 % | 0 % | no |
| 2 | 2 | 50 % | 20 % | no |
| 3 | 3 (+heading) | 50 % | 30 % | no |
| 4 | 3 | 50 % | 40 % | yes |
| 5 | 4 (+frequency) | 50 % | 50 % | yes |
| 6 | 4 | 50 % | 60 % | yes |
| 7 | 4 | 55 % | 70 % | yes |
| 8 | 5 (+speed) | 55 % | 80 % | yes |
| 9 | 5 | 60 % | 90 % | yes |
| 10 | 5 | 60 % | 100 % | yes |

One of: correct / callsign / level / heading / frequency / speed is the answer, always exactly one. Subtle errors are digit transpositions or +-10 (FL180 vs FL108, heading 270 vs 027) rather than gross changes, which is the realistic hearback trap.

### Module 4 - Instruction execution without rereading

| Level | Steps in the instruction |
|---|---|
| 1 | 2 |
| 2-3 | 3 |
| 4 | 4 |
| 5-6 | 5 |
| 7 | 6 |
| 8-9 | 7 |
| 10 | 8 |

Steps are drawn from: level change, heading change, frequency change, speed change, squawk code, direct-to fix. The instruction is shown once for `max(4, steps x 2.2)` seconds, then hidden; the steps are then asked back **in order**, one MCQ per step, without the instruction reappearing.

### Module 5 - Vigilance

| Level | Trials | Inter-stimulus interval | Target rate | Near-miss decoys (square vs the triangle target) |
|---|---|---|---|---|
| 1 | 60 | 1200 ms | 15 % | no |
| 2 | 80 | 1100 ms | 13 % | no |
| 3 | 100 | 1000 ms | 11 % | no |
| 4 | 120 | 950 ms | 10 % | no |
| 5 | 150 | 900 ms | 9 % | no |
| 6 | 180 | 850 ms | 8 % | yes |
| 7 | 210 | 800 ms | 7 % | yes |
| 8 | 240 | 750 ms | 6 % | yes |
| 9 | 280 | 700 ms | 5 % | yes |
| 10 | 320 | 650 ms | 4 % | yes |

Most stimuli are a plain circle; press SPACE only for the rare triangle. From level 6 a near-identical square decoy is mixed in to raise false-alarm risk. Each shape is visible for at most 500 ms and then the screen is blank until the next one (the ISI is the time you have to respond). Results report hit rate, false alarms and average reaction time to targets. **Accuracy (since 2026-09-25) = hits / (targets + false alarms)**; correct rejections are not counted, so doing nothing scores 0 % (before, it scored about 90 %). The number of targets is exact (rate x trials, at least 3 in a full session, never two closer than 3 trials).

### Module 6 - Task switching

| Level | Trials | Switch probability | Inter-stimulus interval | Response window |
|---|---|---|---|---|
| 1 | 24 | 30 % | 0 ms | 4000 ms |
| 2 | 32 | 35 % | 0 ms | 3200 ms |
| 3 | 40 | 40 % | 200 ms | 2600 ms |
| 4 | 48 | 45 % | 200 ms | 2200 ms |
| 5 | 56 | 50 % | 150 ms | 1900 ms |
| 6 | 64 | 50 % | 150 ms | 1600 ms |
| 7 | 72 | 55 % | 100 ms | 1400 ms |
| 8 | 80 | 55 % | 100 ms | 1200 ms |
| 9 | 90 | 60 % | 80 ms | 1050 ms |
| 10 | 100 | 60 % | 60 ms | 900 ms |

Two rules alternate unpredictably: parity (odd/even) and magnitude (low 1-4 / high 6-9), digit 5 excluded as ambiguous. F/J answer the two categories of whichever rule is currently in force. Results report accuracy and reaction time split by repeat vs switch trials, and the **switch cost** (switch RT minus repeat RT) headline figure.

### Module 7 - Stroop-like aviation interference

| Level | Trials | Incongruent-trial ratio | Response window |
|---|---|---|---|
| 1 | 24 | 25 % | 3000 ms |
| 2 | 30 | 30 % | 2600 ms |
| 3 | 36 | 40 % | 2200 ms |
| 4 | 42 | 45 % | 1900 ms |
| 5 | 48 | 50 % | 1600 ms |
| 6 | 54 | 55 % | 1400 ms |
| 7 | 60 | 60 % | 1200 ms |
| 8 | 66 | 65 % | 1000 ms |
| 9 | 72 | 70 % | 850 ms |
| 10 | 80 | 75 % | 700 ms |

Words CLIMB / DESCEND / HOLD are shown in green / red / amber ink, each colour also meaning climb / descend / hold. Respond to the **ink colour** (G/R/A), ignoring the word; on incongruent trials word and colour disagree. Results report accuracy and RT split congruent vs incongruent, and the **interference** headline figure (incongruent RT minus congruent RT).

## Modes (all seven modules)

- **Manual**: choose the level (1-10); session length defaults per module (6 rounds for modules 1 and 4, 15 trials for module 2, 20 items for module 3, and the level's own trial count for modules 5-7).
- **Adaptive**: starts at level 2. Every block (5 items for modules 1-4, 10 trials for modules 5-7) at 96 % or more accuracy counts as a success; two blocks in a row go up one level; two blocks below 75 % go down one level; in between keeps the level and resets the streak. The level can change **within** a single run (a new block of items/trials is generated at the current level), and the final reported level is the rounded average across the run. Never recommends more speed while accuracy is below 96 %.
- **Custom**: sliders for base complexity (1-10, reuses that level's table), session length (module-specific range), a time-limit slider (answer time budget for modules 1/3/4; a soft nudge for module 2; inter-stimulus interval for module 5; response window for modules 6-7), and a "distractor / dual-task load" checkbox that forces the interference component harder than the base level would (heavier arithmetic/similarity for modules 1-3, more decoys for module 5, a higher switch/incongruent rate for modules 6-7; module 4 is unaffected, since its only difficulty axis is step count).
- **Hints** (modules 1-4 only, levels 1-6): 1 = nudge, 2 = method, 3 = full worked solution (the item then counts as blank, same convention as the other trainers). Modules 5-7 run in real time with no pause to give a hint, so the hint selector is hidden for them.
- **Goal**: a numeric goal is required before every session (`96 %`, `15 s`, `18 correct`, or combined). Met/Not met is stored and shown.
- **Results screen**: accuracy, average time per item, goal met/not, streak of sessions at 96 % or more **for that module**, personal best per level (manual mode only), a module-specific extra block (distractor accuracy for module 1; hit rate/false alarms/RT for module 5; switch cost and repeat-vs-switch breakdown for module 6; interference and congruent-vs-incongruent breakdown for module 7), the anti-acceleration recommendation, the plain level statement (level 5 = Phase 2 target, 7+ beyond the competition), and the **accuracy-by-third table** with an endurance-dip note when the drop from first to last third exceeds 8 points. The seed is shown; entering it again in the menu replays the same items/trials.

## History and CSV
localStorage key `atc_memattn_v1` (all access wrapped in try/catch; the app warns if it is unavailable and keeps working for the current tab only). CSV: `;` separator, UTF-8 with BOM, columns `Date;Module;Level;Correct;Wrong;Blank;Seconds per item;Accuracy %;Goal;Met`, one row per session across all seven modules (the Module column names the module and, outside manual mode, appends `[adaptive]` or `[custom]`).

## Recommended use in the weekly plan

- 3-4 short sessions a week, 8-12 minutes each, rotating modules rather than repeating one (working memory and read-back on R/T-heavy days; vigilance and task switching on days aimed at the computer-based Phase 2 tests).
- Module 5 (vigilance) is the one meant to run **longer**: schedule at least one weekly session at level 5+ end to end (2.5-5 minutes of trials) without pausing, specifically to train the endurance dip the accuracy-by-third table exposes.
- Reach 96 % at level 5 in every module before spending time on 6+; levels 7-10 are stress tests, not a place to judge yourself.
- After a module-1/3/4 session, skim the item-level pattern (which field or step type failed) rather than only the headline accuracy: the read-back checker and instruction-execution modules are meant to surface *which kind* of R/T detail gets lost, not just how often.

