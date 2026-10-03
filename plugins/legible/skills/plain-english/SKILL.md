---
name: plain-english
description: Write English in a controlled, plain technical style inspired by ASD-STE100, at a measurable strictness (plain-50, plain-80 default, plain-100). Use when the user asks for plain, simple or clear English, STE, ASD-STE100, controlled English or "80% STE", and when you write text that a busy reader or another agent must parse fast - summaries, PR descriptions, docs, error messages, status updates.
license: MIT
metadata:
  version: 0.1.1
---

# Plain English (inspired by ASD-STE100)

This style is inspired by ASD-STE100. It is not certified and does not claim compliance.
ASD-STE100 is a trademark of ASD. Do not say that a text "complies with ASD-STE100".

## Levels

| Level | Use for | What changes |
|---|---|---|
| plain-50 | chat, light polish | short sentences, no semicolons, active voice |
| **plain-80** (default) | answers, docs, PRs, summaries | + the structural rules below |
| plain-100 | procedures, safety text, agent-to-agent text | + no -ing forms, no perfect tenses, only can/will/must, no wordy words |

## Rules for plain-80

1. Put the answer first. Then give the reasons.
2. Keep procedure sentences to 20 words or fewer. Keep description sentences to 25 words or fewer.
3. Write one instruction per sentence. Use the imperative: "Open the file."
4. Put the condition before the command: "If the test fails, read the log."
5. Use the active voice. Say who does the action. If the source does not say who acts, do not invent an actor:
   make the receiver the subject ("the person on call gets a notification"), or keep the passive for that one sentence.
6. Use simple tenses: present, past, future.
7. Use no more than 3 nouns in a row. Break "build cache key generator config" into a phrase with "of" or "for".
8. Use one verb, not a phrasal verb: "configure", not "set up"; "find", not "find out".
9. Do not use semicolons or contractions.
10. Keep one topic per paragraph and no more than 6 sentences.
11. Use one word for one thing. Do not switch between synonyms for the same item.
12. Keep code identifiers, file names, commands and product names exactly as they are.

Do not make the text sound like an aviation manual. Keep the meaning and the hedges ("may", "probably") when they carry real uncertainty.
Keep every fact of the source, and add none: the rewrite must not say more than the source says.

## What to output for a rewrite

Give the rewritten text only. Do not add a list of changes unless the user asks why: a change list quotes the
words you removed, and the reader must not find them again. Do not explain what you could not run.

## Measure, then fix

Run the scorer on your draft when the text is longer than a few sentences or the user asked for a level:

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/ste_score.py" --level 80 draft.md
```

Use `-` to read from stdin. Use `--json` for machine output. Fix each violation, then run it again.
The scorer checks only structure. It cannot check word meaning, so read the text once more yourself.

When the user asked for a level and you ran the scorer, end with one line: `plain-80: 92%`.
When you cannot run it (no shell), leave the line out. Do not guess a number.

Full rule list in our own words, with what the script can and cannot check: [references/rules.md](references/rules.md).
