using Altinn.App.Core.Extensions;
using Altinn.App.Core.Internal.ProvisionedSecrets;
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
                StudioctlLocalConfiguration.AddIfAvailable(configBuilder, context.HostingEnvironment);

                AddRuntimeConfigFiles(configBuilder, context.HostingEnvironment, ProvisionedSecrets.ClusterDirectory);
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

        // The files the libraries host are read through the private channel (see ProvisionedSecrets) and must
        // never land in the app's own configuration root: nothing built in reads them from here, and a package
        // binding one of their sections by convention would otherwise pick up what the platform provisioned.
        jsonFiles = Array.FindAll(jsonFiles, file => !IsHostedProvisionedFile(Path.GetFileName(file)));

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
                provider: secretsFileProvider ??= CreateRuntimeSecretsFileProvider(secretsDirectory),
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
                provider: secretsFileProvider ??= CreateRuntimeSecretsFileProvider(secretsDirectory),
                path: jsonFileName,
                optional: true,
                reloadOnChange: true
            );
        }
    }

    /// <summary>
    /// What every Maskinporten credentials file is named after. Kept alongside the exact names so that a
    /// variant an older platform still mounts (maskinporten-settings-internal.json once existed) stays out of
    /// the app's configuration root too.
    /// </summary>
    private static readonly string _maskinportenFileNamePrefix = Path.GetFileNameWithoutExtension(
        ProvisionedSecretFiles.Maskinporten.FileName
    );

    /// <summary>
    /// Whether <paramref name="fileName"/> is one of the files the libraries host on the provisioned secrets
    /// channel, and therefore one the sweep must leave alone.
    /// </summary>
    private static bool IsHostedProvisionedFile(string fileName)
    {
        IReadOnlyList<ProvisionedSecretFile> hostedFiles = ProvisionedSecretFiles.All;
        for (int i = 0; i < hostedFiles.Count; i++)
        {
            if (string.Equals(fileName, hostedFiles[i].FileName, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return fileName.StartsWith(_maskinportenFileNamePrefix, StringComparison.OrdinalIgnoreCase);
    }

    private static PhysicalFileProvider CreateRuntimeSecretsFileProvider(string secretsDirectory) =>
        new(secretsDirectory)
        {
            // This path is normally a Kubernetes Secret/projected volume. Kubernetes updates it by swapping
            // the ..data symlink target, so polling is required to detect credential changes reliably.
            UsePollingFileWatcher = true,
            UseActivePolling = true,
        };
}
