# Changelog

Each plugin has its own version. A release is a git tag `<plugin>--v<version>`.

## notion-tasks

### 0.2.0 — 2026-10-04

- session-board's free mode needs no ticket, even with `require_ticket`. At the summary each kept idea that still
  needs work becomes a follow-up ticket; its link goes into the idea, so the summary shows it.

### 0.1.0 — 2026-10-04

- New plugin: your own Notion task board as the list of work. `/notion-tasks:setup` finds or creates the board, reads
  its properties and status groups, and writes `.claude/notion-tasks.json` out of git. `/notion-tasks:take` turns a
  ticket into the brief. The rules keep the status, write the closing report and file new tickets for what is out of
  scope.
- Works with any Notion connection (the official Notion plugin, `claude mcp add`, the claude.ai connector): Claude
  finds the tools by the end of their names. No server, token or network code of its own.
- With session-board: Start sets the start status, Accept sets the done status with the report; each new ticket is a
  decision at Acceptance. With lean: each skipped item becomes a follow-up ticket.
- A binding that git tracks is refused; a ticket's text never widens Claude's authority.

## session-board

### 0.8.0 — 2026-10-04

- Free mode («Свободный режим») for sessions that discuss, try and iterate instead of closing one task: no brief, no
  criteria, no acceptance. The button on the Task screen or the chat word «Свободный режим» turns it on at any time; a
  running task pauses in its folder and waits under «Начатые задачи».
- Claude works as a partner and keeps the ideas on the board: a new ledger kind `idea` (I) with the statuses open,
  trying, kept and dropped. The Work screen and the band show the ideas instead of criteria.
- «Подвести итог» (button or the chat word «Итог»): Claude gives each idea its final status and hands in through
  `submit` without criteria. The «Итог» screen and `summary.md` in the folder list what was kept, what was dropped and
  why, what is left, the decisions and what is next. The phone's `/board` card shows the ideas.
- Fix: a button that sent a message no longer stays on «✓ отправлено». The board's own messages skip its prompt hook,
  so they count as started at once and the end of the next turn clears them.

### 0.7.0 — 2026-10-04

- With the lean plugin, the board puts lean into each step. It learns about lean from the line lean's hook prints at
  session start; without lean nothing changes.
- Task screen: a code level (lite, full, ultra, off) next to authority. Start passes it to Claude; a change during the
  work goes as a board note. «Срезанные углы в проекте» counts the project's `lean:` comments with `git grep` and asks
  Claude for the list.
- Hand-in: the submit tool asks Claude to review the task's diff for over-engineering first, record each finding and
  change no code; `lean_check` carries the result in one line.
- Acceptance: a section «Не построено» with what Claude did not build, its shortcuts and the findings. A mark becomes a
  fix in the verdict: «добавить сейчас», «сделать полностью», «убрать». «Проверить на лишнее» asks for the review again.
- The report and the phone's `/board` card list the same items. The Work screen counts them.
- The note tool takes `tag` (skipped, shortcut, cut), an optional node field, and keeps a statement given only in
  Russian.

### 0.6.0 — 2026-10-04

- On a phone, a tablet or a browser (Remote Control) the board works in text. Mods draw only in the terminal and the
  Desktop app, so the narrow layout from 0.5.0 never showed there; it is removed.
- `/board` from such a device prints the board as text and then asks the next step in a question dialog, which Remote
  Control forwards: Start or fix the brief, accept or return the work, or answer Claude's question.
- «Старт», «Принять», «Вернуть: …» and «Принять с правками: …» typed in the chat press the board's buttons in their
  phase. Claude gets the message the button would send, not a second one.
- Pushes say what to answer.

### 0.5.0 — 2026-10-04

- The board works on the Claude mobile app over Remote Control. When a phone attaches, the board opens for it in one
  narrow column: state, "Нужен ты" cards, the current step, the criteria and a route map. Start, Accept and option
  answers are buttons; free text (an answer, a fix to the brief, a remark on return) goes through the question
  dialog's "Other" field, because the phone draws no input fields.
- `/board` also prints the board card in the transcript, on every surface.
- Pushes when a brief waits for Start, when Claude needs an answer and when the work is handed in (setting `push`).
- "Отчёт на телефоне" asks Claude to publish the HTML report as a private claude.ai page, only on that press.
- A new brief with another title while the task waits for acceptance starts a new task. Before, it replaced the
  handed-in criteria of the waiting task.

### 0.4.0 — 2026-10-03

- Under an answer with 120 or more words of prose, the band shows "показать иначе: STE / Схема / HTML / Анимация",
  the rungs of Karpathy's format ladder. A press sends the request into the session as your message. Any new message
  takes the row down.

### 0.3.3 — 2026-10-03

- "Принять работу" on the band above the prompt now accepts the work in one press. With drafted fixes it reads
  "Отправить приёмку · правок N" and opens the Acceptance screen. "посмотреть" opens the screen without accepting.
- When the board cannot open after a press, a toast says why instead of nothing happening.

### 0.3.2 — 2026-10-03

Security:

