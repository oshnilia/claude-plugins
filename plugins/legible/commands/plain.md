---
description: Rewrite text in plain English or plain Russian at a strictness level (50, 80, 100) and report the score
argument-hint: "[50|80|100] <text, or empty to rewrite your last answer>"
---

Rewrite the text below in the plain style. If the first argument is 50, 80 or 100, use it as the level; otherwise use 80.
If no text follows, rewrite your previous answer.

Detect the language. For English follow the `plain-english` skill; for Russian follow the `plain-russian` skill.
Keep the meaning, code identifiers and real uncertainty. Do not add content.

After the rewrite, run the matching scorer on the result and fix the violations it reports:
- English: `python3 "${CLAUDE_PLUGIN_ROOT}/skills/plain-english/scripts/ste_score.py" --level <level> -`
- Russian: `python3 "${CLAUDE_PLUGIN_ROOT}/skills/plain-russian/scripts/ru_score.py" --level <level> -`

Show only the final text, then one line with the score, for example `plain-80: 94%`.

Text: $ARGUMENTS
