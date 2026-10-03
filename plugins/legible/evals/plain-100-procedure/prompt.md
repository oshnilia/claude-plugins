---
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
tags: [core, plain-english]
---

Turn this into a plain-100 procedure, the strictest level of plain technical English, for a junior on-call engineer:

"When you're getting paged about high memory, you should first have a look at the dashboard; having confirmed the spike, you'd want to restart the worker pods, but only if the queue has been drained, otherwise you could be losing jobs."
