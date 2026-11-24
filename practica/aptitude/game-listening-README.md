# ATC Listening and Dictation Trainer — README

File: `game-listening.html` (single file, vanilla JS/CSS, no dependencies, Spanish UI with English audio and questions, light and dark scheme, works by double-click in Chrome/Edge from `file://`). Companion of `aptitude-trainer.html` and `game-mental-math.html` (same look, same CSV convention, same manual-ladder / adaptive / custom pattern); this trainer owns aviation-English **listening and dictation**, which the other two do not cover.

## What it trains, and why

Phase 1's written English test (C1, 20 questions) is reading/grammar, but the oral C1 interview in Phase 3 and the ESTEL-style listening component folded into FEAST both demand something different: catching a fast, accented, radio-quality stream of aviation English once, under noise, and reconstructing it exactly — no rereading, no dictionary. This tool trains three layers:

1. **Element dictation** — call signs, headings, flight levels, QNH, frequencies, squawk codes, runway designators, and short chained clearances (a call sign plus several elements in one transmission, spoken with the connector words a controller would actually use: "turn heading…", "climb flight level…", "contact…"). This is the closest rehearsal of the read-back discipline FEAST/PDEA and the oral interview both reward: catch every element, in order, without re-listening.
2. **Passage comprehension** — short spoken weather reports, ATIS-style briefings, departure-clearance sequences and NOTAM-style notices, each followed by 2 multiple-choice comprehension questions with a single, independently-verified correct answer. This mirrors the listening-then-answer format of ESTEL-style tests and the "did you actually understand the transmission, not just transcribe it" skill the oral interview probes.
3. **Degraded conditions** — background noise (Web Audio white noise, gain scaled by level), reduced/zero replays, faster speech, accent rotation across whatever English voices are installed, and (from level 5) a dual-task mental-arithmetic load running in parallel — because FEAST measures performance under divided attention, and the real frequency is never studio-quiet.

A **visual fallback** (word-by-word display, same pace the level would have spoken) covers a machine with no installed English voice, so the trainer is never blocked by missing TTS.

4. **General English (menu card "Inglés general", key 3)** — the FEAST English listening test is general listening comprehension (news items, announcements, short talks, conversations; heard once, then comprehension questions), not radio phraseology. This module trains exactly that genre. See the section below.

## General-English comprehension (module 3)

Added in batch b1123 (audit `coord/b1123/findings/AAPT-aptitudes-feast.md`, section 3 row "FEAST English listening" and improvement 6).

- **Bank**: 45 original passages (`GEN_BANK` in the PURE LOGIC block), 15 per level, 171 questions. Kinds: news item, announcement, short talk, conversation between a woman and a man, instructions, weather, travel information. Neutral topics, invented places. Each passage has 3-5 questions with options A-D, one correct; the distractors are what a half-listening candidate would pick (the old gate, the other time mentioned, the inland temperature instead of the coast one, the frequency instead of the journey time).
- **Levels** (shown as N1-N3):

| Level | Name | Default speed | Words | Questions | What it asks | Stored `level` |
|---|---|---|---|---|---|---|
| N1 | Básico | 0.92× | 72-97 | 3 | facts stated once: numbers, times, places, reasons | 3 |
| N2 | Estándar (objetivo) | 1.00× | 97-121 | 4 | details among several similar ones, light inference | 5 |
| N3 | Exigente | 1.12× | 135-157 | 4-5 | attitude, implied meaning, small calculations (cost rise, rent difference, "tiny is generous") | 7 |

  The stored `level` is the equivalent rung of the shared 10-level ladder (level 5 = target everywhere), so the dashboard and the "Siguiente" engine score these sessions without any change on their side. N2 is called the target because it is natural speed with mixed literal and inference items; there is no published speed or item count for the real test.
