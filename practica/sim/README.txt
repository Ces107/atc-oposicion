ATC RADAR SECTOR SIMULATOR  (folder: state/atc/sim)
====================================================
A real, multi-file Python game (pygame-ce), not a single web page. You control a radar sector with up to ~30 aircraft
while interrupting tasks arrive: read-back checks, frequency transfers, alerts, level requests, memory and estimation
questions. It trains the skills that public descriptions of ENAIRE Phase 2 (FEAST II RADAR / MULTI-PASS, PDEA) say are
measured: conflict detection, planning, prioritising, divided attention, memory, speed-distance-time estimation.
It is NOT the official test and never reproduces its items. See DESIGN.md (sources and skill map) and TESTING.md.

INSTALL AND RUN (Windows)
-------------------------
1. Double-click run.bat. On the first run it creates a private virtual environment (.venv) and installs pygame-ce
   (needs Python 3.10+ and internet once). Later runs start immediately.
2. Or by hand:   py -3 -m venv .venv   ->   .venv\Scripts\pip install -r requirements.txt   ->   .venv\Scripts\python main.py
3. Tests (developers): .venv\Scripts\pip install pytest   then   .venv\Scripts\python -m pytest tests -q

Windows without Python: run ATC-Sim-Setup.exe (installs per user, no admin rights; uninstall from Apps or uninstall.bat).
Your results are saved per user in %LOCALAPPDATA%\ATC-Sim\sim_stats.json (macOS ~/Library/Application Support/ATC-Sim, Linux ~/.local/share/ATC-Sim);
nothing is written next to the program. E in the debrief or the statistics screen exports a CSV
(sim_export_<date>.csv in the same folder, UTF-8 with BOM, separator ";") with the project's columns:
Date;Module;Level;Correct;Wrong;Blank;Seconds per item;Accuracy %;Goal;Met

FIRST 3 MINUTES
---------------
Menu -> "Practice". It teaches, by making you do it: select an aircraft, read label and strip,
build a trial heading (the trial line turns green when it clears the conflict), send it, check the read-back, resume own
navigation, send an aircraft to its exit level, transfer communication, acknowledge an alert, answer a level request.
The clock is stopped during the first steps. Practice results are not saved.

CONTROLS
--------
Select            click an aircraft or its strip, or Tab / Shift+Tab
Heading           Left / Right = 5 degrees (Shift 10, Ctrl 1); or H + digits + Enter; or RIGHT-CLICK the scope = heading towards the cursor
Level             Up / Down = 1000 ft (Shift 2000, Ctrl 100); or F + digits (flight level) + Enter
Speed             + / - = 10 kt (Shift 20); or S + digits + Enter. Commanded speed is TRUE AIRSPEED (TAS); labels show GROUND speed
Send              Enter sends everything you changed as ONE instruction (2-3 s pilot delay). Esc cancels the trial, Esc again deselects
Resume            R = resume own navigation (direct to the next waypoint ahead)
Direct-to         Shift+click a fix on the scope with an aircraft selected (only fixes still ahead on its route; a plain click never sends anything)
Transfer          T (inside 20 NM of the exit gate), then the frequency key 1/2/3 shown on the task
Tasks             Y/N read-back, Space alert, A/D level request, 1-6 memory / estimates. Every button shows its key; you can also click
Spoken task       V + digits + Enter = the sum you heard;  M = the code you heard is the target. Traffic never stops
Pause             P (a paused run at level 5+ is marked "assisted" and does not move Adaptive mode)
Abandon           Q while paused (P, or Esc with nothing selected). Abandoned runs are not saved
Feedback          every task shows OK / WRONG / MISSED at the top of the scope the moment it is answered or expires
Other             F11 fullscreen, F1 help, mouse wheel scrolls the strip list. On a small screen (for example 1366x768) the game opens in a
                  smaller resizable window scaled to fit; F11 gives full screen. Esc in the main menu only highlights Quit (Q quits at once)

THE GAME IN ONE PARAGRAPH
-------------------------
Aircraft enter through 8 gates and follow airways through the sector SIERRA CENTRAL (fictional, 100 x 80 NM). Keep every pair
at least 5 NM apart OR 1000 ft apart. Each aircraft has an exit gate, an exit level (XFL, tolerance 200 ft) and a next frequency
printed on its strip. Wind moves aircraft: labels show GROUND speed and heading. Turns are limited by a 25 degree bank
(rate one at most), climbs by type performance. At levels 4+ a restricted area (R-31, "out of bounds") becomes active.
A misheard read-back that you do not catch is FLOWN by the aircraft. Every conflicting pair, handoff and task is one item
(Correct / Wrong / Blank). "Goal met" = accuracy at or above the level's goal AND zero losses of separation.

