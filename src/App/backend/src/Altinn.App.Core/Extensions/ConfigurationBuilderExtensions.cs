using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Configuration.Json;
using Microsoft.Extensions.FileProviders;

namespace Altinn.App.Core.Extensions;

/// <summary>
/// This class holds a collection of extension methods for <see cref="IConfigurationBuilder"/>.
/// </summary>
public static class ConfigurationBuilderExtensions
{
    internal const string AppSettingsSecretsRoot = "/altinn-appsettings-secret";
    internal const string AppSettingsSecretsFile = "altinn-appsettings-secret.json";

    /// <summary>
    /// Load all known configuration sources known to be needed by an app.
    /// </summary>
    /// <param name="builder">The <see cref="IConfigurationBuilder"/></param>
    /// <param name="args">The original command line arguments</param>
    public static void LoadAppConfig(this IConfigurationBuilder builder, string[]? args = null)
    {
        builder.AddAppSettingsSecretFile();
        builder.AddEnvironmentVariables();
        builder.AddCommandLine(args ?? []);
        builder.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);
    }

    internal static void AddAppSettingsSecretFile(
        this IConfigurationBuilder builder,
        string? root = null,
        string? path = null
    )
    {
        try
        {
            root ??= AppSettingsSecretsRoot;
            path ??= AppSettingsSecretsFile;

            bool alreadyAdded = builder.Sources.OfType<JsonConfigurationSource>().Any(source => source.Path == path);

            if (alreadyAdded)
                return;

            builder.AddJsonFile(new PhysicalFileProvider(root), path, true, true);
        }
        catch (DirectoryNotFoundException)
        {
            // Extra secrets configuration file is optional. The directory does not exist in dev environments, but
            // is otherwise mounted to a folder directly on the filesystem root. We could init the file provider
            // with the root folder (and not have to catch this exception), but that would cause
            // 'reloadOnChange: true' to recurse through the entire file system to monitor for changes.
        }
    }
}
