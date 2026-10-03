---
type: regex
target: {source: file, path: "dns.html"}
pattern: "<script[^>]+src=|<link[^>]+href=.https?:|@import|url\\(.?https?:|<img[^>]+src=.https?:|fonts\\.googleapis"
flags: i
match: not_contains
---
