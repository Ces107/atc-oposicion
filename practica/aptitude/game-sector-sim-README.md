# ATC Sector Simulator (`game-sector-sim.html`)

Single file, vanilla JS/CSS, no dependencies, English UI, keyboard-first, dark theme. Open it by double-click in Chrome or Edge (works from `file://`). The look and the CSV format follow `aptitude-trainer.html` (not edited).

## What it trains and why

A radar-style air-traffic-control sector: aircraft enter at boundary fixes, cross a network of routes, and must be kept at least **5 NM lateral or 1000 ft vertical** (separación de 5 NM o 1000 ft) apart and handed off at their exit fix (punto de salida) at the correct level. The player selects an aircraft and issues heading, level and speed instructions with buttons or keyboard shortcuts.

| Skill trained | What in the game | Where it maps (believed, not officially published) |
|---|---|---|
| Planning / conflict detection | Reading predicted tracks, spotting which pairs will lose separation in the next 2-6 minutes | FEAST II DART (Dynamic Air Traffic scenario, conflict prediction) and the PDEA sector-management exercises |
| Conflict resolution, "act early and little" | Turning the later aircraft away from the crossing point with the smallest instruction that works | The core controller technique the exam's practical/simulator stages are believed to reward |
| Prioritising | Deciding which of several simultaneous conflicts, tasks and a fuel emergency to handle first | FEAST II MULTI-PASS (multiple simultaneous tasks with different priorities) |
| Multitasking / dual-task cost | Frequency-change requests, read-back checks, system alerts and level requests interrupting the main radar task | MULTI-PASS and the PDEA's divided-attention component |
| Stability under load | Keeping accuracy up as traffic count, speed and interruption rate rise, without over-issuing instructions | The behavioural trait ENAIRE calls "resistance to stress / workload management" |

The mapping to the real tests is our own inference from public descriptions, not a confirmed match; the game teaches the underlying skills, not the exact test items.

## The sector

An 80 × 56 NM rectangle with 8 boundary entry/exit fixes (ROSAS, LUNAR, MIRLO, TAJO, BRAVA, ONDAS, SIRIO, PLAYA) and 5 internal waypoints, joined into 4 routes that all pass near the central fix MIDAS, so traffic converges there at every difficulty. Aircraft types: A320, B738, E190 (medium, 240-480 kt band), A333 (heavy, 260-490 kt) and AT72 (turboprop, 200-290 kt), each with its own turn rate (25° bank, capped at rate one = 3°/s), climb/descent rate (0.30-0.35 FL/s ≈ 1800-2100 fpm; AT72 slower) and acceleration (0.4-0.7 kt/s). Wind is a from/speed pair generated from the run's seed; it shifts ground track and speed (1-in-60-style vector wind, not just a scalar add-on).

## Controls

Click an aircraft or its strip to select it, or **Tab / Shift+Tab** to cycle, or a **digit 1-9 / 0** for the n-th strip. **Left/Right arrows** turn 10° (Shift = 20°, Ctrl = 30°). **Up/Down arrows** change level 10 FL (Shift = 20 FL). **+ / -** change speed 10 kt (Shift = 20 kt). **R** resumes own navigation (direct to the next waypoint ahead on the route). **H / L / S** then digits then **Enter** type an exact heading, level or speed (Esc cancels). **Space** acknowledges a system alert. **Y / N** answer a read-back check. **A / D** approve/deny a level request. **Z X C** pick a frequency option. **?** shows the next hint tier. **P** pauses (levels 1-3 only). **Esc Esc** abandons the run. The same list is always visible on screen under "Keyboard shortcuts".

## How to think (also shown in-game)

