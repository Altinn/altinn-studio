# Traces and usage

Code: `src/AI/assistant/shared/utils/langfuse_utils.py`, `src/AI/assistant/api/routes/traces.py`, `src/AI/assistant/api/routes/token_usage.py`, `src/AI/assistant/services/traces/`, `src/AI/assistant/services/token_usage/`, `src/AI/assistant/agents/prompts/llm-as-a-judge/`, `src/Designer/backend/src/Designer/Evaluators/CanUseAiAssistantEvaluator.cs`

Each run makes one Langfuse trace. The root span is "Altinity Agent Workflow". Model calls and tool calls are child spans. The output of the root span holds the summary, the changed files, the sources and the commit hash.

Four LLM-as-a-judge evaluators in Langfuse score this output: `intent_match`, `no_hallucination`, `faithful_summary` and `no_irrelevant_responses`. Their reviewed source is in `src/AI/assistant/agents/prompts/llm-as-a-judge/`. This is the online evaluation. The [benchmark](benchmarks.md) is the offline evaluation.

```mermaid
flowchart LR
  R["Root span: Altinity Agent Workflow"] --> G["Generation spans: model calls"]
  R --> T["Tool spans: tool_name"]
  R --> S["Score: user_feedback"]
  E["Langfuse evaluators"] --> R
```

_The shape of one trace._

A thumbs up or down from the user becomes the score `user_feedback` on the trace. Only the developer who owns the trace can set it. A nightly Designer job calls `POST /api/traces/delete-expired`, which deletes traces older than the retention period (`LANGFUSE_TRACE_RETENTION_DAYS`). `GET /api/token-usage/daily` returns the tokens of the day before, for each service owner, in a billing format.

Designer records the model usage of each run on an organization, and sends it as `cost_org` in the start request. The trace gets it as `user_id`. In a repository of an organization, it is that organization. In the developer's own repository, it is the one organization with access to the assistant that the developer is a member of. If the developer is a member of more than one, it is `unattributed`.
