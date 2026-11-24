# Aptitude test mock (`mock-aptitude.html`)

Single file, vanilla HTML/JS/CSS, Spanish UI, works by double-click (file://). A full mock of the Phase 1 aptitude test
(prueba de aptitudes) in its real format: 76 items, options A-D, one timed block, wrong answers penalised. Every start
builds a fresh form; the same form can be printed and done on paper.

## Verified and assumed

| | Status | Source |
|---|---|---|
| 76 items, options A-D, a different form each day, paper | verified | 2025 call, correction templates (Anexo I, plantillas Fase 1) |
| Measures "atención, razonamiento espacial y razonamiento abstracto, entre otros aspectos"; max 50, pass 25 | verified | 2025 bases, p. 10 |
| Mark = best score of the call is worth 50 ("puntuación máxima obtenida por la muestra presentada") | verified wording | 2025 bases, p. 10 |
| Net = correct − wrong / 3, blanks 0; best net 2025 ≈ 72.01 of 76 | inferred | the published 2025 marks fall on a lattice of 50/216 points (audit of the 2025 result lists) |
| ≈ 60 net = top of the ranking (top-20 median ≈ 40.5 points ≈ 58 net); pass 25 = 36.0 net | derived | same audit |
| Item types and mix | assumed | not published; follows the audit's interim mix (abstract, spatial, attention/series) |
| 60 minutes | assumed | not published (the four Phase 1 tests take ≥ 4 h 30 min together); audit training protocol |
| Order in family blocks, easy to hard | assumed | common paper-battery layout |

## The form

| Block | Items | Generator | Levels |
|---|---|---|---|
| Abstracto | 25: matrix 9, logic matrix 5, analogy 6, odd one out 5 | `trainer-matrices.html` (copied) | 3-7 |
| Series | 13 figure series | `trainer-matrices.html` (copied) | 3-7 |
| Espacial | 25: 3D rotation, cube net, 2D rotation/mirror, paper folding, views, 5 each | `trainer-spatial.html` (copied) | 3-7 |
| Atención | 13: d2 count 7 ("¿cuántas d con dos rayas?"), code comparison 6 ("¿cuántas parejas son distintas?") | new, d2 symbol pools of `aptitude-trainer.html` | row length / pairs grow with level |

- The generators and drawing code are copies (inside `MX` and `SP`); only hints and difficulty scores were removed. A
  node cross-check gives the same items as the trainers for the same seeds.
- Every item has exactly one correct option, checked by the trainers' independent solvers (matrices, spatial) or by an
  independent recount (attention); the form is rejected otherwise. Each distractor is wrong for one stated reason
  (one broken rule, mirror image, moved cube, missed fold, p counted as d, missed difference...).
- Correct letters are balanced: 19 A, 19 B, 19 C, 19 D per form.
- A form is fixed by its 6-character code (last character is a check character), so a printed form can be corrected later.

## Use

- **Simulacro**: one 60-minute block, clock counting down (orange under 5 min, red under 1), automatic hand-in at 0.
  Free navigation (arrows or the number grid), change or clear any answer, **Marcar** flags an item (orange corner in the
  grid). Keys: A-D or 1-4 answer (same key again clears), ← →, M flag, Esc leaves (the mock stays open: **Continuar**).
- **Imprimir**: the form in two columns, an answer sheet (76 × A-D) on its own page and the key on the last page (hidden on
  screen). **Corregir hoja**: type the code, mark the sheet, get the same results.
- Results: correct, wrong, blank, net, mark on 50 "si el mejor saca 72", per block, and a review of every wrong or blank
  item with the right option, the reason of the chosen option and the rule.

## Score and storage

- Net = correct − wrong / 3 (2 decimals). Mark = min(50, max(0, net) × 50 / 72.01).
- `localStorage` key `atc_aptmock_v1`: `{"sessions":[{"ts","correct","wrong","blank","net","secs","fam":{"abstracto":{"c","w","b"},"series":…,"espacial":…,"atencion":…}}]}`,
  newest last, last 60 kept; paper corrections add `"paper":1` and `secs` 0.
- `atc_aptmock_run_v1`: the mock in progress (code, answers, flags, elapsed seconds), removed at hand-in.

## Recommended use

One full mock a week from week 2 (audit protocol), target net ≥ 60 with no blind guesses: with −1/3 per error, answer
only when at least one option is ruled out. Use the paper version at least every other week: the real test is on paper.
