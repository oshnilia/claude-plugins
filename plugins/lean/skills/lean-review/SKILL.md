---
name: lean-review
description: Review for over-engineering only - what to delete, what the standard library or platform already does, abstractions with one user. A diff by default; the whole repository for an audit. Use when the user asks "is this over-engineered", "what can we delete", "review for bloat", "audit this repo for over-engineering", "find what to simplify", or types /lean-review. A report; it changes nothing.
argument-hint: "[diff|repo|<path>]"
---

# lean-review

Find what to cut. One line for each finding: where, what to cut, what replaces it. The best result is a shorter
codebase.

## Scope

- No argument or `diff`: the current diff (`git diff` and staged changes; the branch against its base if both are
  empty).
- `repo`: the whole tree, an audit. Rank findings by size, the biggest cut first.
- A path: that file or folder.

## Tags

- `delete:` dead code, flexibility nobody uses, a speculative feature. Nothing replaces it.
- `stdlib:` a hand-made copy of what the standard library has. Name the function.
- `native:` a dependency or code that does what the platform does. Name the feature.
- `reuse:` the same helper or pattern already lives in this repo. Name the path.
- `yagni:` an interface with one implementation, a setting nobody sets, a layer with one caller.
- `shrink:` the same logic in fewer lines. Show the shorter form.

In an audit, also look for: dependencies the standard library or platform covers, factories with one product,
wrappers that only pass calls through, dead flags and settings. Before you write `delete:`, search the whole tree for
the name, also in tests, fixtures, strings and dynamic references.

## Format

`<file>:L<line>: <tag> <what to cut>. <replacement>.`

```
src/form.ts:L12-38: stdlib: 27-line email validator class. "@" in the address; the confirmation mail is the real check.
src/date.ts:L4: native: moment.js for one format call. Intl.DateTimeFormat, no dependency.
src/util.ts:L18-29: reuse: slugify copies src/lib/slug.ts. Delete it and import the existing one.
repo.py:L88: yagni: AbstractRepository with one implementation. Inline it until a second one exists.
```

End with `net: -<N> lines possible` (in an audit also `-<M> dependencies`). If there is nothing to cut, say
`Lean already. Ship.` and stop.

Tags and code stay as they are; write the rest of each line in the user's language, in plain words.

## Limits

Only complexity. Bugs, security holes and speed go to a normal review. One small test or `assert` check is the lean
minimum, never a finding. This skill reports and changes nothing.
