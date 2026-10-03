# Spike results: what the session board can rely on

Spike mod: `~/.claude/dev-mods/<session>/board-spike/` (throwaway). Claude Code 2.1.286, desktop Code tab, 2026-10-03.
Live answers were recorded by the spike itself in `docs/spike-live.json`.

| # | Check | Headless | Live in desktop | Decision |
|---|---|---|---|---|
| 1 | `Svg isInteractive`: CSS `:hover`, `<title>` tooltips | tree validates | **works** (hover path, tooltips) — but scaled down to the pane, white margins around it, hard to read | **Not for the main map** |
| 2 | ~16-node tree readable | — | too small at pane width; role unclear without real data | Map → **text outline** (Box/Text/Button) |
| 3 | Pick a node with `Select`, ◀ ▶ | pass | works | keep |
| 4 | `Client` module (keys, pointer, frame clock) | `post()` → `ui.message` passes | **fails on desktop**: "Client … did not load within 10s" | **Do not use Client.** Player = Buttons + `$.clock.every` (works) |
| 5 | `Box hover` + `position:absolute` card | validates | **works** | keep for "why / evidence / confidence" cards |
| 6 | `Markdown onLinkPress` | pass | node links **work**; `file:` link not confirmed | keep for in-board navigation |
| 7 | Redraw from `$.clock` timer | — | works | keep |
| 7b | Does Svg flicker on redraw? | — | **yes**: every pane redraw re-creates the Svg frame; a SMIL pulse also reads as blinking | Svg only in a separate, rarely redrawn pane; no infinite animations |
| 8 | `$.model.fork` from a timer | — | **works**: 4.9 s, 382,133 tokens read from cache, 188 output tokens | keep, but gate it: run only on turns with real work, and show the cost |

## Design changes that follow

1. The board is **text-first**: pyramid, outline map, turns, decisions, questions are native text elements.
   They are crisp at any width, do not flicker, and take hover cards and buttons.
2. Svg is for static, model-made diagrams in the "Ask" view only, in a pane of its own.
3. No `Client`. The turn player uses Buttons and a `$.clock` timer.
4. Fork cost grows with the session (the whole transcript is read from cache each call).
   Default: fork after a turn only when the turn used at least `minTools` tools; `update: manual` turns it off.

## API notes
- Atom references need string literals for `plugin` and `key` (a `const P` variable fails validation).
- Narrow `e.surface` before `$.ui.resolve(e)` to get `Svg` (desktop only).
- `$.state` persists across mounts inside one test: reset values at the start of each surface loop.
- `$.fs.write` from a press handler works (the spike wrote `docs/spike-live.json`).
