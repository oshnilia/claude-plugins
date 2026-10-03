---
name: visual-explainer
description: Build a one-off visual explanation for a complex topic - an overview-first, drill-down explanation with diagrams, rendered natively in the session board pane, or as a single HTML file only when the user asks for HTML. Use when the user asks to explain how something works in depth, wants an explainer, an interactive explanation, "объясни наглядно", "сделай визуализацию", or when a topic has several interacting parts that text and one diagram cannot carry.
license: MIT
metadata:
  version: 0.1.0
---

# Visual explainer

Code is cheap now, so a throwaway explanation built for one question is worth it. The hard part is not the
graphics. The hard part is the level of abstraction and the truth of each claim.

## 1. Plan the pyramid first

- **Question**: the one question the reader has.
- **Answer**: one sentence. This is the top of the page.
- **Key parts**: 2–5 parts that together explain the answer. They do not overlap and they cover the answer (MECE).
- **Details**: for each part, one diagram and up to 3 sentences.
Show the overview first. Put details one level down. Never go deeper than two levels.

## 2. Check every claim

Before you render, list each factual claim and its source: `file:line`, a command and its output, a test, or a URL.
Mark claims you inferred as "inference". Remove or soften claims you cannot support.
A wrong claim inside a nice animation is harder to catch than a wrong sentence.

## 3. Render

**Default — session board** (tool `mcp__session-board__show` available): call it once per part, or once with the
overview. Pass `title`, `markdown` (plain-80 / plain-ru-80, max 10,000 characters, with sources as links) and an
`svg`. Interactive SVG works there: CSS `:hover` to highlight a path, SMIL `<animate>` for motion, `<title>` for
tooltips. Scripts and event handlers do not run. Max 131,072 characters per SVG.

**HTML — only when the user asks for HTML or a page**: write one self-contained file (inline CSS and JS, no CDN)
to `explainers/<slug>.html` in the project, then tell the user the path. Keep the same pyramid: answer on top,
key parts as sections, details behind a click.

**No board and no HTML request**: answer in chat with the pyramid as headings, one Mermaid diagram per key part.

## 4. Close the loop

End with one line that offers a check: "Want three quick questions to check this?" — the `teach-back` skill runs it.
