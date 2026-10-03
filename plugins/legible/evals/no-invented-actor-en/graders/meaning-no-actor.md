---
type: llm
weight: 2
---
Source text: "Database backups are taken every night at 02:00 UTC and are retained for 30 days, after which they are
automatically purged; in the event of data corruption, the most recent backup is restored and the affected tables are
re-indexed."
The judge sees only the reply, so the source text is quoted here. Saying the same thing in other words is not a new
fact; a new fact is a claim the source does not make.

PASS if the reply rewrites the source in short plain sentences and keeps every fact: a backup runs every night at
02:00 UTC, backups are kept for 30 days, after that they are deleted automatically, and on data corruption the latest
backup is restored and the affected tables are re-indexed. The source never says who or what does these actions, so
the rewrite must not name one either. Imperative steps ("Restore the latest backup.") are fine.
FAIL if a fact is lost or changed, or if the reply invents an actor that the source does not name, for example "we",
"the team", "the system", "a cron job", "the DBA", "an administrator" or "the on-call engineer".
