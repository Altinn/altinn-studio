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

                // Both the directory and the hosted file names come from the platform, and are read back out
                // of the configuration built so far - which includes the environment studioctl just imported.
                // Each file resolves its own name, the same way the provisioned secrets channel does; a name
                // the platform did not set excludes nothing, because that environment has a bigger problem and
                // the provisioned secrets startup check is what reports it.
                HashSet<string> hostedFileNames = new(StringComparer.OrdinalIgnoreCase);
                foreach (ProvisionedSecretFile file in ProvisionedSecretFiles.All)
                {
                    if (
                        file.TryResolve(context.Configuration, out ProvisionedSecretFile? resolved)
                        && resolved.IsResolved
                    )
                    {
                        hostedFileNames.Add(resolved.FileName);
                    }
                }

                AddRuntimeConfigFiles(
                    configBuilder,
                    context.Configuration[ProvisionedSecrets.DirectoryKey],
                    hostedFileNames
                );
                configBuilder.LoadAppConfig(args);
            }
        );
    }

    /// <summary>
    /// <para>Adds the platform's runtime configuration files to the app's own configuration root.</para>
    /// <para>The same in every environment: the platform names the secrets directory wherever an app runs,
    /// and the files the libraries host there are excluded, so a local run sweeps in exactly what a deployed
    /// app does — an app-owned <c>postgresql.json</c> a developer drops into studioctl's directory included.
    /// </para>
    /// </summary>
    /// <param name="configBuilder">The configuration being built.</param>
    /// <param name="secretsDirectory">
    /// The directory the platform provisions the app's secrets into. Blank means the platform never said
    /// where, which the provisioned secrets startup check reports; there is nothing to sweep either way, so
    /// this quietly adds nothing rather than raising a second, vaguer failure.
    /// </param>
    /// <param name="hostedFileNames">
    /// The files the libraries host on the provisioned secrets channel, which the sweep must leave alone.
    /// </param>
    internal static void AddRuntimeConfigFiles(
        IConfigurationBuilder configBuilder,
        string? secretsDirectory,
        IReadOnlyCollection<string> hostedFileNames
    )
    {
        ArgumentNullException.ThrowIfNull(configBuilder);
        ArgumentNullException.ThrowIfNull(hostedFileNames);

        if (string.IsNullOrWhiteSpace(secretsDirectory))
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
        jsonFiles = Array.FindAll(jsonFiles, file => !IsHostedProvisionedFile(Path.GetFileName(file), hostedFileNames));

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
    /// Whether <paramref name="fileName"/> is one of the files the libraries host on the provisioned secrets
    /// channel, and therefore one the sweep must leave alone.
    /// </summary>
    /// <param name="fileName">The name of a file found in the secrets directory.</param>
    /// <param name="hostedFileNames">The names the platform gave the hosted files.</param>
    private static bool IsHostedProvisionedFile(string fileName, IReadOnlyCollection<string> hostedFileNames)
    {
        foreach (string hostedFileName in hostedFileNames)
        {
            if (string.Equals(fileName, hostedFileName, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
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
