---
type: llm
weight: 2
---
PASS if the reply leads with a diagram (Mermaid or ASCII) before any long prose, and the diagram shows: kubectl apply
to the API server, the Deployment controller creating a new ReplicaSet, new pods starting while old pods scale down
step by step, and readiness deciding when a new pod gets traffic from the Service. The diagram stays readable: at most
15 boxes (for a sequence diagram, count the participants). The text after the diagram is short: about 150 words or
fewer, or a short list.
FAIL if the reply is mainly paragraphs or a long numbered list, if the diagram is missing or comes after the long
text, if the text after the diagram is much longer than 150 words, or if it states something wrong about the rollout.
