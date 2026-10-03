# Security policy

## Report a vulnerability privately

Use **[Report a vulnerability](https://github.com/oshnilia/claude-plugins/security/advisories/new)** on the
Security tab. Only the maintainer sees the report. Do not open a public issue for a security problem.

Include:

- the plugin and its version (`claude plugin list`), and your Claude Code version (`claude --version`);
- what an attacker can do, and the steps to repeat it;
- a fix idea, if you have one.

The maintainer aims to reply within 7 days. A confirmed problem is fixed in a private advisory, a patched version is
released with a tag, and the advisory is published with credit to you, if you want it.

## Supported versions

Only the latest release of each plugin gets fixes. Releases are git tags named `<plugin>--v<version>`, for example
`session-board--v0.3.2`. Update with `claude plugin marketplace update oshn` and `claude plugin update <plugin>@oshn`.

## Scope

In scope: the code in `plugins/`, the marketplace manifest in `.claude-plugin/`, and the CI in `.github/`.
Problems in Claude Code itself go to Anthropic, not here.

## What the plugins can do on your machine

- **session-board** is a mod: its code runs inside your Claude Code session with your user rights. It reads and writes
  files only under `<project>/.claude/tasks/` and `<project>/.claude/session-board/`, runs `git` (read-only commands),
  `open` and `mv` (inside the task folder), and makes no network requests. Its model calls go through your own Claude
  Code session and use your tokens.
- **legible** has skills, commands and an output style. Its two scoring scripts use only the Python standard library,
  read the text you give them, and make no network requests. No skill pre-approves a tool.

The full review, with the threat model and the fixes, is in [docs/security-audit.md](docs/security-audit.md).

---

## По-русски

Об уязвимости сообщай **только приватно**: вкладка Security → [Report a vulnerability](https://github.com/oshnilia/claude-plugins/security/advisories/new).
Сообщение видит только мейнтейнер. Публичный Issue для уязвимости не открывай. Укажи плагин и версию, версию
Claude Code, что может сделать атакующий и как это повторить. Ответ — в течение недели. Исправления получает только
последний релиз каждого плагина.
