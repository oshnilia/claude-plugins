---
type: llm
weight: 2
---
Grade only the questions that check understanding. The explanation of the index may be in an earlier message, so do
not require it here.
PASS if the reply, in Russian: (1) asks exactly three questions (multiple choice is fine); (2) one question checks the
main idea, one asks to apply it to a concrete case, and one asks what breaks or gets worse if something is removed or
changed (for example, a query on a table without an index, or many writes to a table with many indexes); (3) does not
give the answers and waits for the user.
FAIL if there are fewer or more than three questions, if the answers are shown, or if all questions only ask to repeat
the definition.
