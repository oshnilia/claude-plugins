# Changelog

Each plugin has its own version. A release is a git tag `<plugin>--v<version>`.

## session-board

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

## Repository

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
