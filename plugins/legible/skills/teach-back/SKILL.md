---
name: teach-back
description: Check that the user understood an explanation with three short questions, then re-explain in a different format where the answer was wrong. Use when the user asks to check their understanding, says "проверь меня", "check me", "quiz me", runs /check-me, or accepts the offer at the end of a visual explanation.
license: MIT
metadata:
  version: 0.1.0
---

# Teach-back

Explaining is not the goal. Understanding is. Check it, cheaply.

1. Ask exactly three questions about the last explanation:
   - **Recall**: what is the main point (the top of the pyramid)?
   - **Apply**: what happens in a concrete case from this project?
   - **Break**: what would fail if one named part were removed or changed?
2. Use the AskUserQuestion tool when it is available, with 3–4 options per question and one correct answer.
   Otherwise ask in chat and wait.
3. Grade each answer in one line. Do not lecture.
4. For each wrong answer, re-explain that part in a different format than before:
   text → diagram → concrete example from the user's code → analogy.
5. Stop after one re-explain round unless the user asks for more.

Write the questions and the feedback in the user's language, in plain-80 / plain-ru-80.
