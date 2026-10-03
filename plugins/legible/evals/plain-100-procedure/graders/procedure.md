---
type: llm
weight: 2
---
Source text: "When you're getting paged about high memory, you should first have a look at the dashboard; having
confirmed the spike, you'd want to restart the worker pods, but only if the queue has been drained, otherwise you could
be losing jobs."
The judge sees only the reply, so the source text is quoted here. Saying the same thing in other words is not a new
fact; a new fact is a claim the source does not make.

PASS if the reply is a numbered procedure where: (1) each step has one instruction in the imperative ("Open the
dashboard."); (2) a condition comes before its command ("If the queue is empty, restart the worker pods.");
(3) it keeps every fact - the trigger is a page about high memory, look at the dashboard, confirm the spike, restart
the worker pods only when the queue is drained (empty), otherwise jobs can be lost; (4) it uses no perfect tenses and
no modal verbs other than can, will and must.
FAIL if a step holds two instructions, a condition comes after its command, a fact is lost, or the reply uses
"should", "would", "could" or "might".
