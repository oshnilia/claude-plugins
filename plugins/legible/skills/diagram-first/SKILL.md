---
name: diagram-first
description: Answer with a diagram first and only a few sentences of text, when the content is about structure, flow, sequence, state, dependencies or comparison. Use when the user asks to draw, diagram, visualize, show a schema or a map, says "покажи схемой" or "нарисуй", or when a text answer would need more than about 150 words to describe how parts connect.
license: MIT
metadata:
  version: 0.2.0
---

# Diagram first

A diagram is cheaper to read than prose when the content has shape. Draw first, then explain in 1–3 sentences.

This is the second rung of the format ladder: STE text → **diagram** → HTML page → animated explainer. Climb higher
only when the user asks (or presses a board button): `/legible:explain <topic> html` or `/legible:animate <topic>`.

## Pick the diagram

| Content | Diagram |
|---|---|
| steps, decisions, branches | flowchart (top-down) |
| who calls whom, in time order | sequence diagram |
| parts and what they contain | tree or nested boxes (C4 style: one level at a time) |
| states and transitions | state diagram |
| options across criteria | table, not a diagram |
| events over time | timeline |

## Rules

1. One idea per diagram. If you need two ideas, draw two diagrams.
2. 15 nodes or fewer. Group the rest into one node; the user can ask to expand it.
3. Give every diagram a title. Add a legend when you use colors or shapes with meaning.
4. Node labels: 4 words or fewer. Edge labels: a verb ("calls", "writes", "blocks").
5. Show one level of abstraction. Do not mix "the system" and "line 42" in the same picture.
6. Before the diagram: a title line only. After the diagram: the takeaway, **3 sentences at most**, in plain-80 (or
   plain-ru-80) - the one thing the reader must see. No list of extra details, no "Sources" section, no paragraph
   that offers more. A source goes inside a sentence. If an important detail does not fit, draw a second diagram
   instead of writing more.

## Where to draw

1. **Session board present** (tool `mcp__session-board__show` is available): call it with `title`, a short
   `markdown` takeaway and an `svg` string. Hand-write clean SVG: `viewBox`, system fonts, `<title>` on each node
   for tooltips, CSS `:hover` for highlight. No scripts (the board strips them). Max 131,072 characters.
2. **Chat**: a Mermaid code block. Keep the source short and valid.
3. **Terminal-only or the user asks for text**: a compact ASCII diagram in a code block.

Do not claim facts in a diagram that you did not check. Put the source of a non-obvious fact in the takeaway.
