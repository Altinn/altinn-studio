using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;

namespace Altinn.App.Core.Extensions;

/// <summary>
/// This class holds a collection of extension methods for <see cref="IConfigurationBuilder"/>.
/// </summary>
public static class ConfigurationBuilderExtensions
{
    /// <summary>
    /// Load all known configuration sources known to be needed by an app.
    /// </summary>
    /// <param name="builder">The <see cref="IConfigurationBuilder"/></param>
    /// <param name="args">The original command line arguments</param>
    public static void LoadAppConfig(this IConfigurationBuilder builder, string[]? args = null)
    {
        try
        {
            builder.AddJsonFile(
                new PhysicalFileProvider("/altinn-appsettings-secret"),
                @"altinn-appsettings-secret.json",
                true,
                true
            );
        }
        catch (DirectoryNotFoundException)
        {
            // Extra secrets configuration file is optional. The directory does not exist in dev environments, but
            // is otherwise mounted to a folder directly on the filesystem root. We could init the file provider
            // with the root folder (and not have to catch this exception), but that would cause
            // 'reloadOnChange: true' to recurse through the entire file system to monitor for changes.
        }

        // Add values from environment and command line arguments last, to override values from other sources.
        builder.AddEnvironmentVariables();
        builder.AddCommandLine(args ?? []);
    }
}
