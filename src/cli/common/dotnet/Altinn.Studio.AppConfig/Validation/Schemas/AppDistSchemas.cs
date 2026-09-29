using Altinn.Studio.AppDist;

namespace Altinn.Studio.AppConfig.Validation.Schemas;

public static class AppDistSchemas
{
    public const string SchemaDirectory = "schemas/json";

    public static async Task<SchemaSet?> Load(
        IAppDistProvider appDist,
        string version,
        CancellationToken cancellationToken = default
    )
    {
        var content = await appDist.GetLayer(version, AppDistLayer.Schemas, cancellationToken);
        return content is null ? null : SchemaSet.FromFiles(await content.GetFiles(SchemaDirectory, cancellationToken));
    }
}
