---
type: llm
focus: {source: file, path: "dns.html"}
weight: 2
---
This is the source of an HTML page that should explain DNS resolution.
PASS if: (1) the answer comes first - near the top, one or two sentences say what happens; (2) the page shows the path
browser cache, OS resolver, recursive resolver, root server, TLD server, authoritative server, and the answer coming
back with caching; (3) it has at least one diagram (inline SVG or a drawing made with HTML and CSS); (4) it has at least
one interaction or a way to see details on demand (a click, a hover highlight, a toggle, details elements or steps);
(5) the facts are correct.
FAIL if the page is mostly a wall of text with no diagram, the order of the steps is wrong, or it states something
false.
