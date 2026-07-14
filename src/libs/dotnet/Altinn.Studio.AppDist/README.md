# Altinn.Studio.AppDist

Shared library for fetching and caching Altinn App resource files.
Contents are fetched per layer and cached locally.

Example usage:

```csharp
using var appDist = AppDist.CreateDefault(cacheDirectory);

var schemas = await appDist.GetLayerAsync("9.0.0", AppDistLayer.Schemas);
if (schemas is null)
    return;
var layoutSchema = await schemas.GetFileTextAsync(AppDist.JsonSchemas.Layout);
var schemasByPath = await schemas.GetFilesAsync("schemas/json");
```


Checkout and copy all resource files:

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
