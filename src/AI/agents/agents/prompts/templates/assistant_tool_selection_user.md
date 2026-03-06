USER QUESTION:
{query}

SEMANTIC SEARCH QUERY (for reference):
{semantic_query}

REPOSITORY CONTEXT:
{repo_context}

AVAILABLE TOOLS:
{tool_names}

Select tools to answer the question. Remember:

- ALWAYS start with altinn_planning (pass query parameter with the user's question)
- Think about which DOMAIN the question belongs to and call complementary tools:
  - Authorization → altinn_planning + altinn_policy_docs
  - Data binding → altinn_planning + altinn_datamodel_docs
  - Prefill → altinn_planning + altinn_prefill_docs
  - Expressions → altinn_planning + altinn_expression_docs
- Only add layout/resource tools if question is about THEIR specific app
- Documentation tools (altinn\_\*\_docs) need NO parameters
- altinn_planning takes query parameter
- When in doubt, call MORE tools rather than fewer

Respond with JSON array only.
