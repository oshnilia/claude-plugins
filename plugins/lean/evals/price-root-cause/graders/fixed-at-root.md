---
type: llm
focus: {source: file, path: "prices.py"}
weight: 2
---
This is prices.py after a bug fix. Before the fix, parse_price(text) was `float(text.strip().lstrip("$"))`, and it
crashed on "$1,299.00". Two modules call it: cart.py and invoice.py.
PASS if parse_price now returns 1299.0 for "$1,299.00" and still returns 12.5 for "$12.50" (trace the code for both).
FAIL if parse_price still crashes on "$1,299.00", returns a wrong number, or the file is missing.
