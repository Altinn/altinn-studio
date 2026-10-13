# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

## About This Project

This is the **Altinn.App .NET libraries** project, which provides runtime libraries for Altinn 3 applications on the Norwegian government's digital services platform. These libraries expose APIs for service owners and provide abstractions for Altinn Studio and Platform services.

## Essential Commands

**Build the solution:**

```bash
dotnet build solutions/All.slnx -v m
```

**Run all tests:**

```bash
dotnet test solutions/All.slnx -v m --no-restore --no-build
```

**Run specific test project:**

```bash
dotnet test test/Altinn.App.Core.Tests/ -v m
```

**Filter tests:**

```bash
dotnet test test/Altinn.App.Integration.Tests/ -v m --filter "<test-method-name>"
```

**Reproduce CI's build** (warnings are errors only under `CI=true`, and only for projects that
actually recompile):

```bash
CI=true dotnet build solutions/All.slnx --no-incremental
```

**Output logs from tests:**

- Replace `-v m` with `--logger "console;verbosity=detailed` in the arguments of `dotnet test`

**Format code (required before commits):**

Formatting happens automatically when building due to `CSharpier.MSBuild`.

**Check code formatting:**
Can check formatting manually if a project build is not needed (project build will format code automatically).

```bash
dotnet csharpier check .
```

**Calculate version:**

```bash
dotnet minver
```

**C# sources and generated code use LF:**

`.gitattributes` declares `*.cs text eol=lf` for checkouts on every platform, and `.editorconfig`
sets `end_of_line = lf` to match. CSharpier.MSBuild applies that setting during builds.

Raw string literals inherit their source file's line endings. Keep explicit newlines in
`SourceTextGenerator` and its helpers as `\n` so generated code also uses LF consistently.
Avoid `AppendLine()` and `Environment.NewLine` when generating source, since they introduce CRLF
on Windows.

The Verify test projects here enable `AutoVerify(includeBuildServer: false)`, so a local run
silently accepts changed snapshots and still passes. Check `git status` for rewritten
`*.verified.*` files after any test run, or set `TF_BUILD=true` (or another build-server variable)
so snapshot mismatches fail as they do in CI. A failed `Altinn.App.Integration.Tests` run
overwrites its snapshots with the failure output; restore them before rerunning.

**Packing `Altinn.App.Api`** requires `src/App/frontend/dist` (the `ValidateAppFrontendDistForPack`
target): run `yarn build` in `src/App/frontend` first.

## Architecture Overview

The solution follows a **layered architecture** with feature-based organization:

### Core Projects

- **Altinn.App.Core** - Core business logic organized by features
- **Altinn.App.Api** - Web API controllers and HTTP layer
- **Altinn.App.Analyzers** - Code analyzers for consuming applications
- **Altinn.App.Internal.Analyzers** - Custom code analyzers for Core/Api library development

### Key Features (`/src/Altinn.App.Core/Features/`)

- **Authentication** - OAuth2, JWT, Maskinporten integration
- **Data** - Form data processing and validation
- **Signing** - Digital signature workflows
- **Payment** - Payment gateway integrations (Nets, etc.)
- **Correspondence** - External communications
- **Validation** - Data validation pipelines
- **Telemetry** - OpenTelemetry observability (considered public contract)

### Process engine (`/src/Altinn.App.Core/Internal/WorkflowEngine/`)

All process transitions (ProcessNext) execute through the async Workflow Engine — commands enqueued to
an external engine service that calls back into the app. Anything touching process state, task
start/end hooks, or service tasks runs on this foundation. Architecture, command sequences, and hard
constraints (idempotency, state passthrough, callback auth):
[WorkflowEngine/AGENTS.md](src/Altinn.App.Core/Internal/WorkflowEngine/AGENTS.md).

### Technology Stack

- **.NET 10.0** (see global.json)
- **ASP.NET Core** for web APIs
- **OpenTelemetry** for observability
- **xUnit** with FluentAssertions and Moq for testing

### ADR

Architecture Decision Records live in the monorepo root `docs/adr/` folder.

## Development Guidelines

### Code Quality

- **Strict analysis mode** enabled - warnings are treated as errors in CI
- **CSharpier** required for formatting
- **EditorConfig** enforced
- **NuGet audit** enabled for security

### Testing Strategy

- Comprehensive unit tests with high coverage
- **Snapshot testing** for OpenAPI docs and telemetry output
- **Manual testing** requires localtest environment integration
- All telemetry changes are considered **breaking changes**
- **Integration tests** use studioctl with generated app folders for isolated, reproducible environments:
    - **AppFixture pattern** - Central orchestrator managing test lifecycle with feature-specific operations
    - **Snapshot testing** - Verify both HTTP response and response body content with port/data normalization
    - **Test apps** - Complete Altinn apps in `_testapps/{app}/` with config, models, and UI
    - **Scenario-based testing** - Override config and inject custom services via `_testapps/{app}/_scenarios/{scenario}/` folders
    - **studioctl orchestration** - Shared localtest environment, generated app ids, and process-mode app runs
    - Follow existing `AppFixture.{Feature}.cs` pattern for new API operations (see `InstancesOperations`)

