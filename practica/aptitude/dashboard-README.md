# ATC progress dashboard (`aptitude/dashboard.html`)

Single offline HTML file. Open it from disk in the same browser and profile you play the games in (Chrome or Edge): it reads the eight games' localStorage keys by itself. Nothing is sent anywhere.

## What it shows

- **Overview**: one "Do this next" card, readiness (weakest headline ability, mean shown beside it, never instead), stage gates, ability bars with 80% confidence band, confidence chip, trend arrow, plateau and fade flags, last 7 days of play.
- **Trends**: per-ability session-score charts (ringed dot = level-5 benchmark) and weekly minutes per module.
- **Endurance**: accuracy first vs last third from the `thirds` field; "no data yet" when missing; only reported when both thirds hold 8+ items; Wilson 80% ranges and a Newcombe 80% range on the difference.
- **Max-load sessions**: Circuit-60 (benchmark or training, auto-ticks from saved sessions, manual log form, score and pass rule), Radar-block (needs `sim_stats.json`, weakest-link score), load-ramp counter, mock-day checklist with fatigue/stress log and first-45 vs last-45 minute readiness.
- **Data and export**: data-health panel, drag-and-drop import (CSV exports, `sim/sim_stats.json`, backup JSON, `plan/metrics-sheet.csv`), "Backup all", restore, coach profile export.

## Model
Score per session `S = 14*EL` up to EL 5, then `70 + 10*(EL-5)`, capped 0-100, with `EL = level + clamp((acc-96)/8, -1.5, +0.5)`. Ability score = weighted mean over valid sessions of the last 42 days, weight `min(n,40)/40 * 0.5^(age/10)` times the module weight. Confidence from decayed pooled items (High 150+ and 3+ sessions, Medium 60+, Low). Interval = Wilson 80% at the modal level mapped through the score formula. Trend = Theil-Sen slope of the last 8 session scores (5+ sessions over 10+ days). Readiness = minimum discounted score (Medium -5, Low -10).

## Coach profile for the sim
"Export coach profile" downloads `atc_profile.json`. Save it in `sim/`. Keys of `abilities` are like `H3 Planning-ATC`; `weakest` uses the same string (the sim's `coach.py` looks it up in `abilities`); `weakestId` carries the short id.

## Limits
Firefox gives each file its own storage: use the CSV/JSON import there. CSV has only the ten standard columns (no thirds, components or dual info). The Python sim cannot write to the browser: import its JSON.
