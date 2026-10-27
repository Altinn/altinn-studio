# Workflow Engine

The workflow engine runs workflows asynchronously. It queues each workflow in PostgreSQL, runs its steps in order and
retries a step that fails. A step runs a command, such as an HTTP call.

The engine is a class library, not a service of its own. A host composes it into a web application and adds its own
commands. [Workflow Engine App](../workflow-engine-app/README.md) is the host for Altinn apps, and calls back to the
app for each step. The [TestApp](tests/WorkflowEngine.TestApp) composes the engine with the built-in webhook command
for local development and tests.

The [technical guide](docs/technical-guide.md) describes how the engine behaves. [The docs](docs/README.md) list the
rest.

## Running locally

`make dev` starts PostgreSQL, PgAdmin and WireMock. Run the TestApp against them with
`dotnet run --project tests/WorkflowEngine.TestApp`, or run it in a container as well with `make run`. Either way the
engine serves its API and a dashboard on port 9090. The dashboard shows workflows as they run, and its actions call the
public API like any other caller. [Docker Compose stack](docs/docker.md) covers the stack and monitoring.

## Development

Tests start PostgreSQL and WireMock with Testcontainers, so they need Docker or Podman but no compose stack.

Response models use `init` setters. System.Text.Json skips an `internal set`, so a client that deserializes the model
reads `null`.
