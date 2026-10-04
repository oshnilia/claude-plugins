---
type: llm
focus: {source: file, path: "oldest.py"}
weight: 2
---
This is a Python script that should print the names of the 5 oldest users from users.csv (header: name,email,birth_date;
dates as YYYY-MM-DD).
PASS if the script opens users.csv, reads it with a CSV parser that uses the header, orders users from the earliest
birth_date to the latest (ISO dates sort correctly as strings), and prints the first 5 names, one per line.
FAIL if it orders newest first, prints other columns, skips the header wrongly, or would crash on a normal file.
