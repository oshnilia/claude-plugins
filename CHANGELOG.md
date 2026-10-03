# Changelog

Each plugin has its own version. A release is a git tag `<plugin>--v<version>`.

## session-board

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
- New: SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, issue and pull request templates, CODEOWNERS,
  docs/security-audit.md, and a README for session-board.
