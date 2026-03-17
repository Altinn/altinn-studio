# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

## About This Project

This is the **Altinn.App .NET libraries** project, which provides runtime libraries for Altinn 3 applications on the Norwegian government's digital services platform. These libraries expose APIs for service owners and provide abstractions for Altinn Studio and Platform services.

## Essential Commands

**Build the solution:**
```bash
dotnet build solutions/All.sln -v m
```

**Run all tests:**
```bash
dotnet test solutions/All.sln -v m --no-restore --no-build
```

**Run specific test project:**
```bash
dotnet test test/Altinn.App.Core.Tests/ -v m
```

**Filter tests:**
```bash
dotnet test test/Altinn.App.Integration.Tests/ -v m --filter "<test-method-name>"
```

**Output logs from tests:**

* Replace `-v m` with `--logger "console;verbosity=detailed` in the arguments of `dotnet test`

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

### Technology Stack
- **.NET 8.0** (see global.json)
- **ASP.NET Core** for web APIs
- **OpenTelemetry** for observability
- **xUnit** with FluentAssertions and Moq for testing

### ADR

We have Architecture Decision Records in the `/doc/adr/` folder.

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
- **Integration tests** use Docker Testcontainers for isolated, reproducible environments:
  - **AppFixture pattern** - Central orchestrator managing test lifecycle with feature-specific operations
  - **Snapshot testing** - Verify both HTTP response and response body content with port/data normalization
  - **Test apps** - Complete Altinn apps in `_testapps/{app}/` with config, models, UI, and Dockerfile
  - **Scenario-based testing** - Override config and inject custom services via `_testapps/{app}/_scenarios/{scenario}/` folders
  - **Container orchestration** - Isolated networks, dynamic ports, health checks for parallel execution
  - Follow existing `AppFixture.{Feature}.cs` pattern for new API operations (see `InstancesOperations`)

### Versioning
- Uses **semantic versioning** with MinVer
- Avoid breaking changes (we plan to release major versions yearly. Some breaking changes can be done inbetween but must be manually verified)
- PR titles become release notes

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
- Use Nullable Reference Types
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

### Configuration
- Use strongly-typed configuration classes
- Register services in DI container properly
- Follow existing patterns for options configuration
