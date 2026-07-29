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

        string jsonDir = Path.GetDirectoryName(jsonAbsolutePath) ?? string.Empty;
        string providerRoot = GetExistingProviderRoot(jsonDir);
        string jsonFile = Path.GetRelativePath(providerRoot, jsonAbsolutePath);
        configurationBuilder.AddJsonFile(
            provider: CreateAppSecretsFileProvider(providerRoot),
            path: jsonFile,
            optional: true,
            reloadOnChange: true
        );

        return configurationBuilder;
    }

    internal static string GetExistingProviderRoot(string path)
    {
        string? currentPath = path;
        while (!string.IsNullOrWhiteSpace(currentPath) && !Directory.Exists(currentPath))
        {
            currentPath = Path.GetDirectoryName(currentPath);
        }

        return currentPath ?? Path.GetPathRoot(path) ?? Directory.GetCurrentDirectory();
    }

    private static PhysicalFileProvider CreateAppSecretsFileProvider(string providerRoot) =>
        new(providerRoot)
        {
            // This path is normally a Kubernetes Secret/projected volume. Kubernetes updates it by swapping
            // the ..data symlink target, so polling is required to detect credential changes reliably.
            UsePollingFileWatcher = true,
            UseActivePolling = true,
        };
}
