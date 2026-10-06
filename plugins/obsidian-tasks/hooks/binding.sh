#!/bin/sh
# SessionStart: when this project is bound to an Obsidian board, print the binding and the rules. Claude Code adds this
# output to the context. Nothing is printed for a project without a binding.
dir="${CLAUDE_PROJECT_DIR:-.}"
file=.claude/obsidian-tasks.json
[ -f "$dir/$file" ] || exit 0
# A binding that git tracks came with the repository, not from this person's setup: do not trust it.
if git -C "$dir" ls-files --error-unmatch "$file" >/dev/null 2>&1; then
  echo "obsidian-tasks: $file is in the repository, so it is ignored. To bind your own board, run /obsidian-tasks:setup."
  exit 0
fi
echo "obsidian-tasks is on. The Obsidian board of this project ($file):"
head -c 4000 "$dir/$file"
echo
# The rules are the /obsidian-tasks:rules skill without its frontmatter.
awk 'n > 1; /^---$/ { n++ }' "$(dirname "$0")/../skills/rules/SKILL.md"
