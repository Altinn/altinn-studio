# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

**Format code (required before commits):**
```bash
dotnet tool restore
dotnet csharpier .
```

**Check code formatting:**
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

### Versioning
- Uses **semantic versioning** with MinVer
- Avoid breaking changes when possible
- PR titles become release notes

### Platform Integrations
The libraries integrate with:
- **Altinn Platform services** (Storage, Process, Authorization)
- **Maskinporten** for machine-to-machine auth
- **Azure services** (KeyVault, Application Insights)
- **Payment providers** (Nets payment processor)
- **EFormidling** for government document exchange

## Common Development Patterns

### Feature Implementation
New features should follow the established pattern in `/src/Altinn.App.Core/Features/`:
- Feature-specific folder with clear responsibility
- Proper dependency injection registration
- Comprehensive telemetry instrumentation
- Corresponding test coverage in `/test/Altinn.App.Core.Tests/Features/`

### Testing
- Test projects mirror source structure
- Use FluentAssertions for readable assertions
- Mock external dependencies with Moq
- Include integration tests for platform service interactions

### Configuration
- Use strongly-typed configuration classes
- Register services in DI container properly
- Follow existing patterns for options configuration