# AI

The AI projects in Altinn Studio.

- [assistant](assistant/README.md) is Studio Assistant, an agent service that changes Altinn apps from instructions in
  natural language. [Designer](../Designer/README.md) forwards its users' requests to it, and it clones and pushes
  app repositories through the [gitea-proxy](../gitea-proxy). Its [architecture guide](assistant/docs/README.md)
  explains how it works.
- [augmenter-agent](augmenter-agent/README.md) is a service that generates a PDF from uploaded files with Typst.
  Nothing in this repository calls or deploys it yet.
