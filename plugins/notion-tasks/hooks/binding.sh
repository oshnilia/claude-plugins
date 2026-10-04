#!/bin/sh
# SessionStart: when this project is bound to a Notion board, print the binding and the rules. Claude Code adds this
# output to the context. Nothing is printed for a project without a binding.
dir="${CLAUDE_PROJECT_DIR:-.}"
file=.claude/notion-tasks.json
[ -f "$dir/$file" ] || exit 0
# A binding that git tracks came with the repository, not from this person's setup: do not trust it.
if git -C "$dir" ls-files --error-unmatch "$file" >/dev/null 2>&1; then
  echo "notion-tasks: $file is in the repository, so it is ignored. To bind your own board, run /notion-tasks:setup."
  exit 0
fi
echo "notion-tasks is on. The Notion board of this project ($file):"
head -c 4000 "$dir/$file"
echo
# The rules are the /notion-tasks:rules skill without its frontmatter.
awk 'n > 1; /^---$/ { n++ }' "$(dirname "$0")/../skills/rules/SKILL.md"
