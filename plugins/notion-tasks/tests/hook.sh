#!/bin/sh
# Checks what the SessionStart hook prints for a project with no binding, an untracked one and a tracked one.
# Run: sh plugins/notion-tasks/tests/hook.sh
hook="$(cd "$(dirname "$0")/../hooks" && pwd)/binding.sh"
fail() { echo "notion-tasks hook: FAIL: $1"; exit 1; }
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
run() { CLAUDE_PROJECT_DIR="$tmp" sh "$hook"; }

[ -z "$(run)" ] || fail "a project without a binding must print nothing"

mkdir -p "$tmp/.claude"
echo '{"name":"Test board","data_source":"collection://x"}' > "$tmp/.claude/notion-tasks.json"
out=$(run)
echo "$out" | head -1 | grep -q '^notion-tasks is on\.' || fail "outside git the binding must load"
echo "$out" | grep -q '"name":"Test board"' || fail "the binding is missing"
echo "$out" | grep -q '^## Status$' || fail "the rules are missing"
echo "$out" | grep -q '^name: rules$' && fail "the skill frontmatter leaked into the rules"
echo "$out" | grep -q '^## Free mode$' || fail "the free-mode rules are missing"

git -C "$tmp" init -q
[ "$(run | head -1 | cut -c1-21)" = "notion-tasks is on. T" ] || fail "an untracked binding must load"

git -C "$tmp" add .claude/notion-tasks.json
out=$(run)
echo "$out" | grep -q 'is in the repository, so it is ignored' || fail "a tracked binding must be refused"
echo "$out" | grep -q 'Test board' && fail "a tracked binding must not reach the context"

# A repository can ship .claude as a symlink to a tracked folder: the binding is tracked all the same.
git -C "$tmp" rm -q --cached .claude/notion-tasks.json
mv "$tmp/.claude" "$tmp/shipped" && ln -s shipped "$tmp/.claude" && git -C "$tmp" add shipped .claude
run | grep -q 'is in the repository, so it is ignored' || fail "a binding behind a symlinked .claude must be refused"

echo "notion-tasks hook: ok"
