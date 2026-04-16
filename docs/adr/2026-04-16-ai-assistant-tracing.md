# Prod setting of Studio AI Assistant

- Status: Proposed
- Deciders: Team
- Date: 16.04.2026

## Result

## Problem context

The AI assistant agent workflow is traced with the OTel based Langfuse AI observability tool. This provides advantages like:

- LLM cost tracking per service owner
- Tracking how changes to prompts affect outcomes
- Automated evaluations for every agent workflow
- Changing prompts without redeploying the agent

However, not sure how well it integrates with Studio tooling...

In addition, the agent and MCP uses traditional logging for

- Indexing docs.altinn.studio
- Websocket connections
- Monitoring agent workflow steps
- Monitoring tools used by MCP

## Decision drivers

- D1: It should be easy to view logs while developing in beta stage
- D2: Should align with Studio observability conventions and tools

## Alternatives considered

- A1: Replace all manual logging with OTel immediately after Studio takes over the assistant.
- A2: Replace all manual logging with OTel when the assistant is production-ready.

## Pros and cons

### A1

- Good, because this alternative adheres to B1.
  - Optional explanation as to how.
- Bad, because it does not fulfill the B2 decision driver.

### A2

- Good, because this alternative adheres to B2.
- Bad, because it does not fulfill the B1 decision driver.
