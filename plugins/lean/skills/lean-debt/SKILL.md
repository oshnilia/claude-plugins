---
name: lean-debt
description: List every `lean:` shortcut comment in the codebase as one debt ledger, so a deliberate shortcut does not quietly become permanent. Use when the user asks "what did lean defer", "list the shortcuts", "lean debt", "what did we mark to do later", or types /lean-debt. A report; it changes nothing.
---

# lean-debt

Each deliberate lean shortcut carries a `lean:` comment that names its limit and when to upgrade. This skill collects
them into one list.

## Scan

Search the repository for the comment marker and skip `.git`, `node_modules` and build output:

```
grep -rnE --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude='*.md' --exclude='*.json*' '(#|//|/[*]|--) ?lean:' .
```

The comment prefix keeps text that only mentions the convention out of the list. Add other prefixes if the stack
uses them.

## Output

One row for each marker, grouped by file:

`<file>:<line> - <what was simplified>. Limit: <the limit>. Upgrade when: <the trigger>.`

A marker that names no trigger gets the tag `no-trigger`: these are the ones that rot. End with
`<N> shortcuts, <M> without a trigger.` If there are none: `No lean: debt.`

Write the rows in the user's language, in plain words. If the user asks, write the list to a file such as
`LEAN-DEBT.md`; otherwise change nothing.