- **Flow**: choose level, voice (only installed English voices are listed; "Probar" plays a test sentence), speed and number of passages. Each passage is spoken **once** (no replay button, as in the real test), sentence by sentence through `speechSynthesis`; the text stays hidden. Conversations use a voice of each speaker's gender when one is installed (guessed from the voice name), otherwise the chosen voice with a higher or lower pitch. Then the questions appear; answers can be changed until "Siguiente"; no right/wrong marks during the session. Unanswered questions count as blank.
- **Result**: correct / wrong / blank, accuracy (green from 90 %, the internal target of the AAPT protocol), seconds per question, goal, endurance line for long sessions, and a **review**: per passage the transcript and, per question, the answer given, the correct one and a one-line explanation (the quoted words that decide it, or the inference). Passages with a mistake are open; the rest are collapsed.
- **Passage choice**: never-seen passages of the level first, then the least recently seen (`comp.seen`, last 45 ids).
- **No English voice / no speech engine / engine that never starts**: the module says "Sin voz en inglés: lectura con tiempo" and offers the same passages as reading practice: the text is shown with a countdown (time the voice would take at about 160 words a minute, plus 5 s), then hidden when the questions appear. If the voice fails mid-session, that passage switches to reading. Reading sessions are stored with `mode:'reading'`, `level:null`, `count:false`, so neither the dashboard (needs a level) nor "Siguiente" (skips `count:false`) treats them as listening.
- **Stored data** (same key `atc_listening_v1`, same `sessions` list): `{ ts, module:'Passage comprehension: general English', level, mode, correct, wrong, blank, spi, accuracy, goal, met, rate, replays:0, thirds, comp:'general', cl }`. The module label starts with "Passage comprehension" on purpose: the dashboard's label regex files it under `lis.passage` (H5 English listening). Preferences live in `comp: { cl, n, voice, seen }`. Old stored data is read unchanged.
- **Tests** (outside the project, in the scratch folder of batch b1123): a Node check of the bank (four distinct options, one correct after shuffling, 60-170 words, chunks rebuild the text, correct option not systematically the longest) and a headless-Chrome run with `speechSynthesis` stubbed (one play, hidden text, stored shape, old data, reading fallback, silent engine, 375 px, console errors).

## The ten-level ladder

Levels are shared config for both modules; the passage module scales its item count down (`max(3, round(level items / 3))`) because a full passage takes longer to work through than a single dictation item. "Replays" is the number of *additional* listens allowed after the first (free) play — level 10 allows none, so the first play is the only one.

| Level | Name | Rate | Replays (+first) | Noise | Chain / elements | Dual-task load | Max hint | Dictation items | Meaning |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Warm-up | 0.72× | 3 | 0.00 | 1 | 0 | 3 | 8 | learn the sounds |
| 2 | Easy | 0.82× | 3 | 0.00 | 1 | 0 | 3 | 10 | build accuracy |
| 3 | Steady | 0.92× | 2 | 0.06 | 2 | 0 | 2 | 10 | below target |
| 4 | Standard | 1.00× | 2 | 0.10 | 2 | 0 | 2 | 12 | below target, accent variety starts |
| 5 | Competitive | 1.05× | 1 | 0.16 | 3 | 1 | 1 | 12 | **Phase 2 / oral target** — what a well-prepared candidate should reach |
| 6 | Hard | 1.15× | 1 | 0.22 | 3 | 1 | 1 | 14 | safety margin above target |
| 7 | Elite | 1.25× | 1 | 0.28 | 4 | 2 | 0 | 14 | beyond the competition (no hints from here) |
| 8 | Extreme | 1.35× | 0 | 0.36 | 4 | 2 | 0 | 16 | beyond the competition |
| 9 | Superhuman | 1.48× | 0 | 0.45 | 5 | 3 | 0 | 16 | stress training, failing it is expected |
| 10 | Impossible | 1.65× | 0 | 0.55 | 6 | 3 | 0 | 18 | calibrated so an excellent performer clears it under 96 % less than half the time (design intent, not a live measurement) |

