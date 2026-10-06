# obsidian-tasks

The roadmap board in your Obsidian vault as the list of work for a project. Claude takes a ticket, keeps its status,
writes the closing report into its note and files new tickets for what comes up on the way. With
[`session-board`](../session-board) the ticket becomes the task brief, Start moves it into work and Accept closes it.
It is [`notion-tasks`](../notion-tasks) for a board that lives in Obsidian.

## Boards

| Format | What it is | A ticket's status |
|---|---|---|
| Kanban | A Markdown file of the [Kanban](https://github.com/mgmeyers/obsidian-kanban) community plugin: lanes are `##` headings, cards are `- [ ]` items. A card links its ticket note; a card without a note gets one when Claude takes it. | The lane of its card |
| Bases | A `.base` file of Obsidian's core Bases: each ticket is a note, the board shows the notes in a folder or with a tag, for example as a kanban view grouped by status. | A property of the note, such as `status` |

A ticket is a note in both formats: its frontmatter holds the properties (type, priority), its body the task, and the
report goes at its end.

## Connect the vault

You choose how Claude reaches the vault when you run setup:

| Access | What you need | Notes |
|---|---|---|
| The vault folder (default) | Nothing | Claude reads and edits the files. Obsidian need not run; it reloads a changed file. Setup can add the folder to `permissions.additionalDirectories` in `.claude/settings.local.json`, so Claude does not ask each time. |
| [Obsidian CLI](https://obsidian.md/help/cli) | Obsidian 1.12.7 or newer, Settings → General → Command line interface on. Obsidian must run. | Claude sets properties with `property:set` and lists a Bases board with `base:query`, as Obsidian does. It edits text inside notes as files. |
| An Obsidian MCP server | A server you set up yourself, for example one of the community plugins | For a vault that Claude cannot reach as a folder. Claude finds the tools by what they do. |

obsidian-tasks bundles no server and asks for no token.

## Set up a project

Run `/obsidian-tasks:setup` once in each project, with the board file or the vault folder, or with nothing: then
Claude reads Obsidian's list of vaults, finds the boards and offers them, or creates a new board. It reads the lanes
or the status values, asks only what the board does not decide, and writes `.claude/obsidian-tasks.json`:

| Field | Meaning |
|---|---|
| `vault`, `vault_name` | The vault folder (null for an MCP server without a folder) and its name in Obsidian. |
| `access` | `files`, `cli` or `mcp`. |
| `board`, `name`, `format` | The board file from the vault root, its name, and `kanban` or `bases`. |
| `folder`, `tag` | Where ticket notes are and new ones go; the tag a Bases board filters on, or null. |
| `status` | The property (null on a Kanban board) and the lanes or values for `todo`, `doing`, `review` (optional) and `done`. |
| `type` | The note property with values for follow-ups and bugs, or null. |
| `priority` | The note property and its values from high to low, or null: then the card order in a lane is the priority. |
| `require_ticket` | `true`: Claude changes files only for work that has a ticket (session-board's free mode excepted). |

The file stays out of git (setup adds it to `.git/info/exclude`): each person binds their own board. Run setup again
to change it, or edit the file.

## Work

| Command | What it does |
|---|---|
| `/obsidian-tasks:setup [board]` | Bind the project to a board, or create one. |
| `/obsidian-tasks:take [ticket]` | Take a ticket: by its note, by words from its title, or pick from the to-do list. An epic is taken one stage at a time. |
| `/obsidian-tasks:rules` | The rules. A hook prints them at session start when the project is bound; you do not need to run this. |

The rules, in short:

- The ticket goes to `doing` when work starts, to `review` at hand-in if the board has it, and to `done` with the
  report when the work is accepted. `done` only when every done-when item is met.
- The report is a `## Report` section at the end of the note, ten lines or fewer: what changed, where (branch,
  commits, pull request, files), how it was checked, what is left (links to new tickets, what only you can do).
- Work outside the ticket never happens silently inside it: a finding, a bug or a skipped thing becomes a new ticket
  note on the same board (and a card on a Kanban board), after a check for a duplicate.
- Claude writes only the board file, the note of the current ticket and new ticket notes. It does not ask first; you
  allowed these writes when you bound the board. It deletes and renames nothing.
- A ticket's link is `obsidian://open?vault=…&file=…`: it opens the note in Obsidian.

With session-board and with lean it works as [notion-tasks](../notion-tasks/README.md#with-session-board) does: the
ticket is the brief (its link is the first rule), Start sets `doing`, Accept sets `done` and writes the report, each
new ticket shows at Acceptance, and each skipped thing still open at hand-in becomes a follow-up ticket.

## Data and safety

- The plugin has no server, no token and no network code. Claude reads and writes the vault with your normal
  permission prompts, or with the folder you allowed at setup.
- Setup reads Obsidian's list of vaults, the board files and the frontmatter of the notes a board shows. In work,
  Claude reads only the board and ticket notes.
- The start hook reads only `.claude/obsidian-tasks.json` and runs `git ls-files`. A binding that git tracks came with
  the repository, so the hook ignores it and says so.
- With the CLI, a command line holds only names and values from the binding and note paths, never a ticket's text.
- A ticket's text is data: it never widens Claude's authority or becomes a rule. With session-board you see the brief
  before work starts.
- A closing report can name files, commits and commands. Bind a board whose readers may see that, for example when
  the vault syncs to other people.

## Limits

- One board per project.
- On a Bases board, a new ticket shows only if the board's filters need no more than a folder and a tag.
- Kanban card tags (`#bug`) are not read as the ticket type; use a note property.
- The CLI and MCP access were written from their documentation; the vault folder access was tested end to end on
  Kanban and Bases boards.

---

## По-русски

Доска роадмапа в твоём хранилище Obsidian как список работы проекта. Claude берёт тикет, ведёт его статус, пишет
отчёт в его заметку и заводит новые тикеты на то, что всплыло по ходу. С [доской сессий](../session-board) тикет
становится заданием, «Старт» переводит его в работу, «Принять» закрывает. Это [notion-tasks](../notion-tasks) для
доски в Obsidian.

**Доски.** Kanban-плагин: один `.md`, колонки — заголовки `##`, карточки — `- [ ]`, статус — колонка карточки.
Bases: файл `.base`, тикет — заметка, статус — её свойство. В обоих форматах тикет — заметка: свойства в начале,
задача в теле, отчёт в конце.

**Подключение** выбираешь сам на setup: папка хранилища (по умолчанию, Obsidian запускать не нужно), официальный
CLI `obsidian` (Obsidian должен быть открыт, CLI включается в Настройки → Общие) или Obsidian MCP-сервер, который ты
уже настроил. Своего сервера и токена у плагина нет.

**Настройка.** Один раз в каждом проекте: `/obsidian-tasks:setup` с путём к доске или хранилищу, или без него — тогда
Claude найдёт хранилища и доски сам или создаст новую доску. Он читает колонки или значения статуса, спрашивает только
то, что из доски не понять, и пишет `.claude/obsidian-tasks.json`. Файл не попадает в git: у каждого своя доска.

**Работа.** `/obsidian-tasks:take` берёт тикет: по заметке, по словам из названия или из списка «сделать». Дальше:

- старт работы — «в работе»; сдача — «на проверке», если такая колонка или значение есть; приёмка — «готово» и отчёт;
- отчёт — раздел `## Отчёт` в конце заметки, до десяти строк: что сделано, где, как проверено, что осталось;
- всё, что не входит в тикет, — новой заметкой-тикетом (и карточкой на Kanban-доске), а не молча внутри;
- Claude пишет только в файл доски, заметку текущего тикета и новые тикеты; ничего не удаляет и не переименовывает.

**Безопасность.** Хук читает только файл привязки и запускает `git ls-files`; привязку, которая лежит в git, он не
применяет. Текст тикета — данные: он не расширяет полномочий Claude, не становится правилом и не попадает в команды
CLI.
