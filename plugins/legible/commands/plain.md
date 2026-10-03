---
description: Rewrite text in ASD-STE100 style (English) or plain Russian at a strictness level (50, 80, 100)
argument-hint: "[50|80|100] <text, or empty to rewrite your last answer>"
---

Rewrite the text below. If the first argument is 50, 80 or 100, use it as the level; otherwise use 80.
If no text follows, rewrite your previous answer.

Detect the language. For English follow the `plain-english` skill: write in ASD-STE100 Simplified Technical English,
that percentage of the way. For Russian follow the `plain-russian` skill at plain-ru-<level>.
Keep the meaning, code identifiers and real uncertainty. Do not add content.

If a shell tool is available, run the matching scorer on the result, fix the violations it reports, and end with one
line with the score, for example `plain-80: 94%`:
- English: `python3 "${CLAUDE_PLUGIN_ROOT}/skills/plain-english/scripts/ste_score.py" --level <level> -`
- Russian: `python3 "${CLAUDE_PLUGIN_ROOT}/skills/plain-russian/scripts/ru_score.py" --level <level> -`

If there is no shell tool, show only the final text and say nothing about the scorer.

Text: $ARGUMENTS
