---
type: regex
target: {source: file, path: "validate.py"}
pattern: "email_validator|import validators|from validators|dns\\."
match: not_contains
---
