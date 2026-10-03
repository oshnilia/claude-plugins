---
type: llm
weight: 2
---
PASS if the reply rewrites the text so that: (1) every fact of the original survives - YAML files configure the
pipeline, they must be configured before a push, CI runs build, test and release stages, the on-call person gets a
notification on failure; (2) sentences are short (about 25 words or fewer) and mostly in the active voice;
(3) it does not use phrasal verbs like "set up" or "go through"; (4) it does not claim compliance with ASD-STE100.
FAIL if facts are lost or invented, or the text is still one long sentence.
