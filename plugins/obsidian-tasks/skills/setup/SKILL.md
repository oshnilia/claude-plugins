---
name: setup
description: Bind this project to a task board in an Obsidian vault (a Kanban plugin board or a Bases board), or create one, and choose how Claude reaches the vault - its folder, the Obsidian CLI or an Obsidian MCP server. Use when the person asks to connect an Obsidian board or vault to the project, to change the board, or to check the binding ("подключи доску из Obsidian", "настрой obsidian-tasks"), or runs /obsidian-tasks:setup.
argument-hint: "[board file path, vault path or board name]"
---

# Bind the project to an Obsidian board

The binding is one local file, `.claude/obsidian-tasks.json`, in this project. Each person binds their own board; the
file stays out of git. The rules are in `/obsidian-tasks:rules`.

1. **Find the vaults and the boards.**
   - A path in the arguments: a board file (`.md` or `.base`) or a vault folder. A vault is the folder that holds
     `.obsidian/`.
   - Otherwise read Obsidian's list of vaults: `~/Library/Application Support/obsidian/obsidian.json` (macOS),
     `~/.config/obsidian/obsidian.json` (Linux), `%APPDATA%\obsidian\obsidian.json` (Windows). Keep only paths that
     exist. With the CLI, `obsidian vaults verbose` gives the same list.
   - In each vault, a board is a `.md` file whose frontmatter has `kanban-plugin:` (format `kanban`) or a `.base` file
     (format `bases`). Prefer names like "Roadmap", "Tasks", "Board", «Роадмап», «Задачи» and the project's name.
   - Read only the board files and the frontmatter of the notes they point to. Read no other notes.

2. **Ask once.** Put everything the files do not decide into ONE AskUserQuestion:
   - the board: up to three found boards (vault and path) and «Создать новую доску»;
   - how Claude reaches the vault:
     - «Папка хранилища» (`files`, the default): Claude reads and edits the files. Obsidian need not run.
     - «Obsidian CLI» (`cli`): offer it only when `obsidian` is on the PATH. Obsidian must be running. Claude sets
       properties and lists Bases boards the way Obsidian does.
     - «MCP-сервер Obsidian» (`mcp`): offer it only when this session has Obsidian MCP tools (names with "obsidian"
       or "vault" that read and write notes). For a vault Claude cannot reach as a folder.
   - «Разрешить Claude папку хранилища?» when the vault is outside this project and access is `files` or `cli`: yes
     adds the vault folder to `permissions.additionalDirectories` in `.claude/settings.local.json`, so reading and
     editing it does not ask each time;
   - «Работать только по тикету?» (`require_ticket`; default no);
   - and what step 3 leaves open.

   To create a board, also ask where (a vault and a folder) and which format: Bases (the default: it is part of
   Obsidian) or Kanban (the Kanban community plugin must be on to show it as a board). Create, in the person's
   language:
   - Bases: the folder `Tickets` and `Roadmap.base`:

     ```yaml
     filters:
       and:
         - file.inFolder("<folder>/Tickets")
     views:
       - type: kanban
         name: Board
         groupBy:
           property: note.status
           direction: ASC
         groupOrder: [To do, In progress, Done]
       - type: table
         name: All
         order: [file.name, status, type, priority]
     ```
   - Kanban: the folder `Tickets` and `Roadmap.md`:

     ```markdown
     ---

     kanban-plugin: board

     ---

     ## To do



     ## In progress



     ## Done

     **Complete**



     ```

3. **Map the board.** Read every name from the files; never write one from memory.

   | Field | Kanban | Bases |
   |---|---|---|
   | `status` | `property` null; `todo` = the first lane or one like "To do", "Backlog", «Сделать»; `doing` = a lane like "In progress", "Doing", «В работе»; `review` = a lane like "Review", «На проверке», else null; `done` = the lane with `**Complete**`, or one like "Done", «Готово» | `property` = the `groupBy` property of a kanban view without `note.`, else a property like `status`, «Статус» in the ticket notes; the four values from `groupOrder`, else from the values the notes use |
   | `folder` | the folder where most linked notes are, else the board's folder | the folder in `file.inFolder(...)` of the filters, else the folder of most ticket notes |
   | `tag` | null | the tag in `file.hasTag(...)`, else null |
   | `type` | a frontmatter property like `type`, «Тип» in the ticket notes with a value for follow-ups and one for bugs; else null | the same |
   | `priority` | a property like `priority`, «Приоритет» and its values from high to low; else null (the order of cards in a lane) | the same |

   If the filters of a Bases board need more than `folder` and `tag`, a new ticket may not show on it: say so, and
   suggest the CLI, which can check it.

4. **Write the binding** to `.claude/obsidian-tasks.json`:

   ```json
   {
     "vault": "<absolute path to the vault folder, or null with mcp>",
     "vault_name": "<the vault's name in Obsidian>",
     "access": "files",
     "board": "<board path from the vault root>",
     "name": "<board name>",
     "format": "kanban",
     "folder": "<folder of ticket notes from the vault root>",
     "tag": null,
     "status": { "property": null, "todo": "<lane or value>", "doing": "<…>", "review": null, "done": "<…>" },
     "type": { "property": "<name>", "followup": "<value>", "bug": "<value>" },
     "priority": { "property": "<name>", "order": ["<high>", "<medium>", "<low>"] },
     "require_ticket": false
   }
   ```

   `type` and `priority` are null when the notes have no such property. `vault_name` is the vault folder's name unless
   Obsidian shows another (`obsidian vault info=name`).

5. **Keep it out of git.** In a git repository, run:

   ```bash
   git ls-files --error-unmatch .claude/obsidian-tasks.json 2>/dev/null && echo TRACKED
   git check-ignore -q .claude/obsidian-tasks.json || echo .claude/obsidian-tasks.json >> "$(git rev-parse --git-path info/exclude)"
   ```

   If it prints `TRACKED`, the file is in the repository and the plugin ignores it: tell the person to remove it from
   git (`git rm --cached`) and stop.

6. **Allow the folder** if the person said yes: add the vault path to `permissions.additionalDirectories` in
   `.claude/settings.local.json`; create the file, or keep everything already in it. It takes effect in the next
   session.

7. **Tell the person** in three short lines: the board and the access, which lanes or values mean start and done,
   and that new sessions read the binding. For this session, load `/obsidian-tasks:rules` now.
