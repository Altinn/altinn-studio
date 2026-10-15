# AI

This folder holds AI projects for Altinn Studio.

- [`assistant`](assistant/README.md) is Studio Assistant, an agent service that changes Altinn apps from instructions
  in natural language. Designer proxies its users' requests to it, and it reads and pushes app repositories through
  Gitea. Its [architecture guide](assistant/docs/README.md) explains how it works.
- [`augmenter-agent`](augmenter-agent/README.md) is a service that generates PDFs from uploaded files.

[Coding conventions](docs/coding-conventions.md) apply to new code in both projects.
