# App-frontend schema validation

The schema pass (`SchemaValidator`) checks app JSON files against the schemas the
app-frontend publishes, matching each file's declared `$schema` URL. The schemas
themselves are no longer shipped with this library: an earlier version embedded a
snapshot, but that pinned every app to one schema version regardless of the
frontend version the app actually targets.

The source of truth is the `app-dist` OCI artifact the frontend publishes to GHCR
(`ghcr.io/altinn/altinn-studio/app-dist`, workflow
`.github/workflows/publish-app-oci-artifact.yaml`). It is tagged with the frontend
semver and major, and carries the `schemas/json` directory as a layer with media
type `application/vnd.altinn.app.schemas.tar+gzip`.

Hosts attach the schemas by fetching that layer for the frontend version the app
uses — `Altinn.Studio.AppDist` (sibling project) does the pull and caching — and
loading it via `SchemaSet.FromFiles` (or `FromDirectory` for an on-disk source):

```csharp
var paths = await appDist.ListFilesAsync(major, AppDist.Components.Schemas);
// read each file via appDist.GetFileAsync, strip the "schemas/json/" prefix
var schemas = SchemaSet.FromFiles(files, declaredBaseUrl);
engine.ValidateAll(schemas);
```

`SchemaSet` keys each schema by `baseUrl` + relative path so lookups match the
URLs app files declare in `$schema`, and keeps a per-set registry so sets for
different frontend versions can coexist in one process. Without a set, the pass
reports Altinn-schema files as not schema-checked (info severity) instead of
validating them.
