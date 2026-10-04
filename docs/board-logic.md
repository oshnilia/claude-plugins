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

## The verdict

| Verdict | Effect |
|---|---|
| Принять | goals done, phase `accepted`, the report is rebuilt |
| Принять с правками | phase `work`; Claude applies the fixes in one pass; the next `submit` closes the task with no new review |
| Вернуть | phase `work`, round + 1; Claude fixes everything in one pass and hands in again |

Everything goes to Claude in ONE message. Remarks marked "make it a rule" go to `.claude/tasks/RULES.md`;
the board gives these rules to Claude at the start of every session in the project.

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

Trust: the board applies `policy.json` and `RULES.md`, and lists task folders, only when git does not track them.
Files that come with a cloned repository are someone else's, so they never set Claude's authority or rules.
