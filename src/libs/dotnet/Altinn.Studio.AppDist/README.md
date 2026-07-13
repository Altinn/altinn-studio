# Altinn.Studio.AppDist

Shared library for fetching and caching Altinn App resource files.

Example usage:

```csharp
IAppDistProvider appDist = new AppDist(
    new OciRegistrySource(httpClient),
    new FileSystemAppDistStore(cacheDirectory)
);

await appDist.GetFileAsync("9.0.0", AppDist.JsonSchemas.Layout);
await appDist.GetFileAsync("0.0.0-test", "schemas/json/layout/layout.schema.v1.json");
await appDist.ListFilesAsync("9.10.1");
```
