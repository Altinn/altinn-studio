# AGENTS.md — Altinn.FileAnalyzers (`src/App/fileanalyzers`)

A .NET library (published as the `Altinn.FileAnalyzers` NuGet package) for **deep, binary-level analysis
and validation of files uploaded** to an Altinn 3 app instance — for example, verifying a file really is
the MIME type it claims to be (via the [Mime Detective](https://github.com/MediatedCommunications/Mime-Detective)
library).

Part of the [App runtime](../AGENTS.md). See also:
https://docs.altinn.studio/app/development/logic/validation/files/

## Two-part design (important)

The implementation is deliberately split:

- **Analyzers** extract metadata from the raw bytes and produce a standardized result set.
- **Validators** run against those analysis results.

This split lets an app use an analyzer to extract metadata *without* validating, and keeps validators
configured against a stable result set rather than embedded in analysis code. Preserve this separation
when adding new analyzers/validators.

## How apps consume it

- Register the analyzer/validator services you need (each has its own extension method), e.g.
  `services.AddMimeTypeValidation();`.
- Enable them per data type via `enabledFileAnalysers` / `enabledFileValidators` in the data type config
  (`applicationmetadata`), alongside `allowedContentTypes`, `maxSize`, etc.

## Working here

- This is a public, versioned NuGet package — treat the public API as a compatibility surface.
- Each analyzer pairs with a corresponding validator (see the catalogue in `README.md`). New file types
  should follow the analyzer → standardized-result → validator flow.
