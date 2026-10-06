---
name: take
description: Take a ticket from the project's Obsidian board into work - pick it, turn it into the task brief, set its status. Use when the person asks to take, start or pick up a ticket or task from the Obsidian board, asks what is next on the board ("возьми тикет", "что дальше по доске"), names a card or a note of the bound board, or runs /obsidian-tasks:take.
argument-hint: "[ticket title, words from it, or its note]"
---

# Take a ticket

Follow `/obsidian-tasks:rules` (load it if it is not in your context). Read the binding; without one, offer
`/obsidian-tasks:setup` and stop.

1. **Find the ticket.**
   - A note or a path: it must be a ticket of the bound board (a card on the Kanban board links it, or the Bases board
     shows it); if not, say so and stop.
   - Words: list the open tickets (status not `status.done`) and match the title.
   - Nothing: list the tickets in `status.todo`, highest `priority` first (on a Kanban board without `priority`, the
     top cards of the lane), and offer up to four in ONE AskUserQuestion, the best first.
   - An epic (a `type` value like "Epic", or a body that is a list of stages): do not take it whole. Offer its first
     stage that is not done as a new ticket with a link to the epic, and take that one.
   - A Kanban card without a note: create its note now, as the rules say.

2. **Read the note.** Find its parts by meaning, in any language and any heading style: the goal, the context and
   files, the task, the rules and limits, what is out of scope, the done-when checklist. On a Kanban board, the card's
   own text counts too.

3. **Make the brief.**
   - With session-board (`mcp__session-board__task` is in your tools), fill the brief from the ticket:
     - `title`: the ticket title, 10 words or fewer;
     - `goal`: the ticket's goal;
     - `done_when`: its done-when items, 2 to 5 (merge small ones);
     - `rules`: first `{en: "Obsidian ticket: <path> (<obsidian:// link>). Its status and report follow this task.", ru: "Тикет в Obsidian: <path> (<obsidian:// link>). Его статус и отчёт идут за этой задачей."}`, then the ticket's rules and limits;
     - `out_of_scope`: its out-of-scope items;
     - `materials`: the ticket's `obsidian://` link first, then the files and links from its context.

     The board's protocol holds: ask everything the ticket does not decide (no checkable criteria, an unclear goal)
     in ONE AskUserQuestion before the call, then stop. The status changes at Start, not now.
   - Without session-board: set the status to `status.doing`, show the brief in five lines or fewer (goal, done
     when, out of scope, the ticket link), and start the work.
