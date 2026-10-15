# Developing the Designer backend

## Conventions

- Pass an `AltinnRepoEditingContext` instead of separate organization, repository and developer parameters.
- In text that a v9 app developer reads, such as messages and documentation, say "UI folder" instead of "layout
  set", even where identifiers say `LayoutSet`.

## Tests

- Test files follow the folder structure of the source files.
- Tests follow the Arrange, Act, Assert pattern and mock external dependencies with Moq.
- Use the helpers in [`TestDataHelper`](../tests/Designer.Tests/Utils/TestDataHelper.cs) and the test repositories
  in [`_TestData/Repositories/testUser/ttd`](../tests/Designer.Tests/_TestData/Repositories/testUser/ttd).
- File systems on macOS are case-insensitive, and the Linux file system in CI is case-sensitive. A test of names
  that differ only in case can pass on one and fail on the other. Test such rules at the repository level instead
  of through a file system round trip.
- The CI job that runs the Gitea and database integration tests sometimes fails a block of `RepositoryController`
  tests on Gitea's side, with a 403 on repository creation or an unexpected 204 from `GetBranches`. Rerun the
  failed job once before you debug.
