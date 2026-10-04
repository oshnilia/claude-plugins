# oshn — Claude Code plugins for understanding what Claude does

Models now do more of the work. Our time moves to **understanding and checking** that work.
These plugins change the interface, not the model: answers in a format that fits the question, and a board that turns
a session into a task with a brief at the start and an acceptance at the end.

| Plugin | What it does | Where it works |
|---|---|---|
| [`session-board`](plugins/session-board) | A mod for people who run many sessions at once. Two touches per task: a brief with criteria and authority at the start, an Acceptance screen and an interactive HTML report at the end; Claude works alone in between. A free mode for brainstorming and prototypes keeps the ideas and ends with a summary. The task folder keeps the ledger, so compaction loses nothing. Board texts are in Russian. | Claude Code desktop (Code tab) and terminal |
| [`legible`](plugins/legible) | Karpathy's format ladder: ASD-STE100 text and plain Russian at a measurable strictness, diagram-first answers, HTML explainers, animated step players, teach-back checks | Claude Code; the skills also work on claude.ai |
| [`lean`](plugins/lean) | Claude writes the least code that solves the problem: reuse, standard library and platform before new code. It says in plain words what it skipped and when to add it. With session-board it is part of each step: a code level in the brief, a self-check before hand-in, «Не построено» at Acceptance. Based on [ponytail](https://github.com/DietrichGebert/ponytail). | Claude Code |
| [`notion-tasks`](plugins/notion-tasks) | Your own Notion task board as the list of work: take a ticket, keep its status, write the closing report, file follow-ups. It uses the Notion connection you already have (the official Notion plugin, `claude mcp add` or the claude.ai connector). With session-board the ticket becomes the brief, Start sets "In progress" and Accept sets "Done" with the report. | Claude Code, with Notion connected |

## Install

In a terminal:

```bash
claude plugin marketplace add oshnilia/claude-plugins
claude plugin install session-board@oshn
claude plugin install legible@oshn
claude plugin install lean@oshn
claude plugin install notion-tasks@oshn
```

Or inside a Claude Code session: `/plugin marketplace add oshnilia/claude-plugins`, then `/plugin install …`.
The plugins live in your user configuration, so the terminal and the desktop Code tab both load them in the next
session.

**Update** (read the [CHANGELOG](CHANGELOG.md) first, then restart the session):

```bash
claude plugin marketplace update oshn
claude plugin update session-board@oshn
```

**Settings** of session-board: `claude plugin configure session-board@oshn`.

| Option | Default | Meaning |
|---|---|---|
| `update` | `every-turn` | After each turn with work, one model call (a fork of the session, read from cache) updates the map. `manual`: only on `/board-update`. |
| `minTools` | `2` | Turns with fewer tool calls skip the model call. |
| `autoOpen` | `true` | Open the board when a session starts. |
| `injectAfterCompact` | `true` | After compaction, give Claude the task brief with ledger ids. |

**Settings** of notion-tasks: run `/notion-tasks:setup` once in each project. It finds or creates your board, reads
its properties and statuses, and writes `.claude/notion-tasks.json`, which stays out of git.

**Remove:** `claude plugin uninstall session-board@oshn`. The task folders in your projects stay; delete
`.claude/tasks/` yourself if you do not need them.

## Data and safety

- **No network of their own.** No plugin opens a connection or sends data anywhere by itself. session-board's model
  calls go through your own Claude Code session and use your tokens.
- **notion-tasks writes to your Notion board.** It asks Claude to use the Notion connection you set up yourself, and
  only on the board you bound in that project: a ticket's status, its closing report and new tickets. It has no
  server and no token of its own.
- **Local files only.** session-board writes only to `<project>/.claude/tasks/` and `<project>/.claude/session-board/`.
  Task folders stay out of git by default. A report contains your prompts, Claude's summaries and diffs: read it
  before you share it.
- **A mod runs code.** session-board runs inside your session with your user rights. It runs only read-only `git`
  commands, `open` and `mv` inside its task folder. Install it only from this repository.
- **Repository content is not trusted.** The board ignores a policy, rules or task folders that come with a cloned
  project, and it marks rules it inferred from tool output as unconfirmed. notion-tasks ignores a board binding that
  git tracks, and a ticket's text never widens Claude's authority.

Details: [SECURITY.md](SECURITY.md) and the [security audit](docs/security-audit.md).
Report a vulnerability **privately** through the [Security tab](https://github.com/oshnilia/claude-plugins/security/advisories/new).

## Contribute

Bugs and ideas: [issues](https://github.com/oshnilia/claude-plugins/issues/new/choose). Changes: a pull request from
a fork, after reading [CONTRIBUTING.md](CONTRIBUTING.md). Every change goes through review and CI; release tags
`<plugin>--v<version>` mark each version.

## Why

After Andrej Karpathy's post on the "format ladder" (plain controlled English → diagrams → interactive pages → video):
https://x.com/karpathy/status/2105819303471976479. References: [docs/references.md](docs/references.md).
How the board works: [docs/board-logic.md](docs/board-logic.md).

## Repository

- `plugins/<name>` — one folder per plugin; `version` lives in each `.claude-plugin/plugin.json`.
- `docs/` — references, the board logic, the ledger spec, the security audit.
- `scripts/sync-dev-mod.sh` — copy a mod from a hot-reload folder into the repo, then validate and test it.

ASD-STE100 is a trademark of ASD. legible asks the model to write in its style, does not ship or read its dictionary
and never claims compliance. License: [MIT](LICENSE).

---

## По-русски

Модели делают всё больше работы, а наше время уходит на то, чтобы **понимать и проверять** её. Здесь четыре плагина.

- **session-board** — мод для тех, кто ведёт много сессий сразу. Два касания на задачу: в начале задание со всеми
  вводными (цель, результат, пункты «готово, когда», полномочия), в конце приёмка одним вердиктом и интерактивный
  отчёт — схема метро всей сессии. Между ними Claude работает сам и зовёт тебя, только когда упёрся. Журнал лежит в
  папке задачи, поэтому сжатие переписки ничего не теряет. Подробно — в [README доски](plugins/session-board/README.md).
- **legible** — лестница форматов Карпаты: текст в ASD-STE100 и простой технический русский с измеримой строгостью,
  схема, HTML-страница, пошаговая анимация, проверка понимания. Подробно — в [README legible](plugins/legible/README.md).
- **lean** — Claude пишет минимум кода: сначала то, что уже есть в проекте, стандартная библиотека и возможности
  платформы, потом своё. После кода — строки «Пропущено: … Добавить, когда …». С доской lean входит в каждый шаг:
  уровень кода в задании, самопроверка на лишнее перед сдачей, раздел «Не построено» на приёмке. Основан на [ponytail](https://github.com/DietrichGebert/ponytail) Dietrich Gebert (MIT).
  Подробно — в [README lean](plugins/lean/README.md).
- **notion-tasks** — твоя доска задач в Notion как список работы: взять тикет, вести статус, записать отчёт, завести
  новые тикеты на то, что всплыло. Работает через то подключение Notion, что у тебя уже есть (официальный плагин,
  `claude mcp add` или коннектор claude.ai). С доской тикет становится заданием, «Старт» ставит «In progress»,
  «Принять» — «Done» и отчёт. Подробно — в [README notion-tasks](plugins/notion-tasks/README.md).

### Установка

В терминале:

```bash
claude plugin marketplace add oshnilia/claude-plugins
claude plugin install session-board@oshn
claude plugin install legible@oshn
claude plugin install lean@oshn
claude plugin install notion-tasks@oshn
```

Или внутри сессии Claude Code: `/plugin marketplace add oshnilia/claude-plugins`, затем `/plugin install …`.
Плагины ставятся в пользовательский конфиг, поэтому их увидят и терминал, и вкладка Code в desktop — в следующей сессии.

Обновление: `claude plugin marketplace update oshn`, затем `claude plugin update session-board@oshn` и перезапуск
сессии. Перед обновлением загляни в [CHANGELOG](CHANGELOG.md). Настройки доски: `claude plugin configure session-board@oshn`
(таблица выше). Удаление: `claude plugin uninstall session-board@oshn`; папки задач в проектах остаются. Доску Notion для
проекта настраивает `/notion-tasks:setup`: один раз в каждом проекте, файл `.claude/notion-tasks.json` в git не попадает.

### Данные и безопасность

- Сами плагины ничего не отправляют в сеть. Вызовы модели у доски идут через твою же сессию и тратят твои токены.
- notion-tasks пишет в твой Notion через подключение, которое ты настроил сам, и только в доску, привязанную к
  проекту: статус тикета, отчёт и новые тикеты. Своего сервера и токена у него нет. Привязку из чужого репозитория
  (файл в git) он не применяет, а текст тикета не расширяет полномочий Claude.
- lean — это текст и один хук на `sh`: при старте сессии он печатает правила. Файлы проекта он не читает и не пишет.
- Доска пишет только в `<проект>/.claude/tasks/` и `<проект>/.claude/session-board/`; папки задач не попадают в git.
  В отчёте твои запросы, сводки Claude и изменения — прочитай его, прежде чем кому-то отправить.
- Мод выполняет код в твоей сессии с твоими правами: только `git` на чтение, `open` и `mv` внутри папки задачи.
  Ставь его только из этого репозитория.
- Доска не доверяет содержимому чужих репозиториев: политику, правила и папки задач из клонированного проекта она
  не применяет, а правила, выведенные из вывода инструментов, помечает как неподтверждённые.

Об уязвимости — только приватно через вкладку [Security](https://github.com/oshnilia/claude-plugins/security/advisories/new).
Как предложить изменение — [CONTRIBUTING.md](CONTRIBUTING.md). Лицензия — MIT.
