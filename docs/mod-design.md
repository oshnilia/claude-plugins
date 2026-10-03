# Designing mod panes that read well

Rules we follow in `session-board`, from the official docs (Draw in the interface, Interface gallery),
Anthropic's own mods, and what broke in our first version. A desktop side pane is narrow: plan for 40–60 cells.

## What broke in v1 and why
| Symptom | Cause | Rule |
|---|---|---|
| Icon and id stacked on two lines; "· status" split from its dot | A row of several `Text` siblings: every flex item shrinks (`flexShrink` defaults to 1), so short items wrap | One row = **one `Text` with nested styled spans**, or fixed parts in `Box flexShrink={0}` |
| Tabs cut off at the right edge | 6 filled buttons + ↻ in a `nowrap` row | **Plain** tab buttons with hotkeys, `columnGap`, `flexWrap="wrap"`, ≤5 tabs |
| Status line glued to the tabs | No spacing between header parts | A blank line (or `gap={1}`) between header and body |
| Raw shell commands in the live list | We printed the command text | Show the tool's own `description` when it has one |
| Pane empty with no reason | A render error, no fallback | `try/catch` in the render hook: draw the error in red and write it to a file |
| `h is not a function` | A loop variable named `h` shadowed the JSX factory | Never name a variable `h` or `Fragment` in a `.tsx` mod file (CI checks it) |

## Layout rules
1. **Tabs**: `Button({ plain: true, hotkey: '1', dimColor: !active })` in a row with `columnGap={2}` and
   `flexWrap="wrap"`. Desktop draws the label with a small key; the terminal draws `1: Label`.
2. **Rows with a control**: `[Box flexShrink={0}] control` + `[Box flexGrow={1} flexShrink={1}] Text wrap="wrap"`.
3. **Rows without a control**: a single `Text` with spans: `<Text><Text color=…>◆ D1</Text> title <Text dimColor>· status</Text></Text>`.
4. **Truncate only metadata**: titles and statements wrap; timestamps, tool counts and paths use `wrap="truncate-end"`.
5. **Sections**: a dim label line, the content under it, `gap={1}` between sections. No borders around every block:
   a border spans the full pane width and eats two columns; keep borders for the one selected or important card.
6. **Indentation**: `paddingLeft={depth * 2}` on the row box; the toggle glyph sits in the fixed column.
7. **Text-heavy content**: prefer `Markdown` (headings, lists, quotes) over many hand-built `Text` rows.
8. **Svg**: only for static diagrams in a pane that rarely redraws; every redraw re-creates the Svg frame.
9. **Width**: read `e.props.bodyColumns`; below ~50 cells drop secondary metadata.
10. **State**: values a drawing reads live in `$.state` (survive reloads, redraw readers); never write state while drawing.

## Cookbook from Anthropic's and community mods (2026-10-03 survey)
Sources: `anthropics/claude-code/mods/diff`, `anthropics/claude-code-playground/claude-code/mods/*`,
`anthropics/claude-plugins-official/plugins/code-modernization`, Katharsis, remctl, Pulse, council-pane (has a DESIGN.md).

- **Width**: `e.props.bodyColumns` (never `viewport.columns`); docked body = `paddingRight={1}` → children get `columns - 1`.
  Inside a border subtract 2 (+ padding).
- **List row**: `<Box width={w} flexShrink={0}>{mark}</Box><Box flexGrow={1} flexShrink={1} minWidth={0}><Text wrap="wrap">…`.
- **Left text, pinned right**: `justifyContent="space-between"`; left `flexShrink={1}` + `wrap="truncate-end"`, right `flexShrink={0}`.
  Paths use `truncate-start` so the file name stays.
- **Section**: a dim rule `── Title · N ────` sized to the width, `marginTop={1}` before it.
- **Cards**: `borderStyle="round" borderColor={…} paddingX={1}` only for what needs attention.
- **Band**: leave `paddingRight` for the band's own collapse mark; drop parts by measuring, not by wrapping.
- **Never** nest a `Box` or `Button` inside a `Text` (the tree is refused). An empty `Text` collapses: use `' '`.
- A focused `Input` takes the whole width: give it its own row.
- Desktop: absolutely positioned hover cards paint **without a background** (text shows through) — avoid them there.
- `Markdown` tables are laid out to the terminal width: rewrite wide tables as lists before passing them in.
- Limits: Markdown/Text ≤ 10,000 chars; tree ≤ 20,000 nodes, 32 deep; redraws are throttled (10/s).

## Desktop draws text in a proportional font (learned the hard way, v3)
- **No box-drawing art** on desktop: `────` rules, `━━━` bars and `├─ │` tree guides never match the width or the
  line height there; they wrap, overflow with "…", or drift away from multi-line rows. They are fine in the terminal.
- Section heading = a bold label with a dim count; hierarchy = `paddingLeft` + a colored mark in a fixed gutter.
- Bars and other graphics = a small `Svg` image (desktop) drawn at a large viewBox (e.g. 1000×14) so it scales to the
  pane width; the terminal keeps block glyphs. `Svg` takes no `key` prop.
- Do not repeat information: if the plan marks the current step, do not add a separate "now → next" block.
- Keep live per-tool activity out of the main view: it redraws the pane on every tool call.

## Vertical rhythm (v3.1)
Desktop adds no spacing of its own: every gap must be a margin. One scale for all views (`SPACE` in register.tsx):
- **2 rows** before a section heading and between big items of a list (goals, decisions, turns, files, answers).
- **1 row** between a header and its body, before a row of buttons, before an expanded list, and between rows of
  wrapped buttons (`rowGap`).
- A thin Svg bar carries its own top and bottom padding inside the image (bar in the middle of a 1000×40 viewBox).

## The band above the prompt is a control strip, not a paragraph
Left: the current step, clipped by hand to the measured room (cells do not map to a proportional font).
Right: 2–3 short metrics (steps done/total, turn, decisions) that drop out as the band narrows, then buttons:
the primary "нужен ты · N" only when something waits for the person, "спросить", "доска".
- **Marks align with the first line**: rows with a mark and wrapping text need `alignItems="flex-start"`; desktop centers
  row items vertically by default, so a mark floats between the lines of a two-line item.

## Module layout (v4)
- JSX compiles against a global `h` in every module of the mod, not only in `register.tsx`: the views live in
  `hooks/views.tsx` as plain functions `(els, data, actions) => tree`. The CI guard against a variable named `h`
  covers every `.tsx` file.
- `register.tsx` keeps the hooks, the atoms and every function that takes `$` (the static scan wants them top level).
- Board actions run directly from `onPress` and catch their own errors; only the model fork for "Спросить" waits on
  `$.clock.after`. The test kit has no clock, no `ui.open` and no model: helpers (`iso`, `openBoard`, `say`) fall back
  or catch, so tests exercise the real code paths.
