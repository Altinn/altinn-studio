using System.IO;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;

namespace Altinn.App.PlatformServices.Extensions
{
    public static class ConfigurationBuilderExtensions
    {
        public static void LoadAppConfig(this IConfigurationBuilder builder)
        {
            builder.AddJsonFile(Directory.GetCurrentDirectory() + @"/appsettings.json", true, true);
            builder.AddEnvironmentVariables();
            builder.AddJsonFile(new PhysicalFileProvider("/"), @"altinn-appsettings-secret/altinn-appsettings-secret.json", true, true);
        }
    }
}
