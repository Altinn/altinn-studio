using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;

namespace Altinn.App.PlatformServices.Extensions
{
    public static class ConfigurationBuilderExtensions
    {
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
