---
type: llm
weight: 2
---
PASS if the reply leads with a sequence diagram or flowchart (Mermaid or ASCII) that shows the app, the system
browser, the authorization server and the API; shows code_verifier and code_challenge, the redirect back with the
authorization code, and the exchange of the code plus code_verifier for tokens; uses short labels; and after the
diagram gives a takeaway in Russian of 1-3 sentences or a very short list.
FAIL if long Russian prose comes before the diagram or makes up most of the reply, or if the flow is wrong (for
example, a client secret stored in the app, or the implicit flow).
