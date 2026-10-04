---
type: regex
target: {source: file, path: "signup.html"}
pattern: "flatpickr|pikaday|datepicker|jquery|<script[^>]+src="
flags: i
match: not_contains
---
