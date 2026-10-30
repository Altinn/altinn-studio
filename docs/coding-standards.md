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

A comment says why the code next to it is the way it is, and the constraints the code cannot show. Enforce a rule with a type, validation or a test where you can, and link to a doc or an ADR when the
reason is bigger than the code.

## Language and formatting

- We prefer automated formatting and linting. When a tool can enforce a rule, configure the tool instead of writing
  the rule down, and run the component's checks before you push.
- Code, comments and docs are in US English. The [spell check](../scripts/spellcheck/README.md) says which text is in
  another language and where exceptions go.

## .NET

- Make types `internal` and classes `sealed` unless there is a reason not to.
- Do not add the `Async` suffix to method names.
- Write an XML doc comment on every public type and member.
- Warnings fail the build locally as they do in CI. To build past one while you work, pass
  `-p:TreatWarningsAsErrors=false`.

## Go

We use Go for cloud-native services and tooling, as [the ADR](adr/2025-10-17-using-go.md) decided. Fix a lint finding
rather than suppress it. A suppression names the linter and says why.
