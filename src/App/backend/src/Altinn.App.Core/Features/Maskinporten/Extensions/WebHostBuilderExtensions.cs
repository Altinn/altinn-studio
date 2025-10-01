using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;

namespace Altinn.App.Core.Features.Maskinporten.Extensions;

internal static class WebHostBuilderExtensions
{
    public static IConfigurationBuilder AddMaskinportenSettingsFile(
        this IConfigurationBuilder configurationBuilder,
        WebHostBuilderContext context,
        string configurationKey,
        string defaultFileLocation
    )
    {
        string jsonProvidedPath = context.Configuration.GetValue<string>(configurationKey) ?? defaultFileLocation;
        string jsonAbsolutePath = Path.GetFullPath(jsonProvidedPath);

        if (File.Exists(jsonAbsolutePath))
        {
            string jsonDir = Path.GetDirectoryName(jsonAbsolutePath) ?? string.Empty;
            string jsonFile = Path.GetFileName(jsonAbsolutePath);

            configurationBuilder.AddJsonFile(
                provider: new PhysicalFileProvider(jsonDir),
                path: jsonFile,
                optional: true,
                reloadOnChange: true
            );
        }

        return configurationBuilder;
    }
}
