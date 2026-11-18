# Coding standards

What the [Altinn.App libraries](../README.md) add to the repository's
[coding standards](../../../../docs/coding-standards.md).

## Compatibility

An app, and the packages it uses, can be compiled against an older minor version than the one the app runs with. We
plan a major version about once a year and avoid breaking changes between them.

- A public interface in `Altinn.App.Core` stays binary compatible within a major version. Add members, but do not
  remove or change them.
- Mark an interface that apps implement with `[ImplementableByApps]`. Apps compile their own implementations of it,
  so it does not change within a major version.
- Add an external dependency only when there is no reasonable way around it. Apps inherit every dependency.

## Code

- Do not use the null-forgiving operator `!`. Accept a nullable value, handle its absence, or throw with a message
  that names what is missing.
- Do not block on a `Task` with `.Result`, `.Wait()` or `.GetAwaiter().GetResult()`.
- Do not run the same async operation twice in one code path, or await one call per item in a loop. Batch the calls,
  with a limit on parallelism.
- Give an HTTP API its own `...Request` and `...Response` types, as `LookupPersonRequest` does.
- Put a new feature in its own folder under `Altinn.App.Core/Features`, with its DI registration, telemetry and tests.
- Write XML doc `<summary>` tags on their own lines.
- Generated code uses LF on every platform. In `SourceTextGenerator` and its helpers, write newlines as `\n`, since
  `AppendLine()` and `Environment.NewLine` write CRLF on Windows. Raw string literals take the line endings of their
  source file, which `.gitattributes` keeps as LF.

## Tests

- Prefer xUnit asserts over FluentAssertions.
- A Moq mock does not run default interface members. `Mock<IServiceTask>().DefineExecute(...)` returns `null`, so code that
  calls a default member needs a real fake.
- A Moq setup that leaves out an optional `CancellationToken` matches only `default`. In `Altinn.App.Api.Tests` the
  token comes from the request, so use `It.IsAny<CancellationToken>()`.
- `FakeWorkflowEngineClient` calls the callback controller directly, so it does the work of
  `WorkflowEngineCallbackAuthenticationHandler` itself. Change the two together. When they disagree, most tests that
  move a process fail, not only the callback tests, so fix the fake rather than the tests.
- The `BasicAppTests.HostedServices` snapshot lists the hosted services in registration order, and is the same on
  localtest as in other environments. A background service that must not run on localtest stays registered and checks
  `RuntimeEnvironment.IsLocaltestPlatform()` in `ExecuteAsync`.
