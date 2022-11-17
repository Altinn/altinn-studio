## Shared tests for layout expressions

These tests are defined in platform-independent JSON files. The goal of these tests
is to provide a cross-platform test suite which runs the same tests on both the
frontend and backend implementations of layout expressions.

For this reason, it is very important to sync any changes in these tests with the
corresponding test collection on the backend (and port any changes from there
over here).

These tests are duplicated in:

- [app-lib-dotnet](https://github.com/Altinn/app-lib-dotnet)
- [app-frontend-react](https://github.com/Altinn/app-frontend-react)
