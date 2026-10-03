---
type: llm
weight: 2
---
PASS if the reply is in Russian and: (1) the first one or two sentences give the definition - sending the same request
again leaves the server in the same state as sending it once; (2) it explains correctly that POST usually creates a new
resource on each call, while PUT puts the whole resource at a given URL, so a repeat changes nothing; (3) sentences are
short (25 words or fewer) and use verbs, not chains of verbal nouns; (4) it has about 200 words or fewer.
FAIL if a claim is wrong, if it opens with background instead of the answer, or if it is a long essay with many
headings.
