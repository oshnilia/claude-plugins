#!/bin/sh
# Checks what the SessionStart hook prints at each level. Run: sh plugins/lean/tests/hook.sh
hook="$(dirname "$0")/../hooks/rules.sh"
fail() { echo "lean hook: FAIL: $1"; exit 1; }
level() { CLAUDE_PLUGIN_OPTION_LEVEL="$1" sh "$hook" | head -1 | cut -d' ' -f1-5; }

out=$(env -u CLAUDE_PLUGIN_OPTION_LEVEL sh "$hook")
[ "$(echo "$out" | head -1 | cut -d' ' -f1-5)" = "lean is on. Level: full." ] || fail "no option must give level full"
echo "$out" | grep -q '^## The ladder$' || fail "the rules are missing"
echo "$out" | grep -q '^disable-model-invocation:' && fail "the skill frontmatter leaked into the rules"

[ "$(level ultra)" = "lean is on. Level: ultra." ] || fail "level ultra"
[ "$(level lite)" = "lean is on. Level: lite." ] || fail "level lite"
[ -z "$(CLAUDE_PLUGIN_OPTION_LEVEL=off sh "$hook")" ] || fail "level off must print nothing"
[ "$(level 'x; rm -rf /')" = "lean is on. Level: full." ] || fail "an unknown level must fall back to full"

echo "lean hook: ok"
