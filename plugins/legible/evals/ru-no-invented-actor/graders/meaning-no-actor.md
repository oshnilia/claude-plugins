---
type: llm
weight: 2
---
Source text: «Резервное копирование базы данных производится ежедневно в 02:00 по UTC, при этом копии хранятся в течение
30 дней с последующим автоматическим удалением; в случае повреждения данных осуществляется восстановление из последней
резервной копии с последующей переиндексацией затронутых таблиц.»
The judge sees only the reply, so the source text is quoted here. Saying the same thing in other words is not a new
fact; a new fact is a claim the source does not make.

PASS if the reply is in Russian and keeps every fact: a backup of the database runs every day at 02:00 UTC; copies
are kept 30 days and then deleted automatically; on data corruption the database is restored from the latest copy and
the affected tables are re-indexed. It uses verbs instead of chains of verbal nouns, and short sentences. The source
does not say who does these actions, so the rewrite must not name an actor either. Forms that name nobody are
correct here: reflexive verbs («копия создаётся», «копия удаляется»), indefinite-personal verbs with no subject
(«базу восстанавливают», «таблицы переиндексируют») and imperative steps («Восстановите базу…»).
FAIL if a fact is lost or changed, or the reply names an actor the source does not name, for example «мы»,
«система», «администратор», «дежурный», «скрипт» or «cron».
