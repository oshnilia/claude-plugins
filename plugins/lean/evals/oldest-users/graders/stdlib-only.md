---
type: regex
target: {source: file, path: "oldest.py"}
pattern: "import pandas|from pandas|import polars|from polars"
match: not_contains
---
