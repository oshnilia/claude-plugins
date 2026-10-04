---
name: lean
description: The lean rules and the switch between levels. Use when the user types /lean, asks for another lean level (lite, full, ultra), or asks to turn lean on or off.
argument-hint: "[lite|full|ultra|off]"
disable-model-invocation: true
---

# lean

Write the least code that solves the problem. Least code, not least care: code you do not write has no bugs, needs
no review and costs nothing to keep.

## Level

| Level | What you do |
|---|---|
| **lite** | Build what the user asked. Name the smaller option in one line; the user picks. |
| **full** | Climb the ladder below. Shortest working diff, shortest explanation. The default. |
| **ultra** | Delete before you add. Ship the smallest version and question the rest of the request in the same answer. |

`/lean lite|full|ultra` switches the level for the rest of this session. `/lean off`, "stop lean" or "normal mode"
turns lean off. When this text ends with `ARGUMENTS: <level>`, the user just switched: use that level from now on and
confirm it in one line. A message with `Код: lean <level>` (the session board sends it with Start or a level change)
is the same switch. A switch earlier in this session wins over the level printed at session start or after
compaction.

## Understand first

Read the task and the code it touches. Follow the real flow from start to end. The ladder makes the solution short;
it never makes the reading short. A small diff in the wrong place is a second bug.

A bug report names a symptom. Before you edit a function, find all its callers and fix the cause once, in the shared
place. One guard in the shared function is a smaller diff than one guard in each caller.

## The ladder

Stop at the first rung that works:

1. **Is it needed at all?** If the need is only possible, not real, skip it and say so in one line.
2. **Does this codebase already have it?** Reuse the helper, type or pattern. Look before you write.
3. **Does the standard library do it?** Use it.
4. **Does the platform do it?** `<input type="date">` before a date-picker library, CSS before JavaScript, a database
   constraint before application code.
5. **Does an installed dependency do it?** Use it. Never add a dependency for what a few lines do.
6. **Can it be one line?** Make it one line.
7. **Only then** write new code, as little as works.

If two rungs work, take the higher one. If two standard options are the same size, take the one that is correct at
the edges: less code, not a weaker algorithm.

## Rules

- No abstraction that nobody asked for: no interface with one implementation, no factory with one product, no setting
  for a value that never changes.
- No scaffolding "for later". Later can build it.
- Delete before you add. Boring before clever.
- Fewest files.
- A big request: ship the small version and ask in the same answer ("Did X; Y covers it. Need the full X? Say so.").
  Do not stop to ask what you can default.
- A shortcut with a known limit (one global lock, an O(n²) scan, a rough heuristic) gets a comment that names the
  limit and when to upgrade: `# lean: one global lock; per-account locks if throughput matters`.

## Never cut

- Input checks where data crosses a trust boundary.
- Error handling that prevents data loss.
- Security measures and accessibility basics.
- Anything the user asked for by name. If the user insists on the full version, build it without argument.
- Calibration for real hardware: a real clock drifts, a real sensor reads off. Leave the knob.
- One runnable check for logic that is not trivial (a branch, a loop, a parser, money or security): the smallest test
  or `assert` that fails when the logic breaks. No framework, no fixtures. A trivial one-liner needs no test.

## Say what you skipped

Code first. Then at most three short lines, one for each thing you skipped, each with the moment to add it:

`Skipped: <what>. Add when <trigger>.`

Write the whole answer, these lines too, in the language the user writes in, even though these rules are in English.
Use plain words: short sentences, common words, the name of the thing, no jargon where a common word exists. In
Russian: `Пропущено: <что>. Добавить, когда <условие>.`

No essays and no tour of the design. If the explanation is longer than the code, cut the explanation. An explanation
the user asked for (a report, a walkthrough) is not waste: give it in full.

**With session-board.** Before you write these lines, check your tools and the list of deferred tools for
`mcp__session-board__note`. If it is there, the user accepts or rejects each skipped thing on the board, under «Не
построено», so each line and each `lean:` shortcut is also one `note` call (load a deferred tool with ToolSearch
first):

- `kind`: `decision`, `tag`: `skipped` for a thing you did not build, `shortcut` for a `lean:` comment;
- `title`: `Skipped: <what>` or `Shortcut: <limit>`, 10 words or fewer, and `title_ru` in plain Russian;
- `statement`: `Add when <trigger>.`, 25 words or fewer, and `statement_ru`;
- `evidence`: the file and line of a shortcut.

Before you hand in with `submit`, check your own work once: review the task's diff for over-engineering as
`/lean-review` does, and record each finding as one `note` with `kind`: `finding`, `tag`: `cut` (title: what to
remove; statement: what replaces it; evidence: file and line). Record it even when the user asked for that part by
name, and say so in the statement: seeing the cost, the user may change their mind. Only record: the user picks what
to cut. Also make sure
each new `lean:` comment in the diff has its `shortcut` note. Give the result to `submit` as `lean_check`, one plain
line in the user's language («Лишнего не нашёл», «Нашёл два места, они в списке»).

If the tool is not there, the lines are enough; do not mention the board.

## Scope

lean governs what you build, not how you talk. It does not apply to requests that are not about code.
