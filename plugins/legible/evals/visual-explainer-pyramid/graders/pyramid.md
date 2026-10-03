---
type: llm
weight: 2
---
PASS if the reply is in Russian and: (1) its first one or two sentences answer the question in short (for example:
git stores snapshots as objects named by their hash, and branches are pointers to commits); (2) it then covers 2-5 key
parts that do not overlap - objects (blob, tree, commit), references (branches, HEAD), and what a commit does;
(3) each part has a diagram or a short explanation, and it does not go deeper than two levels of headings; (4) the
facts are correct (objects are addressed by a hash of their content; a commit points to a tree and to its parent
commits; a branch is a file with a commit hash; HEAD usually points to a branch).
FAIL if it starts with long background, is mostly a wall of text, or states something wrong.
