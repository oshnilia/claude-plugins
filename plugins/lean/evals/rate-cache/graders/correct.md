---
type: llm
focus: {source: file, path: "rates.py"}
weight: 2
---
This is rates.py after a request to add caching to fetch_rate(base, quote), which calls a slow rates API.
PASS if: (1) repeated calls with the same base and quote return the cached rate without a new HTTP request (within the
cache lifetime, if the code sets one); (2) different currency pairs are cached separately; (3) fetch_rate still returns
the rate; (4) the code has no error. functools.lru_cache, functools.cache or a small dict all pass; a time limit is
allowed but not required.
FAIL if the cache key ignores base or quote, the function no longer returns the rate, or the code would not run.
