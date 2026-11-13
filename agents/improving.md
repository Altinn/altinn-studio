## Improving this agent

This Agent is made from the agent definition in `agents/` of the altinn-studio repository: the `Dockerfile` and
`common/` it builds the image from, `instructions.md`, this file and the skills in `_skills/`, and a folder per stage,
`minimal/` and `desktop/`, with its manifest, variants and `environment.md`. The `agent-definition` skill says how to
change it, bring it up to date with a later agentctl and try a change in a nested Agent first. Propose such a change
through a pull request, like any other.
