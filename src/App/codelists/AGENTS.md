# AGENTS.md — Altinn.Codelists (`src/App/codelists`)

A .NET library (published as the `Altinn.Codelists` NuGet package) providing common, reusable **code
lists** for Altinn 3 apps — e.g. SSB classifications. Apps register it via DI and connect form
components to a code list by option ID.

Part of the [App runtime](../AGENTS.md). See also the Altinn docs on options/code lists:
https://docs.altinn.studio/app/development/data/options/

## How apps consume it

- Add the `Altinn.Codelists` package reference.
- Register all providers at once with `services.AddAltinnCodelists();`, or register individual code
  lists (to override the option ID or pass parameters), e.g.
  `services.AddSSBClassificationCodelistProvider("næring", Classification.IndustryGrouping);`.
- Connect a component to a code list via its *Kodeliste-ID* in Studio, or the `optionsId` property in
  `FormLayout.json`.

## Working here

- Code lists are grouped by source (e.g. SSB). Each source exposes its own registration extension
  methods and supports custom option IDs and source-specific parameters (level filters, etc.).
- This is a public, versioned NuGet package — treat the public API as a compatibility surface.
- See `README.md` for the current provider catalogue and configuration examples; follow the .NET build
  and formatting conventions used across the App backend.