1. Scan by time, not by position: list pairs that share a level (within 1000 ft) whose tracks cross or overlap in the next 3-5 minutes.
2. **Crossing-point-first rule:** find where two tracks cross and who arrives first; turn the one that arrives *second* early, away from the point, or slow it.
3. **Constant bearing, decreasing range (CBDR, rumbo constante y distancia decreciente):** if the bearing from A to B stays fixed while range shrinks, they will meet; any track or speed change breaks it.
4. Prioritise the most imminent conflict; keep scanning ahead while it plays out.
5. **Act early and little:** a 20° turn four minutes out does the same job as a 60° turn one minute out, for less delay and less risk of causing a new conflict. The per-run report compares the turn size needed at the first alert against the turn size needed when you actually acted, for every conflict.
6. Stabilise after a fix: press **R** to resume navigation, check the exit level, then leave the aircraft alone — every extra instruction is workload and a possible new conflict.
7. Interruption priority order: separation first, fuel emergency second, read-back errors third, alerts/frequency changes last but never forgotten.

## Modes

* **Manual ladder:** pick any of the 10 levels (table below), with seeded-random traffic (type a seed or draw a new one) or one of the 10 scripted scenarios.
* **Adaptive:** starts at level 1. Goes up after **2 consecutive successes at levels 1-4, 3 at level 5 or above** (success = accuracy ≥ 96 % **and** zero separation losses). Goes down one level after **2 failures in a row**. Never advises raising speed while accuracy is below 96 % — speeding up before accuracy is solid is the classic trap, and the report screen states this rule explicitly every time.
* **Custom:** sliders for aircraft count, simulated speed multiplier, wind, entry points, conflict density, unpredictability (late/unannounced entries), extra-task load with a dual-task on/off switch, aid level (0-3) and hint level (0-3). Custom sessions are recorded but do not move the ladder or the adaptive state.
* A numeric **goal** (e.g. `96 %`, `0 losses`, `score 80`, `20 correct`) must be typed before every run; the report states whether it was met.

## The ten-level ladder

Level 5 (Competitive) is the level a well-prepared candidate should master — the target for Phase 2. Levels 7 and above are beyond the competition. Level 10 (Impossible) is calibrated to be nearly unmanageable: even an excellent performer should clear it clean less than half the time. **Note from testing:** even at level 1 the traffic generator deliberately places later aircraft on a collision course with an earlier one (`bias` = share of aircraft placed in conflict; it is 100 % at level 1 and never below 60 %) — "Warm-up" means slow aircraft, full predicted-track aids and a full hint budget, not "no conflicts to solve." The player is expected to act at every level; the ladder makes acting easier or harder, not optional.

| Level | Name | Aircraft | Speed×* | Wind (kt) | Entry points | Late/unannounced | Task load /min | Fuel emergencies | Aids | Hint cap | Pause |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Warm-up | 3 | 2.5x | 0 | 2 | 0 % | 0 | 0 | 3 (full) | 3 | yes |
| 2 | Easy | 5 | 3.0x | 0 | 3 | 0 % | 1 | 0 | 3 | 3 | yes |
| 3 | Steady | 7 | 3.5x | 5 | 4 | 10 % | 1.5 | 0 | 2 | 2 | yes |
| 4 | Standard | 10 | 4.0x | 10 | 5 | 20 % | 2 | 0 | 2 | 2 | no |
| 5 | Competitive | 14 | 5.0x | 15 | 6 | 30 % | 3 | 1 | 1 | 1 | no |
| 6 | Hard | 18 | 6.0x | 20 | 7 | 40 % | 3.5 | 1 | 1 | 1 | no |
| 7 | Elite | 24 | 7.0x | 25 | 8 | 50 % | 4 | 2 | 0 (none) | 0 | no |
| 8 | Extreme | 30 | 8.0x | 30 | 8 | 60 % | 5 | 2 | 0 | 0 | no |
| 9 | Superhuman | 38 | 9.0x | 38 | 8 | 70 % | 6 | 3 | 0 | 0 | no |
| 10 | Impossible | 48 | 10.0x | 45 | 8 | 80 % | 7 | 3 | 0 | 0 | no |

\* "Speed×" is how many simulated seconds pass per real second (a busier run without a longer real-world session). Aids: **3** = predicted track lines out to 6 minutes ahead + conflict alert (list and connecting lines) + a 5 NM ring around the selected aircraft; **2** = 4-minute tracks + alert + ring; **1** = 2-minute tracks + ring, no alert list; **0** = nothing, the player must judge geometry unaided. Task load/min = extra interrupting tasks (frequency change, read-back check, system alert) generated per **real** minute; system-alert tasks start at level 2, frequency-change tasks join from level 3, read-back checks are tied to giving instructions from level 4, and level-request tasks and fuel emergencies start at level 5. "Late/unannounced" is the share of aircraft that appear with no advance notice on the strip list (versus the full notice window at level 1-2).