### Versioning

- Uses **semantic versioning** for packages
- Avoid breaking changes (we plan to release major versions yearly. Some breaking changes can be done inbetween but must be manually verified)
- PR titles become release notes
- Normal interfaces in Altinn.App.Core must be binary compatible within a major version so that users can have local packages that still work (never remove a method)
- Interfaces marked with the `ImplementableByApps` attribute must not change.

### Platform Integrations

The libraries integrate with:

- **Altinn Platform services** (Storage, Process, Authorization)
- **Maskinporten** for machine-to-machine auth
- **Azure services** (KeyVault, Application Insights)
- **Payment providers** (Nets payment processor)
- **EFormidling** for government document exchange

## Common Development Patterns

- Use internal accessibility on types by default
- Use sealed for classes unless we consider inheritance a valid use-case
- Use Nullable Reference Types, without the null-forgiving operator `!`: accept a nullable value,
  handle absence (`?? []`), or `?? throw` with a message naming what is missing
- Write XML doc `<summary>` tags on their own lines, never `/// <summary>Text</summary>`
- Remember to dispose `IDisposable`/`IAsyncDisposable` instances
- We want to minimize external dependencies
- For HTTP APIs we should have `...Request` and `...Response` DTOs (see `LookupPersonRequest.cs` and the corresponding response as an example)
- Types meant to be implemented by apps should be marked with the `ImplementableByApps` attribute
- _Don't_ use `.GetAwaiter().GetResult()`, `.Result()`, `.Wait()` or other blocking APIs on `Task`
- _Don't_ use `Async` suffix for async methods
- Write efficient code
    - _Don't_ allocate unnecessarily. Examples:
        - Instead of calling `ToString` twice in a row, store it in a variable
        - Sometimes a for loop is just as good as LINQ
    - _Don't_ invoke the same async operation multiple times in the same codepath unless necessary
    - _Don't_ await async operations in a loop (prefer batching, but have an upper bound on parallelism that makes sense)

### Feature Implementation

New features should follow the established pattern in `/src/Altinn.App.Core/Features/`:

- Feature-specific folder with clear responsibility
- Proper dependency injection registration
- Comprehensive telemetry instrumentation
- Corresponding test coverage in `/test/Altinn.App.Core.Tests/Features/`

### Testing

- Test projects mirror source structure
- Prefer xUnit asserts over FluentAssertions
- Mock external dependencies with Moq
- Include integration tests for platform service interactions
- The tests run on **xUnit v2**: `TestContext.Current` does not exist here (it does in the xUnit v3
  suites under `src/Runtime` and `src/cli`)
- Moq traps: a mock does not run default interface members (`Mock<IServiceTask>().Define(...)`
  returns `null`), so code that dispatches through one needs a real fake; and a setup that omits an
  optional `CancellationToken` matches only `default`, which passes in Core.Tests and fails in
  Api.Tests, where the token comes from the request. Use `It.IsAny<CancellationToken>()`.
- `Altinn.App.Api.Tests`: `TestData.PrepareInstance` throws when two test files prepare the same
  instance; copy the fixture under new instance and data-element ids. `FakeWorkflowEngineClient`
  constructs `WorkflowEngineCallbackController` directly, so a change to callback authentication
  shows up as ~100 unrelated failures; fix the fake, not the tests.
- `BasicAppTests.HostedServices.verified.txt` lists the hosted services in registration order. A
  background service that must not run on localtest stays registered and checks
  `RuntimeEnvironment.IsLocaltestPlatform()` in `ExecuteAsync`.
- Scenario code under `Altinn.App.Integration.Tests/_testapps/**` is excluded from the solution
  build (`Compile Remove`); a compile error there only shows as the app failing to start. See that
  project's [README](test/Altinn.App.Integration.Tests/README.md) for the environment it needs and
  how to diagnose a run that fails wholesale.

### Syncing from app-lib-dotnet

v8 fixes still land upstream in `Altinn/app-lib-dotnet` and are merged into `src/App/backend` with
`git merge -X subtree=src/App/backend <upstream-sha>`, never the other way. The sync must reach
`main` as a real merge commit: squashing it freezes the merge base and makes every later sync
re-conflict, so the PR is merged with merge commits enabled for that merge only (the repository is
otherwise squash-only). Previous syncs are the merge commits found by
`git log --merges --oneline -- src/App/backend`. Resolve conflicts inside the merge commit, put any
porting work for v9 in a separate commit, and keep test names identical to upstream so Verify
snapshot files line up.

### Configuration

- Use strongly-typed configuration classes
- Register services in DI container properly
- Follow existing patterns for options configuration
