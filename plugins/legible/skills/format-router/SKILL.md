---
name: format-router
description: Choose the cheapest answer format that still gives understanding, on Karpathy's format ladder - one sentence, ASD-STE100 text, a table, a diagram, an HTML page or an animated explainer - before writing a long answer. Use when an answer is going to be long, when the user says they do not understand, asks "как лучше показать", "what's the best way to explain", or when the content is mostly structure, comparison or process.
license: MIT
metadata:
  version: 0.2.0
---

# Format router

Karpathy's ladder: **text in ASD-STE100 → diagram → HTML page → animated explainer**. Each rung is easier to
understand and costs more to build. Pick the format by the shape of the content, not by habit, and climb only as high
as needed.

| Shape of the content | Format | Skill |
|---|---|---|
| one fact, yes/no, a number | one sentence | — |
| an explanation of 1–3 ideas | plain text in ASD-STE100, 80% of the way; answer first | `plain-english` / `plain-russian` |
| options against criteria | table | — |
| steps the user will do | numbered procedure, one instruction per step | `plain-english` / `plain-russian` |
| structure, flow, dependencies | diagram + 1–3 sentences | `diagram-first` |
| many interacting parts, "how does X really work" | overview first, details one level down, in chat | `visual-explainer` |
| the user asks for a page, "in HTML", or presses **HTML** on the board | one interactive HTML page | `visual-explainer` |
| the user asks for an animation, a video, "step by step", or presses **Анимация** | one offline HTML step player | `animated-explainer` |

Rules:
1. Always start with the answer (BLUF), whatever the format.
2. If a text answer passes about 150 words and has structure, switch to a table or a diagram.
3. Build an HTML page or an animation **only** when the user asks for it or presses a board button. Never by default:
   a file the user did not ask for is noise.
4. Match the user's language. For Russian use `plain-russian`.
5. If the user is reviewing an agent's work (a diff, a run, a session), prefer a map of what changed and why,
   with sources, over a narrative.
6. Say which format you chose only if the user asked about formats.