Accent variety (rotating through every distinct English locale the browser reports as installed) turns on from level 4; below that the level stays on a single voice even if more are available, to keep the early levels predictable. With only one English voice installed, every level silently uses that one voice.

Full detail and the exam-relevance blurb per level are in-app under "Levels and goals" (menu key L).

### Adaptive mode
Starts at a chosen level (1-4). Progress is tracked in blocks (configurable size, default 10 items): a block needs 96 % or better to count as clean. After **N consecutive clean blocks** (N configurable, default 2) the level goes up by one; after **2 failed blocks** the level goes down by one, clamped at levels 1 and 10. **Every playback parameter — speed, noise, chain length, replays, dual-task load — is re-read from the live adapted level before each item**, so a level-up or level-down mid-session genuinely changes the next item's difficulty, not just the number reported on the result screen.

### Anti-acceleration rule (guards against speeding up and losing accuracy)
Before starting a session in **Ladder or Custom mode**, the setup screen compares the requested pace against the **last recorded session**. If that session ended below 96 % and the new request is faster (a higher ladder level, fewer replays, or — in Custom mode — a higher speech-rate slider), the Start button is blocked and a red box explains why; the candidate must explicitly tick "I understand, start anyway" to override. Slowing down, repeating at the same pace, or starting after a session that already met 96 % is always allowed without a warning. Adaptive mode enforces the same principle structurally instead (it can never level up on a failed block), so it does not additionally gate the Start button.

### Custom mode
Eight controls: speech rate, time limit per item (0 = untimed), item count, elements-per-item / distractor count, background noise, dual-task load, hint-level cap, and an accent-variety toggle. Custom mode always grants unlimited replays.

## Dictation element catalogue

- **Call sign** — either a UK-style registration (Golf + 4 ICAO letters, e.g. "G-ABCD") or an airline call sign (company name + 1-4 digits spoken individually, e.g. "Speedbird 3 7").
- **Heading** — 3-digit heading, each digit spoken with aviation pronunciation.
- **Flight level** — a level from FL10 to FL410 in steps of 10, spoken as 3 digits (no "FL" said aloud, matching real phraseology).
- **QNH / altimeter** — 4-digit hPa value, 950-1050.
- **Frequency** — 3-digit whole part (118-136 MHz) + "Decimal" + 3-digit fractional part, on real 25/8.33 kHz-style channel spacings.
- **Squawk** — 4 octal digits (0-7 only), as issued by ATC.
- **Runway** — 2-digit designator (01-36) with an optional Left/Centre/Right suffix.
- **Clearance chain** (from level 2 up) — a call sign followed by 1-5 further elements, joined with the connector words a controller would actually use ("turn heading…", "climb flight level…", "contact on…", "cleared runway…", "QNH…", "squawk…"). Scored **per element** (partial credit), exactly like a real read-back check: getting the call sign right but muddling the frequency shows up as a partial, not a wipeout.

Every element's `accept()` function is independent of its display text, so scoring is exact-match on the meaningful value (case/space/hyphen-insensitive), not string equality with the prompt.

## Passage templates (4, each generating exactly 2 verified MCQ)

- **Weather report** — wind direction/speed/gusts, visibility, cloud, temperature/dew point, QNH. Questions probe wind direction, QNH, wind speed, or temperature/dew-point spread.
- **ATIS-style briefing** — information letter, runway in use, wind, QNH, transition level, with the "report information X received" instruction. Questions probe the runway, the information letter, the transition level, or the QNH.
- **Departure clearance sequence** — call sign, destination, SID, initial cleared flight level, squawk, post-departure frequency. Questions probe destination, initial level, squawk, or frequency.
- **NOTAM-style notice** — affected runway, reason for closure, effective date range, daily hours. Questions probe the runway or the closing date.

Every question is built by `mkMCQ()` straight from the same data used to generate the spoken text (so there is never a mismatch between what was said and what is asked), and independently re-checked by `verifyMCQ()` — exactly one correct option, no duplicate option text — before it is ever shown. Options are shuffled per question.

