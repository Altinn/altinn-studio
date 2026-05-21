using Microsoft.Extensions.Configuration.Json;
using Microsoft.Extensions.FileProviders;

namespace Altinn.Augmenter.Agent.Configuration;

/// <summary>
/// Reads runtime secrets (e.g. <c>Agent:ApiKey</c>) from a JSON file mounted by the
/// Altinn platform at <c>/altinn-appsettings-secret/altinn-appsettings-secret.json</c>.
/// Mirrors the <c>AddAppSettingsSecretFile</c> helper used by Altinn Apps so the
/// platform's existing Key Vault → K8s Secret sync also feeds this image without
/// requiring it to authenticate to Key Vault directly. The file is optional —
/// outside the platform (local dev, tests) the directory does not exist and the
/// call is a no-op, leaving env vars / .env as the authoritative source.
/// </summary>
public static class SecretFileConfigurationExtensions
{
    public const string DefaultRoot = "/altinn-appsettings-secret";
    public const string DefaultFileName = "altinn-appsettings-secret.json";

    public static IConfigurationBuilder AddAltinnPlatformSecretFile(
        this IConfigurationBuilder builder,
        string? root = null,
        string? fileName = null)
    {
        try
        {
            root ??= DefaultRoot;
            fileName ??= DefaultFileName;

            var alreadyAdded = builder.Sources
                .OfType<JsonConfigurationSource>()
                .Any(source => source.Path == fileName);

            if (alreadyAdded)
                return builder;

            builder.AddJsonFile(new PhysicalFileProvider(root), fileName, optional: true, reloadOnChange: true);
        }
        catch (DirectoryNotFoundException)
        {
            // Directory absent in dev / tests. PhysicalFileProvider would otherwise
            // need to scan the filesystem root to honor reloadOnChange.
        }

        return builder;
    }
}
