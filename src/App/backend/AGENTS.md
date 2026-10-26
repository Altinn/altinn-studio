# AGENTS.md

- Read [development](docs/development.md) before you change the libraries.
- Process transitions run through the workflow engine. Before you change process state, task start or end hooks, or
  service tasks, read [WorkflowEngine/AGENTS.md](src/Altinn.App.Core/Internal/WorkflowEngine/AGENTS.md).
- The tests run on xUnit v2. `TestContext.Current` and other xUnit v3 APIs that the suites under `src/Runtime` and
  `src/cli` use do not exist here.
- Tests accept changed snapshots outside CI. If a test run rewrote `*.verified.*` files, report which snapshots
  changed and why.
- Do not rebase or squash a branch that syncs from app-lib-dotnet. It must keep its merge commits, as
  [upstream sync](../docs/upstream-sync.md) explains.
