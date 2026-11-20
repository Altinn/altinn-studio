# Coding standards

How we write code in this repository, beyond what the formatters and linters enforce. A component's
`coding-standards.md` adds what only it needs.

## Design

- Keep functions short, and let each do one thing.
- Use descriptive names without abbreviations.
- Give hard-coded numbers and strings a constant with a descriptive name, unless their type already says what they
  mean, such as `mode === 'edit'` when `mode` is `'edit' | 'read'`.
- Make invalid states unrepresentable at the outer layer, so the code past it does not check them again.
- Model a concept of the Altinn Studio domain once, in the domain model in [src/common](../src/common/README.md), and
  use it in every component that needs the concept. A component that models it for itself gets a rule of its own, and
  the rules drift apart. Name its types with the terms in the [glossary](../GLOSSARY.md).
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
- Make a type a struct when it is immutable, compares by value and takes at most 16 bytes, and a
  `readonly record struct` when it would otherwise be a record. A struct has a default value that no code created, so a
  type whose values come from parsing refuses to give the value of its default.
- A record compares a list it holds by reference, so two records with the same content differ. A record of the domain
  model holds a list as `ValueList<T>`, which compares its items.
- Do not add the `Async` suffix to method names.
- Write an XML doc comment on every public type and member. Test classes and test methods need none: they are public
  only because the test framework requires it, and their names say what they check.
- Warnings fail the build locally as they do in CI. To build past one while you work, pass
  `-p:TreatWarningsAsErrors=false`. A later build does not recompile code that has not changed since, so it does not
  report those warnings again. Build with `--no-incremental` before you push.

## Go

We use Go for cloud-native services and tooling, as [the ADR](adr/2025-10-17-using-go.md) decided. Fix a lint finding
rather than suppress it. A suppression names the linter and says why.
