---
type: llm
weight: 2
---
The user asked: "Explain how a browser checks a website's TLS certificate, in ASD-STE100, about 80% of the way."
Contractions, semicolons and compliance claims are checked by other graders; do not grade them here.

PASS if the reply is correct and covers the core facts - the server sends its certificate chain; the browser checks that the chain leads to a root CA it trusts, that each signature is valid, that the certificate is not expired, that the host name matches, and (often) that it is not revoked - starts with the answer, and reads as controlled
technical English: most sentences have 25 words or fewer, are in the active voice and carry one idea. Judge the
text as a whole: one or two borderline sentences or words are fine, and so is a closing "Kept as-is" note.
FAIL if a core fact is missing or wrong, or if most sentences are long, complex or passive.
