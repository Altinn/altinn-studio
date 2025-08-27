## Scripts

Collection of utility-scripts for Studio frontend.

### Getting started

To install dependencies, run:

```
yarn --immutable
```

To run the scripts, read more about the different scripts and how to use them below.

### configurationStats

Run to generate statistics on how much configuration Altinn Studio has covered on the following files:

- layout-files
- applicationMetadata.json
- layout-sets.json

Update the `unsupported.ts`-file by removing config from the unsupported list once support has been implemented.

To run the script:

```
yarn run generate-config-coverage-stats
```

### componentSchemas

Run to generate separate component schemas from the layout schemas on CDN.

Currently supports 2 versions of app-frontend:

- v3: https://altinncdn.no/schemas/json/layout/layout.schema.v1.json
- v4: https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json

Provide the desired version as an argument when running the script.

To run:

```
yarn run generate-json-schemas <version>
```

where `<version>` can be `v3` or `v4`.

The component schemas will be generated in the corresponding `ux-editor` package, depending on version:

- v3: `ux-editor-v3`
- v4: `ux-editor` (current)
