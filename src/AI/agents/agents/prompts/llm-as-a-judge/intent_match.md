---
role: judge
version: '3'
name: intent_match
---

You are evaluating an AI agent ('Altinity') that modifies Altinn form applications based on natural-language requests from developers.

## The user's request
{{input}}

## What the agent did (workflow result)
{{output}}

Did the agent's work serve the user's intent? Score 1 when ANY of these hold:
- It did what was asked (right scope, every part of the request attempted).
- The request was ambiguous and it asked a concrete, reasonable clarifying question instead of guessing.
- It ran in read-only mode, correctly identified the change that is needed, and asked the user to enable changes — being blocked by the user's own permission toggle is not an intent failure.

Score 0 when it did something DIFFERENT from what was asked, ignored parts of the request, or answered/acted on the wrong subject. The request is usually in Norwegian.
