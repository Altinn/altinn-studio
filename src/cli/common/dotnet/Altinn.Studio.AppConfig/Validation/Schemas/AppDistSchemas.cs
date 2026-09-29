using Altinn.Studio.AppDist;

namespace Altinn.Studio.AppConfig.Validation.Schemas;

public static class AppDistSchemas
{
    public const string SchemaDirectory = "schemas/json";

    public static async Task<SchemaSet?> LoadAsync(
        IAppDistProvider appDist,
        string version,
        CancellationToken cancellationToken = default
    )
    {
        var content = await appDist.GetLayerAsync(version, AppDistLayer.Schemas, cancellationToken);
        return content is null
            ? null
            : SchemaSet.FromFiles(await content.GetFilesAsync(SchemaDirectory, cancellationToken));
    }
}
