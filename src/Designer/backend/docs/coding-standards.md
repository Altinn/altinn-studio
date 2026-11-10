# Coding standards

What the [Designer backend](../README.md) adds to the repository's
[coding standards](../../../../docs/coding-standards.md).

- Pass an `AltinnRepoEditingContext` instead of separate organization, repository and developer parameters. The
  three together name one clone of a repository.
- CodeQL reports `cs/path-injection` on the file calls in `GitRepository` that take an absolute path the class has
  already checked. Rewriting such a call moves its alert, and the pull request then shows the alert as new.

## Tests

- Use the helpers in [TestDataHelper](../tests/Designer.Tests/Utils/TestDataHelper.cs) and the test repositories in
  [\_TestData/Repositories/testUser/ttd](../tests/Designer.Tests/_TestData/Repositories/testUser/ttd).
- File systems on macOS are case-insensitive, and the Linux file system in CI is case-sensitive. A test of names
  that differ only in case can pass on one and fail on the other. Test such rules at the repository level instead of
  through a file system round trip.
