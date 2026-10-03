# oshn — Claude Code plugins for understanding what Claude does

Models now do more of the work. Our time moves to **understanding and checking** that work.
These plugins change the interface, not the model: answers in a format that fits the task,
and a live board that shows what happens in a session.

| Plugin | What it does | Where it works |
|---|---|---|
| [`legible`](plugins/legible) | Plain English and plain Russian at a measurable strictness (plain-80), diagram-first answers, visual explainers, teach-back checks | Claude Code (CLI, desktop), skills also on claude.ai |
| [`session-board`](plugins/session-board) | A mod: a side board with the session's main point, an outline map, turns, decisions and open questions; Claude reads the same ledger back after compaction | Claude Code desktop Code tab and CLI (2.1.287+) |

## Install

```bash
claude plugin marketplace add oshnilia/claude-plugins
claude plugin install legible@oshn
claude plugin install session-board@oshn
```

In the desktop app: `+` → Plugins → Add plugin, then add the marketplace `oshnilia/claude-plugins`.

## Why

After Andrej Karpathy's post on the "format ladder" (plain controlled English → diagrams → interactive pages → video):
https://x.com/karpathy/status/2105819303471976479. All references we used: [docs/references.md](docs/references.md).

## Repository

- `plugins/<name>` — one folder per plugin; `version` lives in each `plugin.json`.
- `docs/` — references, spike results, the session ledger spec.
- `scripts/sync-dev-mod.sh` — copy a mod from the hot-reload folder into the repo, then validate and test it.
- CI validates the marketplace and each plugin and runs the mod tests.

---

## По-русски

Модели делают всё больше работы сами, а наше время уходит на то, чтобы **понимать и проверять** эту работу.
Здесь два плагина:

- **legible** — ответы в формате под задачу: упрощённый технический английский и русский с измеримой строгостью
  (plain-80), сначала схема, наглядные объяснения, проверка понимания;
- **session-board** — мод для Claude desktop: доска рядом с сессией (суть, карта, ходы, решения, открытые вопросы).
  Тот же журнал Claude читает после сжатия контекста, чтобы не терять решения, правила и тупики.

Установка — командами выше. Лицензия — MIT.
