---
name: format-router
description: Choose the cheapest answer format that still gives understanding - one sentence, plain text, a table, a diagram or a visual explainer - before writing a long answer. Use when an answer is going to be long, when the user says they do not understand, asks "как лучше показать", "what's the best way to explain", or when the content is mostly structure, comparison or process.
license: MIT
metadata:
  version: 0.1.0
---

# Format router

Pick the format by the shape of the content, not by habit. Climb the ladder only as high as needed.

| Shape of the content | Format | Skill |
|---|---|---|
| one fact, yes/no, a number | one sentence | — |
| an explanation of 1–3 ideas | plain text, answer first | `plain-english` / `plain-russian` |
| options against criteria | table | — |
| steps the user will do | numbered procedure, one instruction per step | `plain-english` / `plain-russian` |
| structure, flow, dependencies | diagram + 1–3 sentences | `diagram-first` |
| many interacting parts, "how does X really work" | visual explainer, overview → details | `visual-explainer` |

Rules:
1. Always start with the answer (BLUF), whatever the format.
2. If a text answer passes about 150 words and has structure, switch to a table or a diagram.
3. Match the user's language. For Russian use `plain-russian`.
4. If the user is reviewing an agent's work (a diff, a run, a session), prefer a map of what changed and why,
   with sources, over a narrative.
5. Say which format you chose only if the user asked about formats.
