# legible

Answer formats for understanding, after Karpathy's format ladder.

- **plain-english** and **plain-russian** — a controlled, plain technical style inspired by ASD-STE100, at three
  levels (50 / **80** / 100). "80%" is measurable: `scripts/ste_score.py` and `scripts/ru_score.py` count the share of
  sentences with no structural violation.
- **diagram-first** — draw first when the content has shape; 1–3 sentences after.
- **visual-explainer** — a one-off explanation: overview first, details one level down, a source for every claim.
  Renders into the `session-board` pane when it is installed; an HTML file only when you ask for one.
- **format-router** — the cheapest format that still gives understanding.
- **teach-back** — three questions to check that you understood; a re-explain in another format where you did not.
- Output style `legible:plain-80`. Commands: `/plain [50|80|100] <text>`, `/diagram`, `/explain`, `/check-me`.

```bash
python3 skills/plain-english/scripts/ste_score.py --level 80 draft.md
python3 skills/plain-russian/scripts/ru_score.py --level 80 черновик.md
```

ASD-STE100 is a trademark of ASD. This plugin is inspired by it, does not ship its dictionary and does not claim
compliance. Get the standard free from https://www.asd-ste100.org/STE_downloads.html.

Evals: `claude plugin eval plugins/legible --no-publish` (makes real model calls; without `--no-publish` the report
goes to claude.ai).

## Measured (v0.1.1, 2026-10-03, Claude Code 2.1.286, 3 runs per arm, judge: haiku)

| Case | With legible | Without | Δ |
|---|---|---|---|
| rewrite-plain-80 | 1.00 | 0.42 | +0.58 |
| rewrite-plain-ru | 1.00 | 0.56 | +0.44 |
| diagram-for-structure | 0.89 | 0.67 | +0.22 |
| short-fact-stays-short | 1.00 | 1.00 | 0 |

v0.1.0 scored 0.50 on rewrite-plain-80, the same as no plugin: the skill made sentences active by inventing who acts
("the CI system sends a notification"), and its change list repeated the contractions it had removed. v0.1.1 keeps the
receiver as the subject when the source names no actor, and outputs the rewrite only. The diagram and short-fact
cases ran on v0.1.0; their skills did not change.
