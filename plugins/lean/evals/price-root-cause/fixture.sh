#!/bin/bash
# Three files: a shared price parser and two callers. The bug report names only the cart.
cat > prices.py <<'EOF'
def parse_price(text):
    """'$12.50' -> 12.5"""
    return float(text.strip().lstrip("$"))
EOF
cat > cart.py <<'EOF'
from prices import parse_price


def cart_total(items):
    return sum(parse_price(i["price"]) * i["qty"] for i in items)
EOF
cat > invoice.py <<'EOF'
from prices import parse_price


def invoice_line(item):
    return f'{item["name"]}: {parse_price(item["price"]):.2f}'
EOF
