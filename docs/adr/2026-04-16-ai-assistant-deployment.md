# Deploying Studio AI assistant to production

- Status: Proposed
- Deciders: Team
- Date: 16.04.2026

## Result

## Problem context

The Studio AI assistant is nearing beta. Before it can be made available in production, operational considerations needs to be addressed.

The assistant is composed of two services:

### MCP

- Provides Studio context from internal prompts and docs.altinn.studio.
- May gather context from service owner apps in the future.
- Passes context to the agent and other external consumers.
- Has no editing abilites. It only passes information to consumers.

### Agent

- Can answer general questions or make changes to repos.
- Gathers Studio context from the MCP.
- Uses the Designer API key for access through the Gitea proxy. Agent has the same authentication level as a logged-in developer.
- Currently follows a workflow with well-defined steps, but may become more autonomous in the future (e.g. OpenCode or OpenClaw).

The performance and scalability of the Agent and MCP has not been tested.

In the development environment, the agent and MCP runs on the same node pool as Studio. [Should load-test in dev]

## Decision drivers

- D1: Resource allocation of the assistant should not affect other services.
- D2: The agent should be securely locked to its intended scope, due to its write-access and the prompt injection risk.

## Alternatives considered

- A1: Separate node pool and network sandboxing for agent
- A2: Separate node pool only. No sandboxing.
- A3: Run on the same node pool as Designer, but use sandboxing for agent.
- A4: Run on the same node pool as Designer. No sandboxing.
