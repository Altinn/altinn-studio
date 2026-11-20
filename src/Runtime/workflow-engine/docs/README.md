# Workflow Engine docs

- [Technical guide](technical-guide.md): how the engine behaves, its API and its configuration.
- [Workflow collections](workflow-collections.md): chaining batches of workflows over time.
- [Dashboard](dashboard.md): how the dashboard is built and how it behaves.
- [Docker Compose stack](docker.md): the local stack and monitoring.
- [Tests](test.md): test conventions and patterns.
- [Migrations](migration.md): adding, checking and removing EF Core migrations.
- [Database connections](db-connections-notes.md): queries for inspecting connections during development.
- [Architecture](architecture.md): the [overview](overview.drawio.svg) and [sequence](sequenceFlow.drawio.svg)
  diagrams from the engine's design, and a [deployment overview](workflow-engine_deployment-overview.drawio.svg) from
  the same time.
- [Proposals](proposals/): designs not yet built, such as recurring workflows.
- [Presentation](presentation/): slides that introduced the engine.

The load tests are in [`.k6`](../.k6/README.md).
