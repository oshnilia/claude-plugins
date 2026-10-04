---
type: regex
target: {source: file, path: "rates.py"}
pattern: "cachetools|requests_cache|diskcache|redis|class\\s+\\w*Cache"
flags: i
match: not_contains
---
