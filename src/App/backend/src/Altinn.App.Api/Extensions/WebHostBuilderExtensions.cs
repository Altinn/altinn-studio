using Altinn.App.Core.Configuration;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features.Maskinporten.Extensions;
using Microsoft.Extensions.Configuration.Json;
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

                var runtimeSecretsDirectory = context.Configuration["AppSettings:RuntimeSecretsDirectory"];
                if (string.IsNullOrWhiteSpace(runtimeSecretsDirectory))
                {
                    runtimeSecretsDirectory = AppSettings.DefaultRuntimeSecretsDirectory;
                }

                configBuilder.AddMaskinportenSettingsFile(
                    context,
                    "MaskinportenSettingsFilepath",
                    Path.Join(runtimeSecretsDirectory, "maskinporten-settings.json")
                );
                configBuilder.AddMaskinportenSettingsFile(
                    context,
                    "MaskinportenSettingsInternalFilepath",
                    Path.Join(runtimeSecretsDirectory, "maskinporten-settings-internal.json")
                );

                AddRuntimeConfigFiles(configBuilder, context.HostingEnvironment, runtimeSecretsDirectory);
                configBuilder.LoadAppConfig(args);
            }
        );
    }

    internal static void AddRuntimeConfigFiles(
        IConfigurationBuilder configBuilder,
        IHostEnvironment hostEnvironment,
        string secretsDirectory
    )
    {
        ArgumentNullException.ThrowIfNull(configBuilder);
        ArgumentNullException.ThrowIfNull(hostEnvironment);
        ArgumentException.ThrowIfNullOrWhiteSpace(secretsDirectory);

        if (hostEnvironment.IsDevelopment())
        {
            return;
        }

        const string overrideFileNameFragment = "override";
        if (!Directory.Exists(secretsDirectory))
        {
            return;
        }

        string[] jsonFiles = Directory.GetFiles(secretsDirectory, "*.json", SearchOption.TopDirectoryOnly);
        Array.Sort(jsonFiles, StringComparer.OrdinalIgnoreCase);

        PhysicalFileProvider? secretsFileProvider = null;
        HashSet<string> existingJsonFilePaths = [];

        foreach (JsonConfigurationSource source in configBuilder.Sources.OfType<JsonConfigurationSource>())
        {
            if (source.FileProvider is null || string.IsNullOrWhiteSpace(source.Path))
            {
                continue;
            }

            string? existingJsonFilePath = source.FileProvider.GetFileInfo(source.Path).PhysicalPath;
            if (string.IsNullOrWhiteSpace(existingJsonFilePath))
            {
                continue;
            }

            existingJsonFilePaths.Add(Path.GetFullPath(existingJsonFilePath));
        }

        foreach (string jsonFile in jsonFiles)
        {
            string jsonFilePath = Path.GetFullPath(jsonFile);
            if (existingJsonFilePaths.Contains(jsonFilePath))
            {
                continue;
            }

            string jsonFileName = Path.GetFileName(jsonFile);
            if (jsonFileName.Contains(overrideFileNameFragment, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            configBuilder.AddJsonFile(
                provider: secretsFileProvider ??= new PhysicalFileProvider(secretsDirectory),
                path: jsonFileName,
                optional: true,
                reloadOnChange: true
            );
        }

        foreach (string jsonFile in jsonFiles)
        {
            string jsonFilePath = Path.GetFullPath(jsonFile);
            if (existingJsonFilePaths.Contains(jsonFilePath))
            {
                continue;
            }

            string jsonFileName = Path.GetFileName(jsonFile);
            if (!jsonFileName.Contains(overrideFileNameFragment, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            configBuilder.AddJsonFile(
                provider: secretsFileProvider ??= new PhysicalFileProvider(secretsDirectory),
                path: jsonFileName,
                optional: true,
                reloadOnChange: true
            );
        }
    }
}
