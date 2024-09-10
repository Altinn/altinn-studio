using Altinn.App.Core.Extensions;
using Microsoft.Extensions.FileProviders;

namespace Altinn.App.Api.Extensions;

/// <summary>
/// Class for defining extensions to IWebHostBuilder for AltinnApps
/// </summary>
public static class WebHostBuilderExtensions
{
    /// <summary>
    /// Configure webhost with default values for Altinn Apps
    /// </summary>
    /// <param name="builder">The <see cref="IWebHostBuilder"/> being configured</param>
    /// <param name="args">Application arguments</param>
    public static void ConfigureAppWebHost(this IWebHostBuilder builder, string[] args)
    {
        builder.ConfigureAppConfiguration(
            (context, configBuilder) =>
            {
                var config = new List<KeyValuePair<string, string?>>();

                if (context.HostingEnvironment.IsDevelopment())
                {
                    config.Add(new("OTEL_TRACES_SAMPLER", "always_on"));
                    config.Add(new("OTEL_METRIC_EXPORT_INTERVAL", "10000"));
                    config.Add(new("OTEL_METRIC_EXPORT_TIMEOUT", "8000"));
                }

                configBuilder.AddInMemoryCollection(config);

                configBuilder.AddMaskinportenSettingsFile(context);

                configBuilder.LoadAppConfig(args);
            }
        );
    }

    private static IConfigurationBuilder AddMaskinportenSettingsFile(
        this IConfigurationBuilder configurationBuilder,
        WebHostBuilderContext context
    )
    {
        string jsonProvidedPath =
            context.Configuration.GetValue<string>("MaskinportenSettingsFilepath")
            ?? "/mnt/app-secrets/maskinporten-settings.json";
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
