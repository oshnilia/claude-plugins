#!/bin/sh
# SessionStart: print the lean rules at the level from the plugin option. Claude Code adds this output to the context.
level="${CLAUDE_PLUGIN_OPTION_LEVEL:-full}"
case "$level" in
  lite|full|ultra) ;;
  off) exit 0 ;;
  *) level=full ;;
esac
echo "lean is on. Level: $level. If mcp__session-board__note is in your tools or deferred tools, each 'Skipped:' line also goes to the board (see 'With session-board')."
# The rules are the /lean skill without its frontmatter.
awk 'n > 1; /^---$/ { n++ }' "$(dirname "$0")/../skills/lean/SKILL.md"
