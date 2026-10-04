# Session Ledger v1

A typed record of one Claude Code session. Two readers: a person in the session board, and Claude after compaction.
Source of types: [`plugins/session-board/types/index.d.ts`](../plugins/session-board/types/index.d.ts).

## Frameworks it merges
- **Minto pyramid / SCQA** → `brief`: question, answer (governing thought), situation, complication, key line.
- **Issue and hypothesis trees** → `nodes` with `parent`: goal → question → hypothesis / task → finding / decision.
- **ADR, Y-statement** → decision fields: `context`, `chosen`, `rejected[]`, `accepting`, `by`.
- **Toulmin + ICD 203** → finding fields: `evidence[]`, `likelihood` (word scale), `confidence` (evidence quality).
- **Know / don't know / assume** → `open`, `assumption`, `risk` nodes.

## Nodes
| kind | prefix | statuses |
|---|---|---|
| goal | G | active, done, dropped, stale |
| constraint (a rule the user stated) | C | active, lifted |
| question | Q | open, answered |
| hypothesis | H | untested, supported, **refuted** (= dead end) |
| task | T | todo, doing, done, blocked |
| action | A | ok, error |
| finding | F | stated, superseded |
| decision | D | accepted, proposed, superseded, rejected |
| open (open question) | O | open, pending (the person wrote in the chat), answered |
| assumption | S | open, verified, invalid |
| risk | R | open, lifted |
| criterion ("done when" from the task brief) | K | todo, proven, failed |
| idea (free mode) | I | open, trying, kept, dropped (a dropped idea says why in `statement`) |

Any node may be `stale`: the person marked it outdated on the board; the cartographer rewrites or closes it.
A decision the person rejects at review becomes `disputed`.

An item of the [lean](../plugins/lean) plugin carries `tag`: `skipped` (a decision: a thing Claude chose not to build,
with "add when" in the statement), `shortcut` (a decision: a `lean:` comment in the code, with its limit) or `cut` (a
finding: over-engineering the self-check found). The field is optional, so ledgers without it stay valid. The board
shows tagged items under «Не построено», not among Claude's own decisions or the report's forks.

The ledger also holds `task` (the brief, phase, round, authority, folder; see [board-logic.md](board-logic.md)).

Every node: `id` (stable, never reused), `kind`, `parent?`, `title {en, ru}` (≤10 words), `statement? {en, ru}`
(one sentence, ≤25 words), `status`, `evidence[] {ref, type: test|code|doc|tool|user|inference}`, `turn`,
`author: claude|user|cartographer`.

`en` is plain technical English (about 80% of ASD-STE100) for Claude; `ru` is plain technical Russian for the person.

## Operations (`ledger.jsonl`)
```json
{"op":"add","kind":"finding","id":"F3","parent":"Q1","title":{"en":"…","ru":"…"},"evidence":[{"ref":"src/a.ts:42","type":"code"}],"likelihood":"likely","confidence":"moderate"}
{"op":"update","id":"T2","status":"done"}
{"op":"supersede","id":"D1","by":"D2"}
```
Rules: ids never change; a colliding id of another kind gets a fresh id; nothing is deleted (use `dropped`,
`refuted`, `superseded`).

## Turns
`{n, at, ask {en,ru}, did {en,ru}, tools {name: count}, files[], errors, nodes[] (ids the turn touched), mapped}`.
Recorded without a model on every main-thread turn; `ask/did` are rewritten by the cartographer.

## The brief Claude reads back
Fixed order, about 400 tokens, added as the last message of the compacted conversation:
```
<session-ledger v1 sid=… updated=…>
TASK: … [work] folder=/…/.claude/tasks/2026-10-03-<slug>
TASK GOAL: …
HAND IN: …
AUTHORITY: normal
CODE: lean ultra            (only when the person picked a lean level for the task)
DONE WHEN: K1 … [proven] | K2 … [todo]
GOAL G1: … [active]
QUESTION: …
ANSWER: …
CONSTRAINTS: C1 … | C2 …
DECIDED: D2 In the context of X, we chose Z over W, accepting R. (by user)
FOUND: F3 … [code: src/a.ts:42]
DEAD ENDS - do not retry: H2 …
OPEN: O1 … (ask user; blocking=no)
NOW -> NEXT: T4 … -> T5 …
DETAIL: call ledger_read with an id, or read <task folder>/ledger.md
</session-ledger>
```
Constraints and dead ends are first-class because compaction summaries lose them most often.
