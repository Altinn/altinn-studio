# AGENTS.md

- Before you change process state, task start or end hooks, or service tasks, read
  [workflow engine integration](docs/workflow-engine-integration.md).
- When you add, remove or change an `ALTINNAPP` diagnostic in
  [Diagnostics.cs](src/Altinn.App.Analyzers/Diagnostics.cs), also open a pull request in
  [altinn-studio-docs](https://github.com/Altinn/altinn-studio-docs) for its rule pages (nb and en) under
  `content/altinn-studio/v9/develop-a-service/reference/analysis/rules/`. Each diagnostic's help link points there.
