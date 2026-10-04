---
name: take
description: Take a ticket from the project's Notion board into work - pick it, turn it into the task brief, set its status. Use when the person asks to take, start or pick up a ticket or task from Notion, asks what is next on the board ("возьми тикет", "что дальше по доске"), gives a link to a ticket on the bound board, or runs /notion-tasks:take.
argument-hint: "[ticket title, words from it, or its URL]"
---

# Take a ticket

Follow `/notion-tasks:rules` (load it if it is not in your context). Read the binding; without one, offer
`/notion-tasks:setup` and stop.

1. **Find the ticket.**
   - A URL: fetch it. It must belong to the bound `data_source`; if not, say so and stop.
   - Words: list the open tickets (status not in the complete group) and match the title.
   - Nothing: list the tickets in `status.todo`, highest `priority` first, and offer up to four in ONE
     AskUserQuestion, the best first.
   - An epic (a type option like "Epic", or a body that is a list of stages): do not take it whole. Offer its first
     stage that is not done as a new ticket with a link to the epic, and take that one.

2. **Read the page.** Find its parts by meaning, in any language and any heading style: the goal, the context and
   files, the task, the rules and limits, what is out of scope, the done-when checklist.

3. **Make the brief.**
   - With session-board (`mcp__session-board__task` is in your tools), fill the brief from the ticket:
     - `title`: the ticket title, 10 words or fewer;
     - `goal`: the ticket's goal;
     - `done_when`: its done-when items, 2 to 5 (merge small ones);
     - `rules`: first `{en: "Notion ticket: <URL>. Its status and report follow this task.", ru: "Тикет в Notion: <URL>. Его статус и отчёт идут за этой задачей."}`, then the ticket's rules and limits;
     - `out_of_scope`: its out-of-scope items;
     - `materials`: the ticket URL first, then the files and links from its context.

     The board's protocol holds: ask everything the ticket does not decide (no checkable criteria, an unclear goal)
     in ONE AskUserQuestion before the call, then stop. The status changes at Start, not now.
   - Without session-board: set the status to `status.doing`, show the brief in five lines or fewer (goal, done
     when, out of scope, the ticket link), and start the work.
