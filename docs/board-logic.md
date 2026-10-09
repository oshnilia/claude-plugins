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
           │                 └─── Redo / Extend after "accepted" (round + 1, no Start)
           └── a new task after "accepted" starts a fresh ledger
```

| Phase | Who acts | What happens |
|---|---|---|
| `none` | person | No brief. The band offers "Поставить задачу". |
| `intake` | Claude, then person | Claude turns the person's words into the brief (`task` tool) and asks all missing questions in ONE `AskUserQuestion`. The person checks the brief and presses **Старт**. |
| `work` | Claude | Claude works alone within its authority. A blocker becomes a card in "Нужен ты". Any other choice: Claude takes the default and records it as a decision or an assumption. |
| `review` | person | Claude checked every criterion and called `submit`. The board built `report.html` and shows the Acceptance screen. |
| `accepted` | person | Goals are done. The report is final until the person redoes or extends the task. |

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
| Band above the prompt | Is Claude working, and do I have to act? | one state and one button: "Поставить задачу", "шаг 3 из 7", "нужен ты · N", "Принять работу" | whether to open the session at all | a jump to the right screen; "Принять работу" accepts at once when no fixes are drafted |
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
The board writes `report.html` into the task folder: one self-contained page (no network, system fonts). It does not
repeat the pane: the pane is for the verdict, the report is for understanding the session.

1. The top answers "can I accept?": the verdict in one line with one square per criterion, the summary, "Нужно от тебя".
2. The route map is the centre. Each goal is a coloured line from left to right across the turns; its direct items are
   stations, deeper items hang on branches. Decisions are interchange rings, dead ends are grey stop bars, criteria are
   squares that turn green when proven. A busy turn gets a wider column, so the map shows where the work went.
3. Motion has one job: on open the session draws itself turn by turn (about four seconds), and "Проиграть сессию"
   replays it. The turn axis is a scrubber, ← and → step through turns, and the card under the map tells each turn:
   what was asked, what was done, what appeared.
4. A click on a station dims everything outside its lineage and opens the details: statement, status, for a decision
   why, what was chosen, what was rejected and at what cost, the evidence, where it came from, what is inside, its turn.
5. Below the map: "Развилки и тупики" in time order (a click finds the station on the map), "Что проверено" with the
   proof folded, "Что изменилось" with a bar per file and the diff on click, not done, risks, next, how to check.

The map stays inside the page column: its spacing shrinks to fit, and what still does not fit scrolls inside the frame. Reduced motion shows the final map at once. On a phone the details open as a bottom sheet. "Открыть отчёт" rebuilds the page every time.
The verdict lives in the pane, not in the report: a local page cannot write into the session.

## Free mode

Some sessions do not close one task: the person wants to discuss, brainstorm, try a prototype, iterate, work outside
the tickets. «Свободный режим» leaves the strict path and keeps what helps there.

| Step | What happens |
|---|---|
| Switch | A button on the Task screen (with no task, on a strict task in any phase, after a summary) or the chat word «Свободный режим». A formal task that is not accepted pauses: it keeps its phase and folder and waits under «Начатые задачи». Work without a brief carries on as the free session. The task gets `mode: 'free'`, phase `work`, no criteria. |
| Work | Claude works as a partner: talks, offers options, asks freely, prototypes. It keeps idea threads with the note tool (kind `idea`: open, trying, kept, dropped). The Work screen shows the ideas, the goals the cartographer finds and the question cards; the band shows `свободный режим · идей N · оставили K` and «Подвести итог». |
| Summary | «Подвести итог» (button, band, chat word «Итог») asks Claude to give each idea its final status and call `submit` without criteria. The board sets phase `accepted`, writes `summary.md` and shows it on the «Итог» tab: kept, dropped with the reason, undecided, decisions, next, for you. No verdict, no report. |
| After | A new brief from free mode starts a fresh task; the free session stays in its folder. «Продолжить здесь» brings back a paused task. |

The board's own messages never pass the board's `prompt.submit` hook (the engine skips the caller), so the switch
message carries the key rules in its text; the full free-mode protocol rides with the person's next message and after
compaction. A chat word passes the hook, so there the protocol comes in the same turn.

## The verdict

| Verdict | Effect |
|---|---|
| Принять | goals done, phase `accepted`, the report is rebuilt |
| Принять с правками | phase `work`; Claude applies the fixes in one pass; the next `submit` closes the task with no new review |
| Вернуть | phase `work`, round + 1; Claude fixes everything in one pass and hands in again |

Everything goes to Claude in ONE message. Remarks marked "make it a rule" go to `.claude/tasks/RULES.md`;
the board gives these rules to Claude at the start of every session in the project.

## After acceptance

The session goes on after «Принять». There are no buttons to pick what is next: the person writes, and Claude reads
the message as one of three ways. The Acceptance and Task screens and the band only say so. On the Acceptance screen,
before «Принять» (phase `review`), a message to redo or add reopens the task the same way, without a verdict; the
hint stands aside while the person has drafted remarks, because those leave with a verdict.

| Way | Effect |
|---|---|
| Переделать | The same task: phase `work`, round + 1, goals open again, no Start. The person's text is the instruction. |
| Дополнить | The same, and the text becomes a new done-when criterion under the task's goal. |
| Новая задача | A separate task: Claude writes a new brief and waits for Start; the accepted task stays in its folder. |

Each reopen goes into `feedback.md` as a round of its own; the next `submit` goes to review as usual. The chat words
«Переделать: …», «Вернуть: …» and «Дополнить: …» (the last one also on the Acceptance screen) reopen at once, and
`/board` on a phone asks one open question and passes the answer to Claude. Any other message is Claude's to read: the
protocol names the three ways, and the `reopen` tool (kind `redo` or `extend`) runs the reopen. A task accepted earlier and already replaced by a new one is not
reopened this way.

## lean in the flow

With the [lean](../plugins/lean) plugin the board adds lean to each step. It learns about lean from the line lean's
hook prints at session start ("lean is on. Level: full."), through `session.append`; a resumed session gets no new
line, so the board also looks for it in the conversation at start and with the person's first message. Without that
line the board shows nothing of lean.

| Step | What lean adds |
|---|---|
| Brief | `code`: lite, full, ultra or off, next to authority. Unset means lean's own setting. Start says `Код: lean <level> — …`; a change during the work goes as a board note. |
| Work | Claude records each thing it did not build (decision, tag `skipped`) and each `lean:` shortcut (decision, tag `shortcut`) with the note tool. The Work screen counts them. |
| Hand-in | The submit tool asks Claude to review the task's diff for over-engineering first and to record each finding (finding, tag `cut`), also for parts the person asked for by name; it never changes the code for them. `lean_check` carries the result in one plain line. |
| Acceptance | «Не построено» lists the three kinds. A mark is a fix in the one verdict: «добавить сейчас», «сделать полностью», «убрать». «Проверить на лишнее» sends the review request again. |
| Report, phone | A block «Что не построено и когда добавить»; the same list in the `/board` text card. |
| Project | The Task screen counts `lean:` comment markers with `git grep` (read only; markdown and JSON left out), at session start and after turns that changed files. «показать список» asks Claude for the lean-debt list. |

## notion-tasks in the flow

With the [notion-tasks](../plugins/notion-tasks) plugin a task can come from the person's Notion board. The board
does not know about Notion and its code does not change: the plugin's rules, printed at session start when the
project is bound to a board, tell Claude what to do at each board message.

| Step | What happens in Notion |
|---|---|
| Intake | `/notion-tasks:take` turns a ticket into the brief. The first rule is `Notion ticket: <URL>`, so the link stays in the brief after compaction; the URL is also the first material. The status does not change yet. |
| Start | «Старт по заданию …» → the ticket gets the binding's start status. |
| Work | Out-of-scope findings and bugs become new tickets on the same board. Each is a decision on the board (`Filed ticket: …`, the URL in evidence), so it shows at Acceptance. |
| Hand-in | With lean, each open `skipped` item becomes a follow-up ticket; its note gets the URL. The review status, if the board has one. |
| Acceptance | «Приёмка …: принято» (or the next `submit` after «принято с правками») → the done status and the closing report in the ticket. «вернуть на доработку» keeps the start status. |
| After acceptance | «Переделай задачу …» or «Дополни задачу …» (a button, a chat word or Claude's `reopen`) → the start status again; the next acceptance sets done and replaces the report. |
| Free mode | No ticket, no status, no report. At the summary each kept idea that still needs work becomes a follow-up ticket; its URL goes into the idea's evidence, so the summary shows it. |

[obsidian-tasks](../plugins/obsidian-tasks) gives the same steps for a board in an Obsidian vault: the first rule is
`Obsidian ticket: <path> (obsidian://…)`, the status is a Kanban lane or a note property, and the report is a section
at the end of the ticket note.

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
    summary.md          # the summary of a free session
.claude/session-board/<session id>/task.json   # which task this session works on
```

Compaction: the instructions give the summarizer the current brief with ids and tell it NOT to restate the ledger.
The summary keeps only what the files lack: work in progress, details said in passing, the last exchange.
The compaction hook adds the fresh brief and the protocol with the folder path as the last message of the compacted conversation. (A `session.append` from a timer never reached the compacted conversation.)

A new session in the same project lists the unfinished tasks on its Task screen; "Продолжить здесь" loads one.

Trust: the board applies `policy.json` and `RULES.md`, and lists task folders, only when git does not track them.
Files that come with a cloned repository are someone else's, so they never set Claude's authority or rules.
