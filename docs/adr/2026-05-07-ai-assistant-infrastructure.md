# Studio AI assistant infrastructure

- Status: Accepted
- Deciders: Team
- Date: 07.05.2026

## Result

A4: The Studio AI assistant (MCP and agent) runs on the same node pool as Designer, with no separate sandboxing for the agent. The agent's resource use is limited and its runtime capabilities are deterministically limited to `git clone`, `git commit`, `git push`, and read/write access to its own internal file system. Revisit if the agent becomes more autonomous, e.g. if it gains the ability to write its own bash commands.

## Problem context

The Studio AI assistant is nearing beta. Before it can be made available in production, operational considerations need to be addressed.

The assistant is composed of two services:

### MCP

- Provides Studio context from internal prompts and docs.altinn.studio.
- May gather context from service owner apps in the future.
- Passes context to the agent and other external consumers.
- Has no editing abilities. It only passes information to consumers.

### Agent

- Can answer general questions or make changes to repos.
- Gathers Studio context from the MCP.
- Uses the Designer API key for access through the Gitea proxy. The agent has the same authentication level as a logged-in developer.
- Currently, it follows a workflow with well-defined steps, but may become more autonomous in the future.
- Capabilities are limited to predefined `git clone`, `git commit`, `git push` commands and read/write access to its own internal file system.

## Decision drivers

- D1: Resource allocation of the assistant should not affect other services.
- D2: The agent should be securely locked to its intended scope because it has write access and is exposed to prompt-injection risk.

## Alternatives considered

- A1: Separate node pool and network sandboxing for agent
- A2: Separate node pool only. No sandboxing.
- A3: Run on the same node pool as Designer, but use sandboxing for agent.
- A4: Run on the same node pool as Designer. No sandboxing.

## Pros and cons

### A1: Separate node pool and sandboxing

- Good, isolates resource use (D1) and contains the impact of theoretical unintended agent actions (D2).
- Bad, operationally heavy. Not justified by the agent's narrow capability surface.

### A2: Separate node pool only

- Good, isolates resource use (D1).
- Good, narrow capability surface and developer-level auth already limits what the agent can do (D2).
- Bad, operationally heavier than necessary given the agent's resource use.

### A3: Same node pool, with sandboxing

- Good, contains the impact of theoretical unintended agent actions (D2).
- Good, resource use is limited and separate node pool is not needed at this scale.
- Bad, sandboxing complexity not justified by current capabilities.

### A4: Same node pool, no sandboxing

- Good, operationally simple. No extra infrastructure.
- Good, narrow capability surface and developer-level auth already limits what the agent can do (D2).
- Good, agent's resource use is limited and separate node pool is not needed at this scale.
