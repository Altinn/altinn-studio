# Deploying Studio AI agents and MCP service

- Status: Draft
- Deciders: Team Altinn Studio/Digdir R&D lab
- Date: 27.10.2025

## Result

Which alternative was chosen. Do not include any reasoning here.

## Problem context

The new AI assistant in Studio is dependent on both an agent service and an MCP service. There is a need to deploy these services, so that the AI assistant in Studio can run entirely online, without having to run the services locally.

When the user enters a prompt in Designer frontend, it goes via Designer backend, to the agent server, which plans, executes changes, and verifies the app according to the given prompt. The agent gathers context by calling on many different tools in the MCP server (e.g `layout_tool`, `datamodel_tool` and `schema_validation_tool`). The changes are then saved into a new branch in Gitea by the agent.

The agent server and the MCP servers are separated because we want to allow users of tools like Claude Code and Windsurf to use the MCP as a separate service for developing apps locally.

We will limit the access to the agent and MCP to registered service owners, in order to reduce token usage and possible abuses of the services by third paries. Authorization will be done via a Gitea PAT token.

## Decision drivers

A list of decision drivers. These are points which can differ in importance. If a point is "nice to have" rather than
"need to have", then prefix the description.

Examples

- B1: The solution make it easier for app developers to develop an app.
- B2: Nice to have: The solution should be simple to implement for out team.

## Alternatives considered

List the alternatives that were considered as a solution to the problem context.

- A1: A solution to the problem.
- A2: Another solution to the problem

## Pros and cons

List the pros and cons with the alternatives. This should be in regards to the decision drivers.

### A1

- Good, because this alternative adheres to B1.
  - Optional explanation as to how.
- Bad, because it does not fullfill the B2 decision driver.

### A2

- Good, because this alternative adheres to B2.
- Bad, because it does not fullfill the B1 decision driver.
