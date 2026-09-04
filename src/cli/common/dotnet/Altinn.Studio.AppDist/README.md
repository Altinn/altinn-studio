# Altinn.Studio.AppDist

Shared library for fetching and caching Altinn App resource files. The content layer is a complete copy of the
frontend distribution. The schemas layer duplicates `schemas/**` so validation tooling can fetch only that small
subset. Both are cached independently.

Example usage:

```csharp
using var appDist = AppDist.CreateDefault(cacheDirectory);

var schemas = await appDist.GetLayerAsync("9.0.0", AppDistLayer.Schemas);
if (schemas is null)
{
    // This version has not been published.
    return;
}
var layoutSchema = await schemas.GetFileTextAsync(AppDist.JsonSchemas.Layout);
var schemasByPath = await schemas.GetFilesAsync("schemas/json");
```


Fetch the self-contained content layer and copy the complete frontend distribution:

```csharp
using var appDist = AppDist.CreateDefault(cacheDirectory);
var dist = await appDist.GetVersionAsync("9.0.0");
if (dist is not null)
    await dist.CopyToDirectoryAsync(wwwRoot);

var versions = await appDist.ListVersionsAsync();
```

`GetVersionAsync` and `GetLayerAsync` return `null` only when the requested version does not exist. They use a cached
copy without contacting the registry when possible. Source availability, access, and artifact validation failures are
reported separately:

```csharp
try
{
    var schemas = await appDist.GetLayerAsync("9.0.0", AppDistLayer.Schemas);
    if (schemas is null)
        Console.Error.WriteLine("The requested app version has not been published.");
}
catch (AppDistSourceUnavailableException exception)
{
    Console.Error.WriteLine($"The app distribution registry is unavailable: {exception.Message}");
}
catch (AppDistSourceAccessDeniedException exception)
{
    Console.Error.WriteLine($"The app distribution registry denied access: {exception.Message}");
}
catch (AppDistArtifactException exception)
{
    Console.Error.WriteLine($"The published app distribution is invalid: {exception.Message}");
}
```

Missing versions are deliberately not cached because a later publish may make them available. To fall back
from remote version listing to cached versions, catch `AppDistSourceUnavailableException` around
`ListVersionsAsync` and call `ListCachedVersionsAsync` explicitly.

Custom sources and stores plug in through the two-interface constructor:

```csharp
IAppDistProvider appDist = new AppDist(
    new OciRegistrySource(httpClient),
    new FileSystemAppDistStore(cacheDirectory)
);
```
