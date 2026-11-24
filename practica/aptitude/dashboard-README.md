# ATC progress dashboard (`aptitude/dashboard.html`)

Single offline HTML file. Open it from disk in the same browser and profile you play the games in (Chrome or Edge): it reads the eight games' localStorage keys by itself, plus the 76-item aptitude mock (`atc_aptmock_v1`) when it exists. Nothing is sent anywhere.

## What it shows

- **Overview**: one "Do this next" card, readiness (weakest headline ability, mean shown beside it, never instead), the **aptitude composite in net items** when mock sessions exist, stage gates, ability bars with 80% confidence band, confidence chip, trend arrow, plateau and fade flags, last 7 days of play, and the **targets table**.
- **Trends**: per-ability session-score charts (ringed dot = level-5 benchmark) and weekly minutes per module.
- **Endurance**: accuracy first vs last third from the `thirds` field; "no data yet" when missing; only reported when both thirds hold 8+ items; Wilson 80% ranges and a Newcombe 80% range on the difference.
- **Max-load sessions**: Circuit-60 (benchmark or training, auto-ticks from saved sessions, manual log form, score and pass rule), Radar-block (needs `sim_stats.json`, weakest-link score), load-ramp counter, mock-day checklist with fatigue/stress log and first-45 vs last-45 minute readiness.
- **Data and export**: data-health panel (one row per game and one for the aptitude mock), drag-and-drop import (CSV exports, `sim/sim_stats.json`, backup JSON, `plan/metrics-sheet.csv`), "Backup all", restore, coach profile export.

## Model
Score per session `S = 14*EL` up to EL 5, then `70 + 10*(EL-5)`, capped 0-100, with `EL = level + clamp((acc-96)/8, -1.5, +0.5)`. Ability score = weighted mean over valid sessions of the last 42 days, weight `min(n,40)/40 * 0.5^(age/10)` times the module weight. Confidence from decayed pooled items (High 150+ and 3+ sessions, Medium 60+, Low). Interval = Wilson 80% at the modal level mapped through the score formula. Trend = Theil-Sen slope of the last 8 session scores (5+ sessions over 10+ days). Readiness = minimum discounted score (Medium -5, Low -10).

**Weight 0 (since batch b1123).** Dual n-back (`at.nback`, listed under working memory) and the Stroop-type task M7 (`mem.m7`, listed under multitasking) have weight 0: no public description of the real tests names them and their transfer is about nil, so their sessions never change an ability score, readiness, the stage gates or the "Do this next" card. They stay listed in the targets table (dimmed, "peso 0") with their current level, and their sessions still appear in the volume and data tables.

**Radar benchmark.** A 150-object categorization benchmark from the radar trainer (`bench: true`) is read as a level-6 categorization session in the model, and separately against its own target.

## Targets table
One row per trainer with the top-result target of the training protocol (internal goals, not official norms) next to the current level (latest valid session: level, accuracy, s/item). A tick means the target is met now:

| Row | Target | Met when |
|---|---|---|
| Aptitude mock, 76 items | net ≥ 60 | last mock net ≥ 60 |
| Abstract reasoning (mixed), spatial (mixed) | L6 · ≥96 % · ≤13 s / ≤18 s | last 3 valid sessions at L6+ in 42 days pool to ≥30 items, ≥96 %, item-weighted s/item within the limit |
| 3D rotation | ≥90 % · ≤3 s | same pooling, any level |
| d2 attention | L6 · errors ≤2 % | pooled accuracy ≥98 % at L6+ |
| Categorization · 150 | ≥96 % · ≤1.8 s | last benchmark (150 objects) |
| Fast categorization | L7 · ≥96 % | pooled at L7+ |
| Left/right | ≥95 % · ≤2.0 s · 100 items | pooled ≥100 items |
| Conflicts, heading arithmetic, memory M1 and M2, dictation | L6 · ≥96 % | pooled at L6+ |
| Passage comprehension | ≥90 % | pooled, any level |
| Python radar sim | L6 without separation loss in 3 of 4 | last 4 runs at L6+ |
| Mental-math dual task | cost ≤5 points at L5 | pooled L5 single minus pooled L5 dual accuracy |
| Dual n-back, M7 | weight 0 | never (listed only) |

## Aptitude composite (76-item mock)
Read from `atc_aptmock_v1` (`{"sessions":[{"ts":ms,"correct":n,"wrong":n,"blank":n,"net":x,"secs":n}]}`, written by `mock-aptitude.html`). The key may be absent (no figure, no error); an unreadable value shows a banner and a "problem" row in Data; a session without a date or a finite net is skipped and counted as rejected; a missing `net` is computed as `correct - wrong/3`. The figure shows the mean net of the last 3 mocks out of 76 and its approximate points, `50 * net / 72` (the best 2025 score, 50 points, corresponds to about 72 net items; an estimate from the published lists, not an official formula), with the target of 60 net.

## Coach profile for the sim
"Export coach profile" downloads `atc_profile.json`. Save it in `sim/`. Keys of `abilities` are like `H3 Planning-ATC`; `weakest` uses the same string (the sim's `coach.py` looks it up in `abilities`); `weakestId` carries the short id.

## Tests
`dashboard-test/core.test.js` (node, pure functions) and `dashboard-test/run_playwright.py` (Python Playwright, 1366 px and 375 px, every tab, fixtures with and without the mock key). The aptitude mock key is not part of "Backup all" (the account layer syncs it like every `atc*` key).

## Limits
Firefox gives each file its own storage: use the CSV/JSON import there. CSV has only the ten standard columns (no thirds, components or dual info). The Python sim cannot write to the browser: import its JSON. Two sessions of the same module with identical counts finished in the same minute are counted once (de-duplication key).
