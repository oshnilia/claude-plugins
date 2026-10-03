---
type: llm
weight: 2
---
PASS if the reply is in Russian and: (1) keeps every fact - the service runs regular database health checks to stay
stable, and on a mismatch the responsible employee gets notified; (2) uses verbs instead of chains of verbal nouns;
(3) uses short sentences (25 words or fewer) and names who does the action; (4) adds no new facts.
FAIL if facts are lost, the text is still one long sentence, or it keeps phrases like «осуществляется проведение».
