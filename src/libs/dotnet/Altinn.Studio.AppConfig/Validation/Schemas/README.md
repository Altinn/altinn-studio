# Vendored app-frontend schemas

`Embedded/` holds committed snapshots of the JSON schemas the app-frontend
publishes to the CDN (`https://altinncdn.no/toolkits/altinn-app-frontend/<major>/schemas/json/...`).
`SchemaBundle` embeds them and registers each under its canonical CDN URI, so
the schema pass works offline and is version-pinned to the library. Two of the
six (`layout.schema.v1.json`, `layoutSettings.schema.v1.json`) are codegen
outputs gitignored in the frontend source tree, hence committed snapshots.

To sync: run `./sync-schemas.sh`, review the diff, run
`dotnet test src/libs/dotnet/libs.slnx`, and update affected expectations in
the same PR. There is deliberately no CI drift gate — schema updates are an
explicit, reviewed action. `FrontendMajorVersion` in `SchemaBundle.cs` selects
the CDN URL family; bump it when a new frontend major is targeted.
