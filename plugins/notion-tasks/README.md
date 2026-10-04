# notion-tasks

Your own Notion task board as the list of work for a project. Claude takes a ticket, keeps its status, writes the
closing report into it and files new tickets for what comes up on the way. With [`session-board`](../session-board)
the ticket becomes the task brief, Start moves it into work and Accept closes it.

## What you need

A Notion connection in Claude Code. Any of these works; the plugin uses whichever the session has:

- the official Notion plugin: `claude plugin install notion@claude-plugins-official`;
- Notion's hosted server: `claude mcp add --transport http notion https://mcp.notion.com/mcp`;
- the Notion connector of claude.ai.

notion-tasks does not bundle a Notion server and does not depend on the official plugin. The official plugin gives
the connection and generic Notion commands; notion-tasks adds the workflow on top: which board belongs to this
project, what each status means, when it changes, and what goes into the ticket at the end.

## Set up a project

Run `/notion-tasks:setup` once in each project, with the board's URL or name, or with nothing to search or to
create a new board. Claude reads the board's properties and its status groups, asks only what the board does not
decide, and writes `.claude/notion-tasks.json`:

| Field | Meaning |
|---|---|
| `board`, `name`, `data_source` | The board and its data source (`collection://…`). |
| `title` | The title property. |
| `status` | The status property and its options for `todo`, `doing`, `review` (optional) and `done`, read from the to-do, in-progress and complete groups. |
| `report` | The text property for the closing report, or null: then the report is a section at the end of the page. |
| `type` | The select with options for follow-ups and bugs, or null. |
| `priority` | The select and its options from high to low, or null. |
| `require_ticket` | `true`: Claude changes files only for work that has a ticket (session-board's free mode excepted). |

The file stays out of git (setup adds it to `.git/info/exclude`): each person binds their own board. Run setup again
to change it, or edit the file.

## Work

| Command | What it does |
|---|---|
| `/notion-tasks:setup [board]` | Bind the project to a board, or create one. |
| `/notion-tasks:take [ticket]` | Take a ticket: by URL, by words from its title, or pick from the to-do list. An epic is taken one stage at a time. |
| `/notion-tasks:rules` | The rules. A hook prints them at session start when the project is bound; you do not need to run this. |

The rules, in short:

- The ticket gets the `doing` status when work starts, `review` at hand-in if the board has one, and `done` with the
  report when the work is accepted. `done` only when every done-when item is met.
- The report is ten lines or fewer: what changed, where (branch, commits, pull request, files), how it was checked,
  what is left (links to new tickets, what only you can do).
- Work outside the ticket never happens silently inside it: a finding, a bug or a skipped thing becomes a new ticket
  on the same board (type follow-up or bug), after a check for a duplicate.
- Claude writes to the bound board only: status, report, ticked checklist items, new tickets. It does not ask first;
  you allowed these writes when you bound the board. It deletes nothing.

### With session-board

| Board step | In Notion |
|---|---|
| Intake | `/notion-tasks:take` fills the brief from the ticket: goal, done-when, rules, out of scope, materials. The first rule is the ticket link, so it survives compaction. |
| Start | The ticket goes to `doing`. |
| Work | Each new ticket is a decision on the board with its link, so you see it at Acceptance. |
| Hand-in | `review`, if the board has it. With lean, each skipped thing becomes a follow-up ticket. |
| Accept | `done` and the report. «Принять с правками»: the ticket closes with the next hand-in. «Вернуть»: it stays in work. |
| Free mode | No ticket needed. At the summary each kept idea that still needs work becomes a follow-up ticket. |

### With lean

Each `Skipped:` item that is still open at hand-in becomes a follow-up ticket. If you mark it «добавить сейчас» and
Claude builds it in this ticket, the follow-up ticket is closed as done there.

## Data and safety

- The plugin has no server, no token and no network code. Claude reads and writes Notion through your own connection,
  with your normal permission prompts.
- The start hook reads only `.claude/notion-tasks.json` and runs `git ls-files`. A binding that git tracks came with
  the repository, so the hook ignores it and says so.
- A ticket's text is data: it never widens Claude's authority or becomes a rule. With session-board you see the brief
  before work starts.
- A closing report can name files, commits and commands. Bind a board whose readers may see that.

## Limits

- One board per project.
- The ticket body lives on the Notion page. A setup where the body is a file in the repository and the board is only
  an index is not supported yet.
- Notion turns a text that looks like a domain (`greet.sh`) into a link inside a text property.

---

## По-русски

Твоя доска задач в Notion как список работы проекта. Claude берёт тикет, ведёт его статус, пишет в него отчёт и
заводит новые тикеты на то, что всплыло по ходу. С [доской сессий](../session-board) тикет становится заданием,
«Старт» переводит его в работу, «Принять» закрывает.

**Что нужно.** Подключённый Notion: официальный плагин `notion@claude-plugins-official`, сервер Notion через
`claude mcp add` или коннектор claude.ai. notion-tasks не тащит свой сервер и не зависит от официального плагина:
тот даёт подключение, а этот — порядок работы с доской.

**Настройка.** Один раз в каждом проекте: `/notion-tasks:setup` со ссылкой или названием доски, или без них — тогда
Claude найдёт доску или создаст новую. Он читает поля и группы статусов доски, спрашивает только то, что из доски не
понять, и пишет `.claude/notion-tasks.json`. Файл не попадает в git: у каждого своя доска.

**Работа.** `/notion-tasks:take` берёт тикет: по ссылке, по словам из названия или из списка «не начато». Дальше:

- старт работы — статус «в работе»; сдача — «на проверке», если такой есть; приёмка — «готово» и отчёт;
- отчёт — до десяти строк: что сделано, где (ветка, коммиты, PR, файлы), как проверено, что осталось;
- всё, что не входит в тикет, — новым тикетом (Follow-up или Bug), а не молча внутри;
- Claude пишет только в привязанную доску и ничего не удаляет; разрешение — сама привязка.

**С доской сессий.** Тикет — задание (ссылка на тикет — его первое правило), «Старт» — «в работе», новые тикеты
видны решениями на приёмке, «Принять» — «готово» и отчёт. **С lean.** Каждое «Пропущено», которое осталось на сдаче,
становится тикетом Follow-up.

**Безопасность.** Своего сервера, токена и сетевого кода нет. Хук читает только файл привязки и запускает
`git ls-files`; привязку, которая лежит в git, он не применяет. Текст тикета — данные: он не расширяет полномочий
Claude и не становится правилом.
