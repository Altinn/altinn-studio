# AGENTS.md

This file provides guidance to AI agents when working with code.

## Backend Stack

Altinn Studio Designer's backend is built using the following technologies:

- .NET 10 (ASP.NET Core Web API)
- Entity Framework Core with PostgreSQL
- SignalR for real-time communication
- MediatR for CQRS/mediator pattern
- Redis for caching and SignalR backplane
- Quartz for background job scheduling
- LibGit2Sharp for Git repository operations
- xUnit with Moq for unit testing
- Testcontainers for integration testing
- Docker support for containerization

## Project Structure

The backend consists of three main projects in a Visual Studio solution:

### Core Projects

- **`src/Designer/`** - Main ASP.NET Core Web API application containing:
    - `Controllers/` - API endpoints organized by feature area
    - `Services/` - Business logic and domain services
    - `Models/` - Data models, DTOs, and domain objects
    - `Infrastructure/` - Cross-cutting concerns (auth, git repositories, configuration)
    - `Repository/` - App scope, release and deployment database interactions
    - `EventHandlers/` - MediatR event handlers for domain events
    - `Hubs/` - SignalR hubs for real-time communication
    - `Migrations/` - Entity Framework database migrations
    - `Scheduling/` - Quartz background job definitions

- **`src/DataModeling/`** - Data modeling and schema conversion library:
    - `Converter/` - Converts between JSON Schema, XSD, and C# models
    - `Json/` - JSON Schema processing and validation
    - `Metamodel/` - Internal data model representation
    - `Templates/` - Code generation templates
    - `Validator/` - Schema validation logic

- **`PolicyAdmin/`** - Policy and authorization management:
    - `Models/` - XACML policy models
    - `PolicyConverter.cs` - Policy format conversions

### Test Projects

- **`tests/Designer.Tests/`** - Unit and integration tests for main Designer project
- **`tests/DataModeling.Tests/`** - Tests for data modeling functionality
- **`tests/SharedResources.Tests/`** - Shared testing utilities

## Development Commands

### Build & Run

- `dotnet build` - Build the solution
- `dotnet run --project src/Designer` - Run the Designer API
- `dotnet watch --project src/Designer` - Run with hot reload

### Testing

- `dotnet test` - Run all tests
- `dotnet test --filter "FullyQualifiedName~PartlyMatchingTestName"` - Run specific tests

## Coding guidelines

- Instead of passing the combination of `org`, `repo`/`app` and `developer`/`user` parameters into functions separately, look for suitable classes that join them into one, e.g. AltinnRepoEditingContext.

## v8 and v9 apps

Designer writes app files for both generations. `AppDevelopmentService` serves v8 apps, whose UI
lives in layout sets, and is frozen: it keeps v8 output correct and gets no new features.
`UiFoldersService` serves v9 apps, where each folder under `App/ui/` is a UI folder named by its task
id (or a subform). A grep for a generated file finds both; before calling Designer's output wrong for
v9, read the `UiFoldersService` counterpart. In text a v9 developer reads (messages, docs, new
comments), say "UI folder", not "layout set", even where the code's identifiers still say
`LayoutSet`.

## Testing Guidelines

- macOS file systems are case-insensitive and Linux CI's is not. A test of case-only names (renames,
  collisions) can pass on a Mac without the fix and fail in CI, or the reverse; pin such rules with a
  repository-level test rather than a file-system round trip.
- The "Run integration tests against actual gitea and dbs" job sometimes fails a block of
  `RepositoryController` tests on Gitea's side (403 on repository creation, unexpected 204 from
  `GetBranches`). Re-run the failed job once before debugging.
- CodeQL raises `cs/path-injection` on every file call in `GitRepository` that takes the guarded
  absolute path. Rewriting that file IO moves the existing alerts, and they show as new on the PR.

- Mock external dependencies using `Moq`
- Follow Arrange, Act, Assert pattern
- Place test files in same folder structure as source files
- Use test helpers in `./tests/Designer.Tests/Utils/TestDataHelper.cs` when possible
- Use mocked repositories located in `./tests/Designer.Tests/_TestData/Repositories/testUser/ttd` when applicable
