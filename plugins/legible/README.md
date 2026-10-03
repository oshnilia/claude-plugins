# legible

Answer formats for understanding, after Karpathy's format ladder
([the post](https://x.com/karpathy/status/2105819303471976479)): **text in ASD-STE100 → diagram → HTML page →
animated explainer**. Each rung is easier to understand and costs more to build.

- **plain-english** — asks the model for ASD-STE100 Simplified Technical English by name, 80% of the way by default
  (50 and 100 on request). The model knows the standard; the skill keeps facts, hedges, identifiers and actors intact.
  `scripts/ste_score.py` measures sentence structure: length, voice, phrasal verbs, contractions, noun clusters,
  marketing words, actions hidden in nouns and synonym rotation.
- **plain-russian** — the same idea for Russian (ASD-STE100 has no Russian version): verbs instead of verbal nouns, no
  bureaucratic words, short answers when you ask for them «без воды». `scripts/ru_score.py` measures it.
- **diagram-first** — draw first when the content has shape; three sentences at most after the diagram.
- **visual-explainer** — overview first, details one level down, a source for every claim. Renders into the
  `session-board` pane when it is installed; one offline HTML page when you ask for it.
- **animated-explainer** — the top rung: one offline HTML file that builds a diagram step by step, with a caption per
  step, back and forward, a slider, Play, and a link to each step. No audio, nothing to install.
- **format-router** — the cheapest rung that still gives understanding. HTML and animation only when you ask.
- **teach-back** — three questions to check that you understood; a re-explain in another format where you did not.
- Output style `legible:plain-80`. Commands: `/plain [50|80|100] <text>`, `/diagram`, `/explain <topic> [html]`,
  `/animate <topic>`, `/check-me`.

With `session-board` installed, a band under every long answer offers the next rungs: **STE / Схема / HTML /
Анимация**.

```bash
python3 skills/plain-english/scripts/ste_score.py --level 80 draft.md
python3 skills/plain-russian/scripts/ru_score.py --level 80 черновик.md
```

ASD-STE100 is a trademark of ASD. legible asks the model to write in its style and never claims that a text
complies with it. The plugin does not ship or read the ASD dictionary. ASD gives the standard free on request:
https://www.asd-ste100.org/STE_downloads.html.

Evals: 21 cases in `evals/`. How they work and how to run them: [docs/evals.md](../../docs/evals.md).

```bash
claude plugin eval plugins/legible --tag core --judge-model sonnet --no-publish
claude plugin eval plugins/legible --tag needs-write --allow-tools Write Edit --judge-model sonnet --no-publish
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
account and publish the report to claude.ai unless you pass `--no-publish`. The HTML pages and step players that the
skills write are single files with a Content-Security-Policy that blocks every network request.

## Measured (v0.2.0, 2026-10-03, Claude Code 2.1.288, 3 runs per arm, judge: sonnet)

| Case | With legible | Without | Δ |
|---|---|---|---|
| keep-identifiers-and-hedges | 1.00 | 0.25 | +0.75 |
| teach-back-three-questions | 1.00 | 0.33 | +0.67 |
| diagram-ru-explicit | 1.00 | 0.33 | +0.67 |
| rewrite-plain-ru | 1.00 | 0.33 | +0.67 |
| rewrite-plain-80 | 1.00 | 0.42 | +0.58 |
| diagram-implicit | 0.56 | 0.00 | +0.56 |
| ru-explain-plain | 0.89 | 0.33 | +0.56 |
| ru-no-invented-actor | 1.00 | 0.53 | +0.47 |
| ste-explain-tls | 1.00 | 0.73 | +0.27 |
| plain-100-procedure | 0.50 | 0.25 | +0.25 |
| visual-explainer-pyramid | 0.50 | 0.25 | +0.25 |
| diagram-for-structure | 1.00 | 0.78 | +0.22 |
| no-compliance-claim | 0.56 | 0.44 | +0.11 |
| no-invented-actor-en | 1.00 | 1.00 | 0 |
| short-fact-stays-short (guard) | 1.00 | 1.00 | 0 |
| creative-not-plain (guard) | 1.00 | 1.00 | 0 |
| ste-explain-index | 0.87 | 1.00 | -0.13 |

Mean Δ +0.35 over 17 cases (+0.38 over the 15 cases of v0.1.1, which scored +0.26). Cases that create files
(`--tag needs-write`): html-on-request 1.00 / 0.50, animate-on-request 1.00 / 1.00, no-html-unasked (guard)
1.00 / 1.00.

When the user names ASD-STE100 in the prompt, as Karpathy suggests, the model writes well without the plugin too
(ste-explain-index). Known gaps: with two diagrams the answer around them is still long (diagram-implicit), and
in plain-100 procedures the warning often puts the condition after the command ("Do not restart the pods if ...").
`plain-score-honest` needs Bash (`--tag needs-bash --allow-tools "Bash(python3:*)"`) and is not in the table.

## Credits

The ladder is from Andrej Karpathy's post. These MIT-licensed projects gave us ideas; we wrote our own code for each:

- [danyuchn/asd-ste100-skill](https://github.com/danyuchn/asd-ste100-skill) — the scorer checks for marketing words,
  actions hidden in nouns and synonym rotation, and the `Kept as-is:` line.
- [toonooby/ste100-plugin](https://github.com/toonooby/ste100-plugin) — deviation marks at the strictest level.
- [AminBlg/SimpleEnglish](https://github.com/AminBlg/SimpleEnglish) — the lesson that a short instruction beats a long
  rule list.
- [0xGondarxyz/output-ladder](https://github.com/0xGondarxyz/output-ladder) — re-explain buttons under an answer.
- [nicobailon/visual-explainer](https://github.com/nicobailon/visual-explainer) and
  [FavioVazquez/showtime](https://github.com/FavioVazquez/showtime) — the step player: parts marked by step, opens on
  the full picture, no autoplay, reduced motion, a link to each step.
