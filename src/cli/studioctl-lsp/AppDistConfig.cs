using Altinn.Studio.AppConfig.Validation.Schemas;
using Altinn.Studio.AppDist;
using AppDistFacade = Altinn.Studio.AppDist.AppDist;

namespace Altinn.Studio.AppConfigLsp;

public static class AppDistConfig
{
    public const string CacheEnv = "STUDIOCTL_APP_DIST_CACHE";

    public static AppDistFacade? CreateProvider()
    {
        var cacheDirectory = Environment.GetEnvironmentVariable(CacheEnv);
        return string.IsNullOrWhiteSpace(cacheDirectory) ? null : AppDistFacade.CreateDefault(cacheDirectory);
    }

    public static async Task<SchemaSet?> LoadSchemasAsync(
        IAppDistProvider appDist,
        string version,
        CancellationToken cancellationToken = default
    )
    {
        var content = await appDist.GetLayerAsync(version, AppDistLayer.Schemas, cancellationToken);
        return content is null
            ? null
            : SchemaSet.FromFiles(await content.GetFilesAsync("schemas/json", cancellationToken));
    }
}
