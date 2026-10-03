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

Evals: 16 cases in `evals/`. How they work and how to run them: [docs/evals.md](../../docs/evals.md).

```bash
claude plugin eval plugins/legible --tag core --judge-model sonnet --no-publish
```

The run makes real model calls on your account. Without `--no-publish` the report goes to claude.ai.

## Install

```bash
claude plugin marketplace add oshnilia/claude-plugins
claude plugin install legible@oshn
```

## Data and safety

legible is text: skills, commands and an output style. No skill pre-approves a tool. The two scorers use only the
Python standard library, read the text you give them and make no network requests. Evals call the model on your
account and publish the report to claude.ai unless you pass `--no-publish`.

## Measured (v0.1.1, 2026-10-03, Claude Code 2.1.288, 3 runs per arm, judge: sonnet)

| Case | With legible | Without | Δ |
|---|---|---|---|
| teach-back-three-questions | 1.00 | 0.33 | +0.67 |
| rewrite-plain-ru | 1.00 | 0.33 | +0.67 |
| no-compliance-claim | 0.67 | 0.22 | +0.44 |
| keep-identifiers-and-hedges | 0.67 | 0.25 | +0.42 |
| visual-explainer-pyramid | 0.67 | 0.25 | +0.42 |
| rewrite-plain-80 | 0.75 | 0.42 | +0.33 |
| diagram-implicit | 0.33 | 0.00 | +0.33 |
| plain-100-procedure | 0.50 | 0.25 | +0.25 |
| ru-no-invented-actor | 1.00 | 0.80 | +0.20 |
| diagram-ru-explicit | 0.33 | 0.22 | +0.11 |
| diagram-for-structure | 0.78 | 0.78 | 0 |
| no-invented-actor-en | 1.00 | 1.00 | 0 |
| ru-explain-plain | 0.33 | 0.33 | 0 |
| short-fact-stays-short (guard) | 1.00 | 1.00 | 0 |
| creative-not-plain (guard) | 1.00 | 1.00 | 0 |

Mean Δ +0.26. The guards check that the plugin does not hurt: short answers stay short, and creative text does not get
the plain style. Known gaps: after a diagram the takeaway is often longer than 1-3 sentences; «без воды» does not make
a Russian explanation shorter; with no shell, `plain-english` explains that it could not run the scorer, with
contractions. `plain-score-honest` needs Bash (`--tag needs-bash --allow-tools "Bash(python3:*)"`) and is not in the
table.
