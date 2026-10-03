---
type: llm
weight: 2
---
The user asked: "Explain what a database index is and when it makes queries slower, in ASD-STE100, about 80% of the way."
Contractions, semicolons and compliance claims are checked by other graders; do not grade them here.

PASS if the reply is correct and covers the core facts - an index is a separate sorted structure (usually a B-tree) that points to rows, so the database finds rows without reading the whole table; it makes writes (insert, update, delete) slower because each index must change too, and it uses extra storage - starts with the answer, and reads as controlled
technical English: most sentences have 25 words or fewer, are in the active voice and carry one idea. Judge the
text as a whole: one or two borderline sentences or words are fine, and so is a closing "Kept as-is" note.
FAIL if a core fact is missing or wrong, or if most sentences are long, complex or passive.
