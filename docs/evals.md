# Plugin evals: how they work and how we write them

Source: https://code.claude.com/docs/en/plugin-evals and `claude plugin eval --help` (Claude Code 2.1.288).

## What an eval is

An eval case is a prompt and a set of graders. `claude plugin eval` sends the prompt to a fresh headless Claude Code
session, lets it work, and then grades the result. By default it runs every case twice:

- **with-arm**: the plugin under test is loaded.
- **without-arm**: no plugin is loaded. This is the baseline.

`Δ` = with-arm score − without-arm score. That is what the plugin adds.

Each run is isolated. User settings, hooks, `CLAUDE.md`, memory, MCP servers and other installed plugins do not load.
So a plugin installed in your own Claude Code does not leak into the baseline.

## Layout

```
plugins/<name>/evals/
├── .gitignore                 # results/
└── <case>/
    ├── prompt.md              # frontmatter (limits, tools, tags) + the prompt body
    └── graders/
        ├── <grader>.md        # one grader per file; the file name is the grader name
        └── ...
```

`prompt.md` frontmatter: `max_turns` (default 10), `timeout_seconds` (300), `runs` (3), `model`, `tags`,
`allowed_tools`, `append_system_prompt`, `env` (`EVAL_*` keys only). An unknown key is an error.
`allowed_tools` grants only read-only tools (`Read`, `Glob`, `Grep`, `Skill`, `AskUserQuestion`, `Agent`,
`TodoWrite`, the task tools). Bash, Write, Edit, WebFetch and WebSearch need `--allow-tools` on the command line.

## Grader types

| Type | Cost | Passes when |
|---|---|---|
| `regex` | free | `pattern` is found (`match: contains`), absent (`not_contains`) or found N times (`"count:N"`) |
| `tool_used` | free | a tool was called `min`..`max` times with input that matches `input_match` |
| `tool_order` | free | the first `before` call comes before the first `after` call |
| `file_exists` | free | a file that Claude created matches the `path` glob |
| `llm` | judge calls | the judge votes PASS in 2 of 3 votes on the rubric in the file body |
| `baseline` | judge calls | the run is at least as good as a saved reference transcript |

`regex` reads `target` and `llm` reads `focus`: `last_message` (default), `trace`, `files`,
`{source: file, path: ...}`, `mock_calls`. There are no graders with custom code.

In a two-arm run, `tool_used: Skill` and graders with `arm: with-only` do not count in the score. They show in the
with-arm as "the skill fired" indicators. Set `arm: both` on a "must not fire" grader (`min: 0`, `max: 0`).

## How we write a case

1. Phrase the prompt as a user would. Do not name the skill.
2. Give each case one grader on the result (`llm` or `regex`) and one on the process (`tool_used: Skill`). In an
   `llm` rubric, quote the source text when the task is a rewrite (see "Traps we found").
3. Prefer `regex` where a rule is mechanical (no semicolons, no bureaucratic words). Keep `llm` rubrics short, as
   concrete PASS and FAIL conditions.
4. Write cases where the baseline is likely to fail. A case where both arms score 1.00 is a guard against
   regressions, not a measure of value. Keep a few guards on purpose (short answers stay short, creative text is
   not flattened).
5. Tag every case. We use `core` for cases that need only read-only tools, `needs-write` for cases that create files
   (HTML pages, step players) and `needs-bash` for cases that need a shell.

## How we run it

```bash
cd plugins/legible
# 1. Check the graders: one run, one arm, about $1 for 15 cases.
claude plugin eval . --tag core --runs 1 --ablation none --no-publish --threshold 0
# 2. Measure: 3 runs per arm, with and without the plugin.
claude plugin eval . --tag core --judge-model sonnet -j 6 --no-publish --threshold 0 --max-cost-usd 20
# 3. Cases that create files (HTML pages, step players).
claude plugin eval . --tag needs-write --allow-tools Write Edit --judge-model sonnet --no-publish --threshold 0
# 4. Cases that need a shell (the scorer scripts).
claude plugin eval . --tag needs-bash --allow-tools "Bash(python3:*)" --no-publish --threshold 0
```

Without `--no-publish` the HTML report goes to claude.ai as a private page. Results go to `evals/results/<time>/`
(`aggregate-result.json`, `report.html`). Add `--keep-temp` to keep each run's transcript for debugging.

## Traps we found

- **The judge does not see the user's prompt.** It sees only the reply and the rubric. For a rewrite, quote the source
  text in the rubric. Without it, a strict judge (sonnet) calls every rewording a "new fact" and fails a correct
  rewrite: our `rewrite-plain-80` fell from 1.00 to 0.42 until the rubric quoted the source.
- **A rubric can reward the bug you are testing for.** The old `rewrite-plain-ru` rubric asked the reply to "name who
  does the action". The skill must not invent an actor when the source names none, so the baseline won and `Δ` went
  negative. Check every rubric line against the skill's own rules.
- **`last_message` is the last text block, not the whole answer.** When Claude writes some text, calls a skill and
  then writes more, the grader sees only the part after the skill call. A rubric must not need the earlier part.
- **ASCII diagrams use Unicode arrows.** Match `─▶`, `▶`, `▼`, not only `-->`.
- **`\b` does not work with Cyrillic in JavaScript regex.** Use `(^|[^а-яё])word` instead.
- **Only `flags: i`.** There is no multiline flag and no inline `(?i)`.
- **Tell the judge which forms are correct.** A small judge marked «таблицы переиндексируют» (no subject) as an
  invented actor. List the allowed forms in the rubric, or use `--judge-model sonnet`.
- **Grade a created file with `focus: {source: file, path: ...}`.** Name the file in the prompt ("Save it as dns.html"),
  so both arms write to the same path. Add a `regex` grader on the file for mechanical rules (no network resources):
  a judge reading a long HTML file is noisy.
- **Bash cases need a clean sandbox.** On macOS the eval refuses Bash when `~/.docker` holds a symbolic link inside it.

---

## По-русски

Eval — это промпт и набор проверок (грейдеров). `claude plugin eval` гоняет каждый кейс дважды: с плагином и без
него, и показывает разницу `Δ`. Прогоны изолированы: ваши настройки и установленные плагины в них не попадают.
Кейс — папка в `evals/` с `prompt.md` и `graders/*.md`. Грейдеры: `regex`, `tool_used`, `tool_order`,
`file_exists` (бесплатные) и `llm`, `baseline` (вызывают модель-судью). Сначала прогоните кейсы один раз без
baseline, чтобы проверить грейдеры, потом сделайте полный замер. Ловушки — в разделе «Traps we found» выше.