## Hints (dictation module only)

Hint levels 0-3, capped per level (0 from level 7 up): **1 — nudge** (how many elements to expect and their labels); **2 — method** (the aviation digit-word table and the rule "write each digit as you hear it, do not wait for the group to finish"); **3 — full worked solution** (every element's exact expected value). The passage-comprehension module has no hints — the multiple-choice format with immediate right/wrong marking on each answer is the feedback loop there.

## Tips page (menu key T)

- **ICAO number pronunciation** (CAP 413, radiotelephony): the full 0-9 aviation word table (Zero, Wun, Too, Tree, Fower, Fife, Six, Seven, Ait, Niner), how a decimal point is spoken ("Decimal"), and when "Hundred"/"Thousand" are used for round figures.
- **ICAO phonetic alphabet**: the full A-Z table, used for call signs, runway/taxiway letters and ATIS information letters.
- **Holding a call sign under load**: write the company/registration the instant it is caught rather than waiting for the whole transmission; leave a gap on a missed digit rather than losing the next element by dwelling; "Say again" as the standard recovery phrase, mirrored in-app by the limited-replay mechanic; read-backs repeat safety-critical items in the order given, mirrored by the per-element chain scoring.
- **Note-taking shorthand** (a common working convention, not an ICAO standard): bare numbers for levels (`350` for FL350, `S040` for stop/climb at 4000 ft), 3-digit headings with no degree sign, frequencies with "decimal" and the leading "1" dropped (`27.350`), QNH as a bare 4-digit number, trend arrows (↑↓→), and common abbreviations (`hdg`, `clrd`, `twy`, `appr`, `sqwk`, `c/s`).

## Results, history and CSV

Every result screen shows: level, accuracy, seconds/item, personal best at that level (best accuracy and best speed among sessions ≥ 96 %), current streak (valid sessions in a row), and a plain sentence stating where the level sits against the exam (target / below / above / beyond the competition). Dual-task sessions additionally report the secondary-task hit rate. A numeric goal (accuracy %, seconds/item, or a correct-answer count, parsed from free text) is required before every session and is evaluated against the result.

History is kept in `localStorage` (all reads/writes wrapped in try/catch; the app still works, without persistence, if storage is blocked). CSV export uses `;` as separator, UTF-8 with a BOM, and columns `Date;Module;Level;Correct;Wrong;Blank;Seconds per item;Accuracy %;Goal;Met` — opens directly in Excel, same convention as `aptitude-trainer.html` and `game-mental-math.html`.

## Recommended use in the weekly plan

- **Daily, 10-15 minutes:** Element dictation, Ladder or Adaptive, single-task, levels 2-5 depending on current accuracy. Accuracy first: do not move to a higher level (or let Adaptive move you up) until 96 %+ is routine — the app enforces this for Ladder/Custom via the anti-acceleration rule, and structurally for Adaptive.
- **3x/week, 10-15 minutes:** Passage comprehension at the same level as your dictation work, to build "understood it, not just transcribed it."
- **Daily, 10 minutes (15 after Phase 1):** General English (module 3), 4 passages, N2 until 90 % is routine, then N3. This is the module that matches the FEAST English listening test; dictation and ATC passages are a complement, not a substitute.
- **2-3x/week, once level 5 dictation is comfortable single-task:** Dual-task at load 1-2, level 5-6. This is the closest thing in this tool to a FEAST-style divided-attention format (the resemblance is by design, not validated).
- **Weekly, one session:** No-voice check — if you install or change an English voice on Windows, run one session in each module with the "Use the detected voice instead" banner active to confirm real audio still plays.
- **Occasionally, for confidence and stress-testing:** levels 7-10, single-task, no hints, no replays. Expect low accuracy at 9-10 — that is by design, not a sign of regression.
- Always type a real numeric goal; never raise the speed/level after a sub-96 % session in Ladder or Custom mode without deliberately ticking the override — if the app is asking you to confirm, that is the rule working, not a bug.

