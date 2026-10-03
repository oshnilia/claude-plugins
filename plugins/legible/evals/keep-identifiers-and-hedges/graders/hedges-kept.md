---
type: llm
weight: 2
---
Source text: "So basically we bumped `MAX_RETRY_COUNT` in `src/queue/worker.ts` from 3 to 5, which should probably fix
the flaky `test_ingest_timeout` failures we've been seeing on CI, although we haven't been able to reproduce it
locally, so it might just be masking a deeper race condition."
The judge sees only the reply, so the source text is quoted here. Saying the same thing in other words is not a new
fact; a new fact is a claim the source does not make.

PASS if the reply keeps every fact and the strength of every hedge: `MAX_RETRY_COUNT` in `src/queue/worker.ts`
changed from 3 to 5; this probably fixes the flaky `test_ingest_timeout` failures on CI (the reply keeps a word like
"probably" or "likely"); nobody reproduced the failure locally; the change may only hide a deeper race condition.
Sentences are short and plain, with no filler like "basically".
FAIL if the reply makes the fix sound more certain than "probably" (for example plain "This should fix" or "This
fixes"), drops the race-condition warning or the "not reproduced locally" fact, changes an identifier, or adds facts
that are not in the source.
