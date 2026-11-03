# Studio Assistant architecture

Studio Assistant reads an Altinn app repository, calls a language model in a loop, and lets the model use tools. The tools read files, change files, validate them, and commit the result to a separate branch. A benchmark workbench in the same folder measures the agent before a change goes to production.

These pages explain the service at four levels. Each level goes one step deeper.

| Level | Page                                   | Question                                                                   |
| ----- | -------------------------------------- | -------------------------------------------------------------------------- |
| 1     | [User view](1-user-view.md)            | How does the user see and use the service?                                 |
| 2     | [System context](2-system-context.md)  | How is the service connected with other services?                          |
| 3     | [Modules](3-modules.md)                | What main modules does the service have, and how do they operate together? |
| 4     | One page for each module, listed below | How does each module work?                                                 |

Each module page starts with the code paths it describes, so update the page when you change that code.

- [API layer](modules/api.md)
- [Graph: gates, intake, spec and the loop node](modules/graph.md)
- [Core loop and model adapters](modules/core-loop.md)
- [Tools](modules/tools.md)
- [Prompt and skills](modules/prompt-and-skills.md)
- [Events and permissions](modules/events-and-permissions.md)
- [Git and repo](modules/git-and-repo.md)
- [Altinn domain library](modules/altinn-domain.md)
- [Security controls](modules/security.md)
- [Traces and usage](modules/observability.md)
- [Benchmarks](modules/benchmarks.md)

[Assistant skills](skills.md) says which skills the assistant loads and how to add one.