DIFFICULTY LADDER (level 5 is meant to be about the concurrent load described for the real tests: a calibration guess, not official)
------------------------------------------------------------------------------------------------------------------------------
Lvl Name         Aircraft  Clock  Wind  Designed   Task every  Time to   Aids  Zone  Goal
                                        conflicts  (real s)    answer
 1  Warm-up          4     x2.0    0       1          40        14 s      3    no    80%
 2  Easy             6     x2.5    0       2          32        12 s      3    no    85%
 3  Steady           9     x3.0    6       2          28        11 s      2    no    88%
 4  Standard        12     x3.5   10       3          24        10 s      2    yes   90%
 5  Competitive     16     x4.0   14       4          20         9 s      1    yes   90%
 6  Hard            22     x4.5   18       6          16         8 s      1    yes   88%
 7  Elite           28     x5.0   24       8          13         7 s      0    yes   85%
 8  Extreme         36     x5.5   28      11          11        6.5 s     0    yes   80%
 9  Superhuman      46     x6.0   34      15           9         6 s      0    yes   75%
10  Impossible      60     x6.5   40      20           7         5 s      0    yes   70%
Clock x N = simulated seconds per real second. "Designed conflicts" = pairs deliberately set on collision courses (measured by a
null run: the number of losses if nobody acts is higher at high levels, see TESTING.md). Peak aircraft on the scope at the same time
is about 4 (level 1), 12 (level 5) and 20-28 (level 10), depending on how well you clear them.
Aids: 3 = 2-minute vectors + alert colours + trial-heading check + dashed lines showing where each conflicting pair meets;
2 = vectors + alert colours + trial check; 1 = 2-minute vectors only; 0 = labels and trail dots only.

MODES
-----
Practice   the 3-minute tutorial (scripted, not saved).
Adaptive   starts at level 1. +1 level after 2 clean runs (levels 1-4) or 3 clean runs (level 5+); -1 after 2 failed runs in a row.
           "Clean" = goal met. Never raise the level before accuracy holds: consistency first, speed second.
Ladder     pick any level 1-10. Each run gets a new seed; in the debrief press R to retry the SAME seed (same traffic).

WHAT EACH MECHANIC TRAINS (details and sources: DESIGN.md)
----------------------------------------------------------
Conflict prediction and resolution   dynamic planning, "act early and little" (a 10 degree turn 4 minutes out beats 40 degrees at 1 minute)
Trial heading preview                what-if reasoning; also shows why a fix creates a new conflict
Read-back check                      error detection, attention to detail
Transfer of communication            rule application and procedure timing (handover)
Alert acknowledge                    vigilance (rare event among frequent ones)
Level request approve/deny           quick spatial-temporal projection (is it safe in the next 5 minutes?)
Priority recall                      working memory under load (list shown 6 s, asked 30-60 s later)
Time-to-conflict and ETA estimates   speed-distance-time arithmetic (kt / 60 = NM per minute)
Whole run                            prioritising, sustained attention (accuracy by thirds), protecting your weakest component

DEBRIEF
-------
Summary: score with every deduction, accuracy per component (the worst is highlighted), accuracy by thirds of the run, next step.
Losses: every loss of separation explained (when it was first predictable, every instruction given and how many seconds
before the loss, the smallest single turn that would have solved it at the first alert versus when you first acted, misheard
read-backs). Enter on a loss = replay (Space pause, Left/Right +-10 s, +/- speed, R restart).
Decisions: every wrong or blank task with the right answer and your response times. Handoffs: gate distance, level error, transfer.

BUILD THE DOWNLOADS (Windows, needs pygame-ce, pyinstaller, Pillow)
------------------------------------------------------------------
python tools/build_dist.py            ->  dist/ATC-Sim-Setup.exe (installer) and dist/ATC-Sim-source.zip
python tools/build_dist.py --skip-exe ->  source zip only.   tools/build_opo.py copies dist/ into the site (descargas/).

