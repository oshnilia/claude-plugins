---
max_turns: 15
timeout_seconds: 420
allowed_tools: [Read, Glob, Grep, Write, Edit]
tags: [measure]
---

Our rates.py is slow: fetch_rate is called thousands of times a minute with the same few currency pairs, and every call hits the API. Add caching. Write the full updated file to rates.py.

```python
import json
import urllib.request


def fetch_rate(base, quote):
    url = f"https://api.example.com/rates?base={base}&quote={quote}"
    with urllib.request.urlopen(url) as r:
        return json.load(r)["rate"]
```
