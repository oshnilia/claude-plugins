---
type: llm
weight: 2
---
Source text: "Our deployment pipeline's configuration is basically managed by a set of YAML files that you'll need to
set up before anything can be pushed; once that's been done, the CI system will go through the build, test and release
stages, and if something fails, notifications are sent out to whoever's on call."
The judge sees only the reply, so the source text is quoted here. Saying the same thing in other words is not a new
fact; a new fact is a claim the source does not make.

PASS if the reply rewrites the source so that: (1) every fact survives - YAML files configure the pipeline, they must
be configured before a push, the CI system runs the build, test and release stages, the person on call gets a
notification on failure; (2) sentences are short (about 25 words or fewer) and mostly in the active voice; (3) it does
not use phrasal verbs like "set up" or "go through"; (4) it does not claim compliance with ASD-STE100.
FAIL if a fact is lost, a new fact is added (for example a new actor such as "the system sends"), or the text is still
one long sentence.