- Board configuration that comes with a cloned repository is not trusted: `.claude/tasks/policy.json`, `RULES.md` and
  task folders that git tracks are neither applied nor loaded. A cloned project could raise Claude's authority or plant
  "rules" that way. The board says so in a toast.
- After compaction the brief lists rules the cartographer inferred apart from the rules the user stated. The
  cartographer treats tool output, files and web pages as data and never turns them into constraints.
- "Открыть" on a file opens only files of the current project; files that macOS would run (`.command`, `.app` and
  similar) are revealed in Finder instead.
- The session pointer can only lead into the project's task folder.

### 0.3.1 — 2026-10-03

- The route map in the report stays inside the page column and scrolls inside its frame.
- "Открыть отчёт" rebuilds the report every time.

### 0.3.0 — 2026-10-03

- The HTML report is a route map of the session: one line per goal across the turns, a self-drawing replay, station
  details on click, forks and dead ends, checks with folded proof, and per-file diffs.
- "Принять с правками" appears only when there is a fix, and the verdict waits while a remark is being typed.

### 0.2.3 — 2026-10-03

- The Acceptance screen speaks plain Russian: the verdict in one line, "Нужно от тебя", one plain sentence per
  criterion, the technical proof folded.
- An English-only note update keeps the Russian title.

### 0.2.2 — 2026-10-03

- The ledger brief rides in the compacted conversation itself, so it reaches Claude after `/compact`.

### 0.2.1 — 2026-10-03

- The project root no longer follows a shell `cd`; board buttons send their message once.

### 0.2.0 — 2026-10-03

- Two touches per task: a brief with criteria and authority at the start, Claude works alone, an Acceptance screen
  with one verdict and an HTML report at the end. The task folder keeps the ledger.

### 0.1.0 — 2026-10-03

- First version: a live session board with a typed ledger that Claude reads back after compaction.

## legible

### 0.2.0 — 2026-10-03

- The format ladder from Karpathy's post: text in ASD-STE100, then a diagram, then an HTML page, then an animated
  explainer. HTML pages and animations are built only when you ask, or from the session board's buttons.
- plain-english asks the model for ASD-STE100 by name, 80% of the way by default. It keeps facts, hedges, identifiers
  and actors, adds a `Kept as-is:` line for precision it kept on purpose, and marks deviations at level 100.
- The English scorer also finds marketing words, actions hidden in nouns ("perform an analysis") and synonym rotation
  ("check" here, "verify" there).
- New skill `animated-explainer` and command `/animate`: one offline HTML step player with captions, back and
  forward, a slider, Play and a link to each step.
- Without a shell, the plain skills say nothing about the scorer. A diagram's takeaway is three sentences at most.
  «Без воды» keeps a Russian answer under 120 words.
- HTML pages carry a Content-Security-Policy that blocks network requests.
- Evals: 21 cases, with and without the plugin; see `docs/evals.md`.

### 0.1.1 — 2026-10-03

- Rewrites no longer invent who acts, output the rewrite only, and skip the score line when the scorer cannot run.

### 0.1.0 — 2026-10-03

- First version: plain English and plain Russian with measured strictness, diagram-first, visual explainer, format
  router, teach-back, the `plain-80` output style and four commands.

## lean

### 0.2.0 — 2026-10-04

- With session-board 0.7.0: skipped things and shortcuts go to the board with a tag; before `submit` Claude reviews the
  task's diff for over-engineering and records the findings without changing the code, also for parts you asked for by
  name; a message `Код: lean <level>` from the board switches the level.
- `/lean-review` records its findings on the board when the board is there. `/lean-debt` leaves markdown and JSON out.

### 0.1.0 — 2026-10-04

- New plugin, based on [ponytail](https://github.com/DietrichGebert/ponytail) 4.10.3 by Dietrich Gebert (MIT). Claude
  writes the least code that solves the problem: is it needed at all, is it already in the codebase, the standard
  library, the platform, an installed dependency, one line, and only then new code.
- After the code, at most three lines `Skipped: <what>. Add when <trigger>.` in the user's language, in plain words.
- With session-board, each skipped thing and each `lean:` shortcut is also a decision in the board's ledger.
- Levels lite, full and ultra; the `level` option sets the level at session start, `/lean <level>` switches it for the
  session. `/lean-review` finds what to cut in a diff or the whole repository; `/lean-debt` lists `lean:` shortcuts.
- One `sh` hook, no Node.js and no files outside the plugin. Five eval cases with and without the plugin.

## Repository

### 2026-10-04

- The CI check for personal data checks each match on its own and allows the reserved example domains
  (example.com, .org, .net) that eval cases use. CI also tests the lean hook.

### 2026-10-03 — ready to share

- `main` is protected: pull requests with green CI, the maintainer's review for outside changes, no force-push.
  Release tags cannot be moved or deleted.
- Private vulnerability reporting, secret scanning with push protection, Dependabot for GitHub Actions.
- CI runs with a read-only token, pinned actions, a pinned Claude Code version, and a check for personal paths and
  email addresses.
- The public history uses the GitHub noreply address.
- `.claude/settings.local.json` is ignored, so personal Claude Code settings never reach a pull request.
- New: SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, issue and pull request templates, CODEOWNERS,
  docs/security-audit.md, and a README for session-board.
