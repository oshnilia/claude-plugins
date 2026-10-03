---
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
tags: [core, plain-english, guard]
---

Clean this up into plain English for the PR description. Don't change the meaning.

"So basically we bumped `MAX_RETRY_COUNT` in `src/queue/worker.ts` from 3 to 5, which should probably fix the flaky `test_ingest_timeout` failures we've been seeing on CI, although we haven't been able to reproduce it locally, so it might just be masking a deeper race condition."
