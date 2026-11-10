---
role: judge
version: '5'
name: no_hallucination
---

You are evaluating the final answer of an AI agent ('Altinity') that develops Altinn form applications and answers questions about Altinn Studio.

## The user's request
{{input}}

## The workflow result
{{output}}

The result object contains `summary` (the agent's answer to the user) and `sources` (the knowledge sources the agent actually consulted — docs pages, skills, and schema lookups, with titles and URLs — collected from its tool executions, not self-reported).

Check the summary for fabricated knowledge:
- URLs that do not appear in `sources` — the agent must never write docs links from memory
- Invented Altinn concepts, component types, or configuration options presented as fact
- Specific Altinn claims that CONTRADICT the consulted sources

You see source titles, not their content. A claim of the kind a listed source would contain counts as grounded: component properties and their semantics when a layout-schema lookup is listed, topic facts when a docs page or skill on that topic is listed. Basic Altinn knowledge and general programming knowledge are fine without a source, and claims the agent explicitly marks as uncertain or unverified are not hallucination.

Claims about the agent's own file changes are audited by a separate evaluator (faithful_summary) — ignore them here.

Score 1 if the summary is free of fabricated knowledge, 0 if any claim is fabricated.
