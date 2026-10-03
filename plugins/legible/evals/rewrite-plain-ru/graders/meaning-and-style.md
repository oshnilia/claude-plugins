---
type: llm
weight: 2
---
Source text: «В целях обеспечения стабильности функционирования данного сервиса осуществляется регулярное проведение
проверки состояния базы данных, по результатам которой, в случае выявления несоответствий, производится уведомление
ответственного сотрудника.»
The judge sees only the reply, so the source text is quoted here. Saying the same thing in other words is not a new
fact; a new fact is a claim the source does not make.

PASS if the reply is in Russian and: (1) keeps every fact - the database is checked regularly so that the service
stays stable, and when the check finds a mismatch the responsible employee is notified; (2) uses verbs instead of
chains of verbal nouns; (3) uses short sentences (25 words or fewer); (4) adds no new facts. The source does not say
who runs the check or who sends the notification, so the reply must not name one either. Forms that name nobody are
correct: «базу проверяют», «сотрудник получает уведомление», «проверка находит».
FAIL if facts are lost, a new actor or fact is added (for example «система», «мы», «администратор»), the text is still
one long sentence, or it keeps phrases like «осуществляется проведение».
