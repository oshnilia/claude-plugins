---
max_turns: 15
timeout_seconds: 420
allowed_tools: [Read, Glob, Grep, Write, Edit]
tags: [measure]
---

Add a date-of-birth field to this signup form so people can pick their birthday. Save the full form to signup.html.

```html
<form action="/signup" method="post">
  <label>Email <input type="email" name="email" required></label>
  <button>Sign up</button>
</form>
```
