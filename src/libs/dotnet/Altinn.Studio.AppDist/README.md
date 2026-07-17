# Altinn.Studio.AppDist

Shared library for fetching and caching Altinn App resource files. The content layer is a complete copy of the
frontend distribution. The schemas layer duplicates `schemas/**` so validation tooling can fetch only that small
subset. Both are cached independently.

Example usage:

```csharp
using var appDist = AppDist.CreateDefault(cacheDirectory);

var schemas = await appDist.GetLayerAsync("9.0.0", AppDistLayer.Schemas);
if (schemas is null)
    return;
var layoutSchema = await schemas.GetFileTextAsync(AppDist.JsonSchemas.Layout);
var schemasByPath = await schemas.GetFilesAsync("schemas/json");
```


Fetch the self-contained content layer and copy the complete frontend distribution:

```csharp
using var appDist = AppDist.CreateDefault(cacheDirectory);
var dist = await appDist.GetVersionAsync("9.0.0");
if (dist is not null)
    await dist.CopyToDirectoryAsync(wwwRoot);

var versions = await appDist.ListVersionsAsync() ?? await appDist.ListCachedVersionsAsync(AppDistLayer.Schemas);
```

Custom sources and stores plug in through the two-interface constructor:

```csharp
IAppDistProvider appDist = new AppDist(
    new OciRegistrySource(httpClient),
    new FileSystemAppDistStore(cacheDirectory)
);
```
