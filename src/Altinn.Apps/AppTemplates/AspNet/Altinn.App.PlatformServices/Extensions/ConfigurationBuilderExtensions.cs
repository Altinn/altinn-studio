using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;

namespace Altinn.App.PlatformServices.Extensions
{
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
        public static void LoadAppConfig(this IConfigurationBuilder builder, string[] args = null)
        {
            builder.AddJsonFile(
                new PhysicalFileProvider("/"),
                @"altinn-appsettings-secret/altinn-appsettings-secret.json",
                true,
                true);

            // Add values from environment and command line arguments last, to override values from other sources.
            builder.AddEnvironmentVariables();
            builder.AddCommandLine(args ?? new string[0]);
        }
    }
}
