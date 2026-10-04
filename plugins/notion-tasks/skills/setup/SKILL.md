---
name: setup
description: Bind this project to a Notion task board, or create a new board, and save the binding in the project. Use when the person asks to connect Notion tasks or a Notion board to the project, to change the board, or to check the binding ("подключи доску Notion", "настрой notion-tasks"), or runs /notion-tasks:setup.
argument-hint: "[board URL or name]"
---

# Bind the project to a Notion board

The binding is one local file, `.claude/notion-tasks.json`, in this project. Each person binds their own board; the
file stays out of git. Find the Notion tools as `/notion-tasks:rules` says (names that end with `notion-fetch`,
`notion-search`, `notion-query-data-sources`, `notion-create-database`); without them, say how to connect Notion and
stop.

1. **Find the board.**
   - A URL in the arguments: fetch it.
   - A name: search for it, then fetch the best match.
   - Nothing: search for task boards ("tasks", "roadmap", "board" and the project's name) and offer up to three
     matches and «Создать новую доску» in ONE AskUserQuestion.
   - To create a board, ask where (a page URL, or a private page) and create it with this schema (names in the
     person's language are fine):
     `CREATE TABLE ("Name" TITLE, "Status" STATUS, "Priority" SELECT('High':red, 'Medium':yellow, 'Low':green), "Type" SELECT('Feature':blue, 'Bug':red, 'Follow-up':orange, 'Chore':gray), "Report" RICH_TEXT)`.
   A database can hold several data sources: take the one with tasks, and fetch its `collection://` URL for the
   schema.

2. **Map the properties** from the schema. Read every name from the schema; never write one from memory.

   | Role | How to find it |
   |---|---|
   | `title` | the title property |
   | `status` | a property of type `status`: `todo` = the first option of the to-do group, `doing` = the first option of the in-progress group, `done` = the first option of the complete group, `review` = another in-progress option that means review ("In review", «На проверке»), else null. A `select` status has no groups: ask which options mean these. |
   | `report` | a text property for the result: "Solution", "Report", "Result", «Решение», «Отчёт»; else null (the report goes to the page body) |
   | `type` | a select like "Type" or «Тип» with an option for follow-ups and one for bugs; else null |
   | `priority` | a select like "Priority" or «Приоритет»; its options from high to low; else null |

   Ask in ONE AskUserQuestion only about what the schema does not decide, together with: «Работать только по
   тикету?» (`require_ticket`; default no).

3. **Write the binding** to `.claude/notion-tasks.json`:

   ```json
   {
     "board": "<database URL>",
     "name": "<board title>",
     "data_source": "collection://<id>",
     "title": "<title property>",
     "status": { "property": "<name>", "todo": "<option>", "doing": "<option>", "review": null, "done": "<option>" },
     "report": "<text property or null>",
     "type": { "property": "<name>", "followup": "<option>", "bug": "<option>" },
     "priority": { "property": "<name>", "order": ["<high>", "<medium>", "<low>"] },
     "require_ticket": false
   }
   ```

   `type` and `priority` are null when the board has no such property.

4. **Keep it out of git.** In a git repository, run:

   ```bash
   git ls-files --error-unmatch .claude/notion-tasks.json 2>/dev/null && echo TRACKED
   git check-ignore -q .claude/notion-tasks.json || echo .claude/notion-tasks.json >> "$(git rev-parse --git-path info/exclude)"
   ```

   If it prints `TRACKED`, the file is in the repository and the plugin ignores it: tell the person to remove it from
   git (`git rm --cached`) and stop.

5. **Tell the person** in three short lines: the board, which statuses mean start and done, and that new sessions
   read the binding. For this session, load `/notion-tasks:rules` now.
