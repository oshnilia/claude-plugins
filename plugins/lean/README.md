# lean

Claude writes the least code that solves the problem, and tells you in plain words what it left out and when to add
it. With [`session-board`](../session-board) installed, each thing it left out is a decision on the board: you accept
it or send it back.

Based on [ponytail](https://github.com/DietrichGebert/ponytail) by Dietrich Gebert (MIT). See
[Where it comes from](#where-it-comes-from).

## What it does

At the start of each session a hook gives Claude the lean rules:

- **Understand first.** Read the code the change touches and follow the real flow. Fix a bug where all callers meet,
  not in the one caller the report names.
- **The ladder.** Stop at the first rung that works: is it needed at all → is it already in this codebase → the
  standard library → the platform (`<input type="date">`, CSS, a database constraint) → an installed dependency → one
  line → only then new code.
- **Never cut** input checks at trust boundaries, error handling that prevents data loss, security, accessibility,
  anything you asked for by name, and one runnable check for logic that is not trivial.
- **Say what was skipped.** Code first, then at most three lines in your language:
  `Skipped: <what>. Add when <trigger>.` or `Пропущено: <что>. Добавить, когда <условие>.`
- **Mark shortcuts.** A shortcut with a known limit gets a `lean:` comment that names the limit and when to upgrade.

Levels: **lite** (build what you asked, name the smaller option), **full** (the ladder; the default), **ultra** (delete
before add).

| Command | What it does |
|---|---|
| `/lean [lite\|full\|ultra\|off]` | Switch the level for this session. "stop lean" also turns it off. |
| `/lean-review [diff\|repo\|<path>]` | Find what to cut: one line per finding, with `delete:`, `stdlib:`, `native:`, `reuse:`, `yagni:`, `shrink:`. A diff by default; `repo` audits the whole tree. Reports only. |
| `/lean-debt` | List every `lean:` shortcut in the codebase, with its limit and trigger. Reports only. |

### With session-board

With [`session-board`](../session-board) 0.7.0 or later, lean is part of each step of a task:

| Step | What happens |
|---|---|
| Brief | The board shows a code level (lite / full / ultra / off) next to authority. Start passes it to Claude as `Код: lean <level>`. |
| Work | Each skipped thing and each `lean:` shortcut goes to the board's ledger as a decision with a tag (`skipped`, `shortcut`), in English and Russian. |
| Hand-in | Before `submit`, Claude reviews the task's diff for over-engineering, as `/lean-review` does, and records each finding (tag `cut`) without changing the code. One line, «Самопроверка на лишнее», says what it found. |
| Acceptance | «Не построено» lists the skipped things, the shortcuts and the findings. You mark what to change: «добавить сейчас», «сделать полностью», «убрать». The marks go to Claude with your verdict. «Проверить на лишнее» asks for the review again. |
| Report, project | The report has a block on what was not built and when to add it. The Task screen counts the project's `lean:` shortcuts and asks for the `/lean-debt` list. |

lean does not need session-board and does not change it: the rules ask Claude to use the tools the board gives, and
the board reads lean's session-start line. Details: [docs/board-logic.md](../../docs/board-logic.md#lean-in-the-flow).

## Install

```bash
claude plugin marketplace add oshnilia/claude-plugins
claude plugin install lean@oshn
```

**Settings:** `claude plugin configure lean@oshn`.

| Option | Default | Meaning |
|---|---|---|
| `level` | `full` | The level at session start: `lite`, `full`, `ultra`, or `off` (no rules until you type `/lean`). |

## Data and safety

lean is text plus one hook. The hook (`hooks/rules.sh`, 11 lines of `sh`) prints the rules file at session start. It
reads no project files, writes nothing and makes no network calls. Only the `level` option reaches it, and a value
other than `lite`, `full`, `ultra` or `off` falls back to `full`. The rules add about 1,400 tokens to each session.

## Limits

- **Subagents** do not get the rules. Add when subagents often write code in your sessions.
- **Windows** needs Git Bash for the hook (Claude Code uses it for hooks when it is installed).
- **Board notes** depend on the model. In our runs, Opus 5.5 recorded each skipped thing in a single turn; Sonnet did
  so only in the board's work phase, after Start.
- With `level` off at session start the hook prints nothing, so session-board shows no lean parts in that session,
  even after `/lean full`.
- After compaction the hook prints the level from the settings again. A level you switched earlier in the session
  stays in force only as far as the compacted summary keeps it.

## Where it comes from

[ponytail](https://github.com/DietrichGebert/ponytail) 4.10.3 (MIT, © 2026 Dietrich Gebert) is a rule set for a
"lazy senior developer": the ladder, the rules, the levels, review and debt skills, plus hooks and adapters for many
coding agents. lean keeps the idea and cuts the rest.

| ponytail | lean | Why |
|---|---|---|
| The ladder, the rules, "never cut", one runnable check, three levels | Kept, rewritten in plain technical English | This is the part that changes what Claude builds. |
| `ponytail:` shortcut comments and `/ponytail-debt` | `lean:` comments and `/lean-debt` | Same idea, own name. |
| `/ponytail-review` and `/ponytail-audit` | One `/lean-review` with a scope argument | Two skills with the same tags differ only in scope. |
| "skipped: X, add when Y" in English | The same line in your language, in plain words; on the board as a decision with session-board | You see and accept what was not built. |
| Hooks in Node.js (about 800 lines): flag files in `~/.claude`, a config file in `~/.config/ponytail`, a prompt parser for `/ponytail` | One `sh` hook and a plugin option; `/lean` switches the level through the conversation | No runtime to install, no files outside the plugin. |
| Rules for subagents (SubagentStart hook) | Not yet | See Limits. |
| Adapters for more than a dozen other coding agents (Codex, Cursor, Copilot, Gemini, OpenCode and others), an MCP server | Dropped | This marketplace is for Claude Code. |
| `/ponytail-gain` (a scoreboard of ponytail's benchmark numbers), `/ponytail-help`, status line | Dropped | We show only numbers we measured ourselves (below); the `/` menu and this README replace help. |
| Benchmarks in Python against an API | Five `claude plugin eval` cases with and without the plugin | The same tool as the other plugins here; no API key. |

## Measured (v0.1.0, 2026-10-04, Claude Code 2.1.288, Opus 5.5, 5 runs per arm, judge: sonnet)

0.2.0 changes only the session-board part of the rules, which these runs do not load, so the table stands.

| Case | Score with lean | Without | Δ | Code lines with | Without |
|---|---|---|---|---|---|
| email-ru (Russian request) | 0.97 | 0.50 | +0.47 | 5.0 | 25.4 |
| oldest-users (CSV script) | 1.00 | 0.68 | +0.32 | 5.8 | 9.2 |
| rate-cache | 0.85 | 0.75 | +0.10 | 19.2 | 29.6 |
| date-field (guard) | 1.00 | 1.00 | 0 | 5.0 | 5.0 |
| price-root-cause (guard) | 1.00 | 1.00 | 0 | one-line fix | one-line fix |

- **Less code, same correctness.** Code lines are the mean per run, without self-checks. Over the four cases that write
  a file: 8.8 lines with lean, 17.3 without. Every correctness grader passed in all 25 runs of each arm.
- **A check stays behind.** 13 of 25 lean runs left a runnable `assert` check, against 5 of 25 without.
- **Shorter answers:** 105 words on average, against 153.
- **Skipped lines:** 5 of 5 runs in Russian and 5 of 5 in English wrote them; the baseline never did. One Russian run
  of 5 was longer than the 8 lines the grader allows.
- **Costs more:** $0.111 per run against $0.091 (+22%). The rules add about 1,200 tokens (1,400 in 0.2.0), and the
  checks add output.
- **Guards:** on the date field and the bug fix, Claude without lean already took the native `<input type="date">` and
  fixed the shared function. lean did not make them worse.
- In these runs session-board was not loaded. All 50 runs ended without an error, and no lean answer mentioned the
  board. The board was tested apart: with both plugins, Claude recorded each skipped thing as a decision in the ledger.

Evals: 5 cases in `evals/`. How they work: [docs/evals.md](../../docs/evals.md).

```bash
claude plugin eval plugins/lean --allow-tools Write Edit --scaffold --judge-model sonnet --no-publish --threshold 0
```

`--scaffold` runs `evals/price-root-cause/fixture.sh`, which writes three small Python files into the run's empty
workspace. The run makes real model calls on your account. Without `--no-publish` the report goes to claude.ai.

## По-русски

lean заставляет Claude писать минимум кода: сначала спросить, нужно ли это вообще, потом взять то, что уже есть в
проекте, стандартную библиотеку или возможности платформы, и только потом писать своё. После кода — до трёх строк
«Пропущено: … Добавить, когда …» на языке пользователя. С session-board каждое такое решение попадает на доску, и вы
принимаете или возвращаете его вместе с работой. Уровни: lite, full (по умолчанию), ultra; `/lean off` выключает.
Основан на ponytail (Dietrich Gebert, MIT).

## License

MIT. `LICENSE` keeps the ponytail copyright notice next to ours.
