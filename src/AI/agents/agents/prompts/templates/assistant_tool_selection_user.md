{history_context}USER QUESTION:
{query}

SEMANTIC SEARCH QUERY (use this for planning_tool):
{semantic_query}

REPOSITORY CONTEXT:
{repo_context}

AVAILABLE TOOLS:
{tool_names}

Select tools to answer the question. Remember:
- ALWAYS start with planning_tool (use the semantic query, NOT the user question)
- Think about which DOMAIN the question belongs to and call complementary tools:
  * Authorization → planning_tool + policy_tool
  * Data binding → planning_tool + datamodel_tool
  * Prefill → planning_tool + prefill_tool
  * Expressions → planning_tool + dynamic_expression
- Only add layout/resource tools if question is about THEIR specific app
- Documentation tools need NO query parameter (except planning_tool)
- When in doubt, call MORE tools rather than fewer

Respond with JSON array only.