Scripted scenarios 1-4 are hand-built (one crossing, two crossings, an overtake plus exit-level changes, a climb through traffic); scenarios 5-10 use fixed seeds with every route forced through the MIDAS hub, at rising levels 5-10 parameters, for a repeatable "hub" stress test. Both scripted and seeded-random traffic are fully deterministic: the same seed and level always produce the same aircraft, so a run can be replayed and compared (the report screen's "Watch replay" button re-plays your own recorded commands over the same traffic at 2x).

## Hints (0-3)

Press **?**; each press advances one tier for the currently most urgent conflict (or explains there is none within 5 minutes). 0 = no hints. 1 = nudge: names the conflicting pair and time to loss. 2 = method: which aircraft reaches the crossing point first/second, the bearing rate and whether it is CBDR, restates the crossing-point rule. 3 = full worked solution: the exact smallest resolving turn (degrees, direction, resulting heading) computed by the same conflict-search function the report uses to grade you, or a level-change fallback if no single turn up to 90° works. Hints are capped per level (see table) and unavailable from level 7 up; Custom mode allows any tier 0-3 regardless of its other settings.

## Scoring and the report screen

Score starts at 100 and subtracts: separation losses (heaviest: ~12-25 points per episode depending on how deep the loss went), poor handoffs (wrong exit fix or exit level), delay (extra transit time versus the direct-route ideal), unnecessary instructions (given to an aircraft with no predicted conflict, not needed for its route/exit level, and not just repeating an already-set value), instruction bursts (6+ commands inside a 12-simulated-second window — a proxy for panic-clicking) and missed/wrong extra tasks. **Accuracy** = correct / (correct + wrong + blank) across handoffs and every extra task combined; **a run only counts as a clean success at ≥ 96 % accuracy AND zero separation losses.**

The per-run report shows, for **every** predicted conflict: the pair, when it was first flagged, every instruction either aircraft received and how many simulated seconds before the loss it was, the outcome (resolved / lost / never seen), and the "act early and little" lesson — the smallest turn that would have worked at the moment of the first alert versus the smallest turn that would have worked at the moment the player actually acted (both computed independently by the same closest-point-of-approach search used to generate hints, so the lesson is not just an opinion). It also lists every extra task with response time, every handoff with its offset from the exit fix and level error, workload peaks (a load index combining aircraft on scope, pending tasks and active alerts), personal bests per level, the clean-run streak, and the anti-acceleration statement (raise speed only once accuracy is at or above 96 % with no losses).

## History and CSV

History is stored in `localStorage` under the key `atc_sectorsim_v1` (every read/write wrapped in try/catch; a warning is shown if the browser refuses, and the run still plays from memory for that tab). **CSV export**: separator `;`, UTF-8 with BOM, columns `Date;Module;Level;Correct;Wrong;Blank;Seconds per item;Accuracy %;Goal;Met` (the same fixed column set used across all trainers). Date is `dd/mm/yyyy hh:mm`. Level is 1-10, or 0 for Custom mode entries (module name says "(custom)").

## How to use it in the weekly plan

* 2-3 sessions a week, 15-25 minutes each (one scripted scenario plus one or two random runs), alongside the other aptitude trainers rather than instead of them.
* Start on the scripted scenarios (1-4) to learn the sector layout and the crossing-point rule without random variance, then move to seeded-random runs.
* Use Adaptive mode as the default once scenario 4 feels comfortable; it will not let you skip ahead of your own accuracy.
* Treat level 5 as the real goal; levels 6-10 are optional margin, useful to build composure under a workload the real test will not reach.
* If a run's accuracy is below 96 % or it lost separation, repeat the same level (or the same seed, to isolate what went wrong) before going faster — the report's speed-advice line enforces this reasoning even in Custom mode.

