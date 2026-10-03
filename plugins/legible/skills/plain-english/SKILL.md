---
name: plain-english
description: Write English in ASD-STE100 Simplified Technical English at a chosen strictness - 80% of the way to ASD-STE100 by default, 50% or 100% on request. Use when the user asks for ASD-STE100, STE, Simplified Technical English, "80% of the way to ASD-STE100", or for plain, simple, clear or controlled English; when the user asks to clean up, simplify or rewrite text in plain English (a PR description, docs, a summary, a status update, an error message); and when you write text that a busy reader or another agent must parse fast.
license: MIT
metadata:
  version: 0.2.0
---

# Plain English: ASD-STE100, 80% of the way

Write in **ASD-STE100 Simplified Technical English**. You know this standard: its writing rules and its approved
words, each with one meaning. Use that knowledge. The level sets how far you go:

| Level | Ask yourself for | Use for |
|---|---|---|
| plain-50 | about 50% of the way to ASD-STE100 | chat, a light polish |
| **plain-80** (default) | 80% of the way to ASD-STE100 | answers, docs, PRs, summaries |
| plain-100 | ASD-STE100 in full: its rules and its approved words only | procedures, safety text, agent-to-agent text |

At plain-80 the sentences follow STE, but the text still reads like normal prose: keep a precise technical word when
the approved word would lose meaning. At plain-100 use only words you know to be approved, and only can, will or must.

## What must not change

1. Keep every fact of the source and add none. The rewrite does not say more than the source.
2. Do not invent who acts. If the source names no actor, make the receiver the subject ("the person on call gets a
   notification"), use an imperative step, or keep the passive for that one sentence. Never "we", "the system".
3. Keep the strength of every hedge at plain-50 and plain-80: "should probably fix" stays "probably fixes", "may have
   failed" stays. At plain-100, keep the uncertainty with "can" or a word such as "possibly".
4. Keep code identifiers, file names, commands and product names exactly as they are.
5. Put the answer first. Then the reasons.

## What to output

- The text only. No preamble, no list of changes, no rule table, unless the user asks why.
- If you kept a longer phrase on purpose because a shorter one loses precision, add one last line:
  `Kept as-is: "<phrase>" - <what would be lost>`. Leave the line out when there is nothing to report.
- At plain-100, mark each sentence where you had to break a rule with `‡`, and end with one line
  `STE deviations: <rule> - <why>`.
- Never say or imply that a text complies with ASD-STE100, conforms to it or is certified. ASD-STE100 is a trademark of
  ASD. You may say "written to ASD-STE100, 80% of the way".
- Write your own words in the same style: no contractions, no semicolons, in any note you add.

## Measure, if you have a shell

When a shell tool (Bash) is available and the user asked for a level or a score, run the structural scorer and fix
what it reports:

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/ste_score.py" --level 80 draft.md
```

Use `-` for stdin and `--json` for machine output. Then end with one line: `plain-80: 92%`.

When there is no shell tool, do not try to run the scorer in any other way, do not start a subagent for it, and say
nothing about it. Give no number. The scorer checks only sentence structure. It cannot check words.

Rules in our own words, with what the scorer checks: [references/rules.md](references/rules.md).
