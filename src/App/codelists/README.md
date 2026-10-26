# Altinn.Codelists

Altinn.Codelists gives Altinn 3 apps shared code lists, such as counties, municipalities, countries and occupations,
from public sources like SSB, Kartverket and Posten. An app registers the code lists it wants, and a form component
uses one as its options through the code list ID. [Options](https://docs.altinn.studio/app/development/data/options/)
on docs.altinn.studio describes how apps use code lists.

## Development

This README is also the package's readme on NuGet. The code lives in
[src/App/codelists](https://github.com/Altinn/altinn-studio/tree/main/src/App/codelists) in the Altinn Studio
repository. [Altinn Apps](https://github.com/Altinn/altinn-studio/blob/main/src/App/README.md#releases) describes how
it is released and how it depends on `Altinn.App.Core`.