FILES
-----
main.py                entry point            atcsim/core/   pure simulation (no pygame): geometry, aircraft, prediction, generator, world,
run.bat                launcher               tasks, scoring, persistence, analysis, tutorial     atcsim/ui/   pygame screens
requirements.txt       pygame-ce              atcsim/bot.py  scripted controller used by the tests    tools/  drivers, profiler, calibration
DESIGN.md              research + skill map   tests/         pytest suite         TESTING.md   what was tested and how

KNOWN LIMITS (honest)
---------------------
* The level calibration and the skill mapping are inferences from public descriptions; nobody outside the test provider knows the real items.
* Sound is used only by the spoken secondary task (see the changelog of 2026-11-24); alerts are still visual only.
  The clips are Windows SAPI voices, clear but synthetic; the real tests' audio (voice, pace, content) is not public.
* The bot that validates difficulty uses perfect information; a human will be slower. Do not read "the bot meets the goal at level 7" as "level 7 is easy".
* Same seed = same traffic and same task sequence, but task timing depends on your frame timing, so tasks may appear a fraction of a second apart.


Changelog 2026-09-25 (wave 5)
-----------------------------
* Saved runs now include `thirds` (schema in coord/SCHEMA-thirds.md: three {n,c,b,s} groups, time thirds of the run; null when under 9 items; s is real seconds / 3 because the sim has no per-item seconds), plus `unneeded` and `commands`. Old sim_stats.json files load as before (missing fields become None / 0; malformed thirds are dropped). CSV unchanged.
* The debrief has an Endurance line (fade last vs first third, only with 8+ items in each).
* Paired-seed dual-task cost: on the debrief press B to replay the same seed and level in "Radar-only" mode (same traffic, no interrupting tasks; it never changes Adaptive mode, personal bests or the clean streak). The debrief then shows the accuracy gap on the radar items (separation, handoff, restricted area) versus the run with tasks, in points. Threshold 5 points at level 5 is a proposal from the wave-5 design spec, not an official cut-off. Caveat: the bot/human plays differently in the two runs, so with few items the number is noisy.
* Optional coach: if `atc_profile.json` exists in the per-user folder above ({"weakest": "H4", "suggestedSimLevel": 4, "abilities": {"H4": {"S": 61}}}) the menu shows one Coach line, and with no run history the Adaptive start level is the suggested level. Missing or malformed files are ignored silently. The sim's own adaptive rule stays authoritative.
* Tests: tests/test_wave5.py (10 tests).


Changelog 2026-11-24 (spoken secondary task)
--------------------------------------------
* While you control traffic, short SPOKEN items arrive (headphones or speakers). Two variants, one per run:
  Σ  digit sums: a tone, then 3-7 digits; type V, the sum, Enter.
  =  code match: a target code (ICAO letter + digits, e.g. KILO 4 7) is shown on the briefing and spoken at the start;
     codes are spoken now and then; press M only when the code is the target. Items = targets (hit / miss) + false presses;
     an ignored non-target is not an item, so doing nothing scores 0.
  The top bar shows the speaker (cyan = speaking, amber = answer now), Σ or the target, the key and a time bar.
* Menu row "Audio": Enter cycles auto / Σ / = / no; Left/Right (or the right end of the row) switches the voice ES / EN
  and plays a sample. "auto" (default) = on from level 5, sums on even seeds and codes on odd seeds. Radar-only runs never
  have it. Rate, length and answer window grow with the level (atcsim/core/audio_task.py, AUDIO_LEVELS).
* Debrief: accuracy and response time of the spoken task, apart from the radar score (it never changes items, score,
  goal or Adaptive). A = "audio solo": the same spoken items (same seed) with no traffic, saved as the single-task
  baseline; the debrief then shows the dual-task cost (solo accuracy minus accuracy with traffic, in points, and the
  extra response time). Esc leaves it without saving.
* Stats file: each run gains "audio" (null when off) and the file gains "audio_solo" and "settings"; older files load
  unchanged. CSV: one extra row per run with the task ("Spoken task: digit sums (with radar)", seconds per item = mean
  response time, Goal carries the dual-task cost) and one row per solo block ("... (solo)").
* Clips: assets/voice/<es|en>/*.wav, made offline by tools/make_voice.py with the Windows SAPI voices (no network);
  if a language has no voice, the script writes tone-coded clips instead and voice.json says "fallback": true.
* Tests: tests/test_audio_task.py (40 tests).
