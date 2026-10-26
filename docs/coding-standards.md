# Coding standards

How we write code in this repository, beyond what the formatters and linters enforce. A component's
`coding-standards.md` adds what only it needs.

## Design

- Keep functions short, and let each do one thing.
- Use descriptive names without abbreviations.
- Give hard-coded numbers and strings a constant with a descriptive name, unless their type already says what they
  mean, such as `mode === 'edit'` when `mode` is `'edit' | 'read'`.
- Make invalid states unrepresentable at the outer layer, so the code past it does not check them again.
- Remove obsolete code paths instead of keeping them for compatibility, unless something outside the repository
  depends on them, as apps depend on the app backend.

## Comments

A comment says why the code next to it is the way it is, and the constraints the code cannot show. It does not
narrate the code. Enforce a rule with a type, validation or a test where you can, and link to a doc or an ADR when the
reason is bigger than the code.

## Language and formatting

- Code, comments and docs are in US English. The [spell check](../scripts/spellcheck/README.md) says which text is in
  another language and where exceptions go.
- Formatters and linters run in each component's checks: CSharpier for .NET, ESLint and Prettier for TypeScript, Ruff
  for Python and golangci-lint for Go. Prettier takes its indentation from `.editorconfig`, so format a file where it is:
  a copy outside the tree is formatted against other rules.

## .NET

- Make types `internal` and classes `sealed` unless there is a reason not to.
- Do not add the `Async` suffix to method names.
- Write an XML doc comment on every public type and member.
- Most areas treat warnings as errors only when `CI=true`, and an incremental build does not repeat the warnings of a
  project it skips. To reproduce CI, run `CI=true dotnet build <solution> --no-incremental`. A bare `-warnaserror` is
  not the same, since it also fails on the NuGet audit advisories (`NU1901` to `NU1904`) that CI allows.

## Go

We use Go for cloud-native services and tooling, as [the ADR](adr/2025-10-17-using-go.md) decided. Each Go module's
golangci-lint configuration enables nearly every linter.

- Fix a finding rather than adding `//nolint`. A `//nolint` names the linter and gives a reason.
- `make lint-fix` reorders struct fields for the `fieldalignment` check.
