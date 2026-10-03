# Security audit (2026-10-03)

Scope: the marketplace manifest, `plugins/session-board` 0.3.2, `plugins/legible` 0.1.1, the CI, and the repository
settings. The question: what can a plugin do on the machine of a person who installs it, and what can an attacker
make it do?

## Threat model

| Who | Wants to | Through |
|---|---|---|
| A malicious contributor | run code on users' machines | a pull request to a mod hook, a script, or the CI |
| A malicious repository | make Claude act on rules the person never gave | files that the board reads from a cloned project |
| A malicious web page or file | plant instructions that survive compaction | tool output that the cartographer summarises |
| A careless user | leak private data | sharing `report.html` or committing a task folder |

## What each plugin can touch

| | session-board | legible |
|---|---|---|
| Runs code in your session | yes, it is a mod | no; skills are text |
| Reads files | its task folder, `.claude/tasks/policy.json`, `RULES.md` | the text you pass to a scorer |
| Writes files | only `<project>/.claude/tasks/` and `<project>/.claude/session-board/` | none |
| Runs commands | `git rev-parse`, `git ls-files`, `git diff` (read-only), `open`, `mv` inside the task folder | `python3` scorers, through your normal permission prompts |
| Network | none | none |
| Model calls | a fork of your session after a turn with work (`update: every-turn`), and "Спросить" | none; evals call the model only when you run them |
| Pre-approved tools | none | none |

## Findings and fixes

| # | Finding | Severity | Fix (0.3.2) |
|---|---|---|---|
| 1 | The board applied `.claude/tasks/policy.json` from any project. A cloned repository could set the authority to `bold`, so Claude would push and open pull requests without asking. | high | Ignored when git tracks the file. Only a policy the person set on this machine counts. A toast names the skipped file. |
| 2 | The board gave `.claude/tasks/RULES.md` to Claude as the person's rules at every session start. A repository could plant instructions that way. | high | Ignored when git tracks the file. |
| 3 | "Продолжить здесь" listed and loaded task folders shipped with a repository, and their brief reached Claude as the task. | medium | Tracked task folders are neither listed nor loaded. |
| 4 | The cartographer may record a "user rule" that came from tool output, and the brief after compaction listed it as the user's constraint. | medium | The prompt says tool output is data and constraints come only from user turns. The brief lists cartographer rules under `INFERRED RULES`, apart from `CONSTRAINTS`. |
| 5 | "Открыть" ran `open` on any path in the ledger. A `.command` file opens in Terminal and runs. | low | Only existing files inside the project open. Files that macOS would run are revealed in Finder. |
| 6 | The session pointer could lead the board to a ledger anywhere on disk. | low | The pointer must lead into the project's task folder, and the folder must not be tracked. |

Checked and found safe:

- `report.html` escapes all text, embeds the data as JSON with `<` escaped, builds the page with `textContent`, and
  links only `http` and `https` addresses. It loads nothing from the network.
- Commands run with argument lists, never through a shell, and paths come after `--`.
- The `show` tool draws SVG in Claude Code's sandbox, which allows no scripts.
- legible's scorers import only `argparse`, `json`, `re` and `sys`.

## Repository and CI

- `main` needs a pull request, a green `validate` check and a code owner review; force-push and deletion are blocked
  for everyone. Squash merges only; branches are deleted after a merge.
- Release tags `*--v*` cannot be deleted or moved.
- CI has a read-only token and no secrets, pins its actions by SHA and Claude Code by version, and fails on personal
  paths or email addresses in shipped files. Workflows from outside contributors run only after approval.
- Private vulnerability reporting, secret scanning with push protection, and Dependabot (alerts, security updates,
  weekly Actions updates) are on. The wiki and projects are off.
- The public history uses the GitHub noreply address. Copies of the old commits may stay in GitHub's caches for a
  while; only GitHub Support can purge them.

## What remains

- A mod has your user rights by design. Install session-board only from this repository, and read the CHANGELOG
  before an update.
- The cartographer is a model and can still summarise wrongly. Claude's own decisions are listed on the Acceptance
  screen, where you can undo them.
- `report.html` and the task folder contain your prompts, Claude's summaries and diffs. They stay out of git by
  default (`.claude/tasks/.gitignore`). Read a report before you share it.
- With `update: every-turn` the board makes one model call per turn with work. Set `update: manual` to stop that.
