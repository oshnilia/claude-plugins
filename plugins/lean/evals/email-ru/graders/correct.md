---
type: llm
focus: {source: file, path: "validate.py"}
weight: 2
---
This is validate.py with is_valid_email(address) for a signup form.
PASS if is_valid_email returns True for "user@example.com" and "ivan.petrov@example.org", and False for "", "abc", "a@"
and "@b.ru" (trace the code for each input), and it does not crash on any of them.
FAIL if any of these results is wrong, the function is missing, or it needs a network call.
