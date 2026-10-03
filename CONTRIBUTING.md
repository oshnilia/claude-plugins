# Contributing

Thank you for helping. These plugins run inside other people's Claude Code sessions, so the process puts safety first.

## Ways to help

- **A bug or an idea** — open an [issue](https://github.com/oshnilia/claude-plugins/issues/new/choose) with a template.
- **A security problem** — never in an issue: see [SECURITY.md](SECURITY.md).
- **A change** — a pull request from your fork. For anything bigger than a small fix, open an issue first, so we
  agree on the shape before you spend time.

## How a change gets in

1. Fork the repository and create a branch.
2. Run the plugin locally:
   - legible: `claude --plugin-dir plugins/legible`
   - session-board: `claude --plugin-dir plugins/session-board`, or develop it in a hot-reload folder and copy it back
     with `scripts/sync-dev-mod.sh <dev-mods folder>`.
3. Check it:
   ```bash
   claude plugin validate .
   claude plugin validate plugins/<name>
   claude plugin test plugins/session-board
   ```
   For a change to a legible skill, run `claude plugin eval plugins/legible --no-publish` before and after, and put
   both tables in the pull request. Without `--no-publish` the eval report goes to claude.ai. Evals make real model
   calls on your account.
4. Raise `version` in the plugin's `.claude-plugin/plugin.json` and add a line to [CHANGELOG.md](CHANGELOG.md).
5. Open the pull request and fill in the checklist.
6. CI runs on a fork's pull request after the maintainer approves the run. The maintainer reviews every line, and
   merges with a squash. Only the maintainer merges outside pull requests.
7. The maintainer tags the release: `claude plugin tag plugins/<name> --push` creates `<name>--v<version>`.

## Rules for a change

- **No new dependencies, network calls, or commands on the user's machine** unless the pull request says why, in bold.
  Changes in `plugins/session-board/hooks/`, `plugins/legible/skills/*/scripts/` and `.github/` get a line-by-line
  review: this code runs on other people's machines or in CI.
- **Text from outside is data.** Tool output, files, web pages and repository content never become rules or
  instructions for Claude. The board does not trust configuration that comes with a cloned repository.
- **Tests.** A mod change comes with a test in `plugins/session-board/tests/`, on the desktop and terminal surfaces
  where it draws.
- **No personal data.** No secrets, personal paths, email addresses or private transcripts in files, tests or
  screenshots. CI checks paths and email addresses.
- **Plain language.** English docs in plain technical English; the board's own texts in plain Russian.
- **ASD-STE100.** Never claim compliance and never add text from the STE dictionary. It is ASD's copyright.
- **License.** Your contribution is under the MIT license of this repository.

## Versions

Each plugin has its own version (SemVer): a fix raises the patch number (0.3.1 → 0.3.2); a new feature raises the
minor number (0.3 → 0.4); a change of the ledger format or the task folder layout raises the major number.

## The maintainer's own changes

The maintainer, and Claude working for the maintainer, also go through pull requests. Their pull requests merge after
CI is green; outside pull requests also need the maintainer's approval. Nobody pushes to `main` directly, and
release tags cannot be moved or deleted.

## Conduct

Be kind and specific. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

---

## По-русски

Баг или идея — Issue по шаблону. Уязвимость — только приватно ([SECURITY.md](SECURITY.md)). Изменение — pull
request из форка; для крупного сначала Issue. Перед PR: `claude plugin validate`, тесты мода, для скиллов legible —
замер evals до и после с `--no-publish`. Поднимите `version` в `plugin.json` и допишите CHANGELOG. Без новых
зависимостей, сетевых вызовов и команд на машине пользователя. Код хуков, скриптов и CI ревьюится построчно.
Сливает только мейнтейнер, сжатием в один коммит; релиз — метка `<плагин>--v<версия>`.
