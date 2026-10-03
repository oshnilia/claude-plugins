# Session board logic (v4, approved 2026-10-03)

The person who runs a session may run 30 of them at once and switch between them all the time.
The board removes micromanagement: the person gives **all input at the start** and **all feedback at the end**.
Between these two touches Claude works on its own and calls the person only for a blocker.

Each board belongs to one session. There is no cross-session queue.

## Flow of one task

```
none ──► intake ──Start──► work ──submit──► review ──Accept──► accepted
           ▲                 ▲                 │
           │                 └─── Return ──────┤   (round + 1)
           │                 └─── Accept with fixes: the next submit closes the task
           └── a new task after "accepted" starts a fresh ledger
```

| Phase | Who acts | What happens |
|---|---|---|
| `none` | person | No brief. The band offers "Поставить задачу". |
| `intake` | Claude, then person | Claude turns the person's words into the brief (`task` tool) and asks all missing questions in ONE `AskUserQuestion`. The person checks the brief and presses **Старт**. |
| `work` | Claude | Claude works alone within its authority. A blocker becomes a card in "Нужен ты". Any other choice: Claude takes the default and records it as a decision or an assumption. |
| `review` | person | Claude checked every criterion and called `submit`. The board built `report.html` and shows the Acceptance screen. |
| `accepted` | nobody | Goals are done. The report is final. |

Work that starts without an intake still gets a task folder (`formal: false`) once it has a goal.
The Task screen then offers "Оформить задание".

## The brief (the contract)

| Field | Content |
|---|---|
| Цель | what must change and why |
| Результат | what to hand in: files, PR, report, demo |
| Готово, когда | 2 to 5 checkable criteria (K nodes): a command, a test, a screenshot |
| Рамки | rules and bans (C nodes), out of scope |
| Полномочия | `careful`, `normal` or `bold`: what Claude does alone, what waits for the person |
| Материалы | files, links, examples |

The project default authority lives in `.claude/tasks/policy.json`.

| Level | Claude alone | Only with the person |
|---|---|---|
| осторожно | read, search, edit the task's files, run tests | new dependencies, commits, push, deletes, publishing, money, a change of goal |
| обычно | all of careful, dev dependencies, commits to the work branch | push, publishing, deleting what is not Claude's, money, a change of goal or result |
| смело | all of normal, push to the work branch, a pull request | merge to main, publishing outside, deletes, money, a change of goal |

A **blocker** is one of three things: an action outside the authority; a fork that is costly to undo and that the
brief does not decide; no way to continue (no access, the brief contradicts itself).

## Screens

The board opens on the screen of the current phase. A tab the person picks stays until the phase changes.

| Screen | Question it answers | Shows | The person learns | The person adds |
|---|---|---|---|---|
| Band above the prompt | Is Claude working, and do I have to act? | one state and one button: "Поставить задачу", "шаг 3 из 7", "нужен ты · N", "Принять работу" | whether to open the session at all | a jump to the right screen |
| 1 Задание | Do we agree on the same thing? | the brief, criteria with their status, rules, authority, materials; with no task: the template, the project authority, unfinished tasks of the project | how Claude understood the task and what "done" means | Start, a fix of the brief, authority, a rule, a ban, a fact, a criterion |
| 2 Ход | Where are we? | blocker cards, the main point (never the next step), goals with steps, what piles up for review | the state in 30 seconds | answers to blockers |
| 3 Приёмка | Can I accept this? | the verdict in one plain line, "Нужно от тебя", each criterion with one plain sentence (the technical proof folds under a toggle), decisions Claude took alone, assumptions, not done and risks, the report | what is proven and what is not, in 30 seconds | per item: wrong / comment (silence means right); "make it a rule"; one verdict |
| 4 Журнал | Can I trust this, and what changed? | Почему (chains, decisions), Ходы, Файлы with diffs, Память Claude (what Claude gets after compaction) | the reasoning, the changes, Claude's memory | "устарело" on any line, a fact, a ban, undo a decision |
| 5 Спросить | Explain this to me | a side question over the whole session | an answer that does not touch the session | nothing |

## Input channels

Every button shows where its effect goes.

| Channel | Effect | Buttons |
|---|---|---|
| → Claude now | a message in the session as the person's own | answers, Start, a fix of the brief, undo a decision, the verdict |
| → ledger, then Claude | the ledger changes at once; a note waits in "для Claude" and reaches Claude beside the person's next message (prompt `context`), or at once with "Отправить сейчас" | rule, ban, fact, criterion, "устарело", authority during work |
| only the person | a fork of the session; the transcript does not change | Спросить, "зачем это?", "проще", "схемой" |

A message the person types in the chat takes the open question cards down at once (status `pending`).
The cartographer then marks each one answered, or opens it again.

## Hand-in and the report

`submit` carries a summary, per criterion a status, one plain Russian sentence (`result_ru`) and the technical evidence,
what only the person can do now (`for_you`), verification steps, what is not done and what is next.
Every Russian field is written for a person who did not watch the session: the result first, short sentences,
no ledger ids, paths, run ids or tool names. Ids and commands go to the evidence, which the screen folds away.
The board writes `report.html` into the task folder: one self-contained page (no network) with

1. the verdict first: "proven 4 of 5 criteria", the summary, counts;
2. criteria with evidence, not done, risks, next steps;
3. what changed: `git diff` since Start, per file;
4. decisions (Claude's own first, with rejected options), assumptions, dead ends, rules;
5. the reasoning map: an interactive tree with filters and search;
6. the turns, with a player (buttons and ← →) that lights up the nodes of each turn;
7. how to check it yourself, with copy buttons.

The verdict lives in the pane, not in the report: a local page cannot write into the session.

## The verdict

| Verdict | Effect |
|---|---|
| Принять | goals done, phase `accepted`, the report is rebuilt |
| Принять с правками | phase `work`; Claude applies the fixes in one pass; the next `submit` closes the task with no new review |
| Вернуть | phase `work`, round + 1; Claude fixes everything in one pass and hands in again |

Everything goes to Claude in ONE message. Remarks marked "make it a rule" go to `.claude/tasks/RULES.md`;
the board gives these rules to Claude at the start of every session in the project.

## Files: the folder is the source of truth

```
.claude/tasks/
  .gitignore            # keeps task folders out of git; add a report with git add -f
  policy.json           # project default authority
  RULES.md              # rules from feedback, for every later task
  2026-10-03-<slug>/
    task.md             # the brief, readable
    ledger.json         # the full ledger (the board loads it)
    ledger.jsonl        # append-only op log
    ledger.md           # the ledger in plain English (Claude reads it)
    board.ru.md         # the ledger in Russian
    brief.md            # the short brief Claude gets after compaction
    report.html         # the report, after submit
    feedback.md         # every review round
.claude/session-board/<session id>/task.json   # which task this session works on
```

Compaction: the instructions give the summarizer the current brief with ids and tell it NOT to restate the ledger.
The summary keeps only what the files lack: work in progress, details said in passing, the last exchange.
The compaction hook adds the fresh brief and the protocol with the folder path as the last message of the compacted conversation. (A `session.append` from a timer never reached the compacted conversation.)

A new session in the same project lists the unfinished tasks on its Task screen; "Продолжить здесь" loads one.
