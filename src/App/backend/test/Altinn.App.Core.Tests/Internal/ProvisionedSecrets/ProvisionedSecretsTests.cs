using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal;
using Altinn.App.Core.Internal.ProvisionedSecrets;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

// The type under test shares its name with the last segment of its namespace, so a test namespace mirroring the
// folder would hide it: C# finds the sibling namespace before the imported type.
namespace Altinn.App.Core.Tests.Internal;

public sealed class ProvisionedSecretsTests
{
    private static readonly ProvisionedSecretFile _maskinporten = ProvisionedSecretFiles.Maskinporten;

    [Fact]
    public void GetExistingProviderRoot_ReturnsPath_WhenDirectoryExists()
    {
        using var tempDirectory = new TempDirectory();

        Assert.Equal(tempDirectory.Path, ProvisionedSecrets.GetExistingProviderRoot(tempDirectory.Path));
    }

    [Fact]
    public void GetExistingProviderRoot_ReturnsNearestExistingParent_WhenDirectoryDoesNotExist()
    {
        using var tempDirectory = new TempDirectory();
        string missingDirectory = Path.Join(tempDirectory.Path, "missing", "app-secrets");

        Assert.Equal(tempDirectory.Path, ProvisionedSecrets.GetExistingProviderRoot(missingDirectory));
    }

    [Fact]
    public void PathOf_IsTheFileInTheProvisionedDirectory()
    {
        using var tempDirectory = new TempDirectory();

        using var secrets = new ProvisionedSecrets(tempDirectory.Path, ProvisionedSecretFiles.All);

        Assert.Equal(
            Path.GetFullPath(Path.Join(tempDirectory.Path, _maskinporten.FileName)),
            Path.GetFullPath(secrets.PathOf(_maskinporten))
        );
    }

    [Fact]
    public void Section_IsEmpty_WhenTheFileDoesNotExist()
    {
        using var tempDirectory = new TempDirectory();

        using var secrets = new ProvisionedSecrets(tempDirectory.Path, ProvisionedSecretFiles.All);

        Assert.Empty(secrets.Section(_maskinporten).AsEnumerable(makePathsRelative: true));
    }

    [Fact]
    public void Section_IsEmpty_WhenTheDirectoryDoesNotExist()
    {
        // The secrets volume is mounted by the platform, so the directory can be missing at startup.
        using var tempDirectory = new TempDirectory();

        using var secrets = new ProvisionedSecrets(
            Path.Join(tempDirectory.Path, "missing"),
            ProvisionedSecretFiles.All
        );

        Assert.Empty(secrets.Section(_maskinporten).AsEnumerable(makePathsRelative: true));
    }

    [Fact]
    public async Task Section_ReadsTheProvisionedFile()
    {
        using var tempDirectory = new TempDirectory();
        await File.WriteAllTextAsync(
            Path.Join(tempDirectory.Path, _maskinporten.FileName),
            CreateSettingsJson("provisioned-client")
        );

        using var secrets = new ProvisionedSecrets(tempDirectory.Path, ProvisionedSecretFiles.All);

        Assert.Equal("provisioned-client", secrets.Section(_maskinporten)["clientId"]);
    }

    [Fact]
    public async Task Section_ReadsAFileProvisionedAfterTheChannelWasBuilt()
    {
        // Every file is optional and the provider polls, so one the platform writes after the app started is
        // picked up without a restart.
        using var tempDirectory = new TempDirectory();

        using var secrets = new ProvisionedSecrets(tempDirectory.Path, ProvisionedSecretFiles.All);
        Assert.Null(secrets.Section(_maskinporten)["clientId"]);

        await File.WriteAllTextAsync(
            Path.Join(tempDirectory.Path, _maskinporten.FileName),
            CreateSettingsJson("client-after")
        );

        await Wait.Until(() => secrets.Section(_maskinporten)["clientId"] == "client-after", TimeSpan.FromSeconds(30));
    }

    [LinuxOnlyFact]
    public async Task Section_Reloads_WhenTheKubernetesDataSymlinkChanges()
    {
        using var tempDirectory = new TempDirectory();
        var projectedVolume = new KubernetesProjectedVolume(tempDirectory.Path);
        projectedVolume.WriteVersion(
            KubernetesProjectedVolume.InitialVersionDirectoryName,
            _maskinporten.FileName,
            CreateSettingsJson("client-before"),
            KubernetesProjectedVolume.InitialVersionLastWriteTimeUtc
        );
        projectedVolume.CreateSymlinks(KubernetesProjectedVolume.InitialVersionDirectoryName, _maskinporten.FileName);

        using var secrets = new ProvisionedSecrets(tempDirectory.Path, ProvisionedSecretFiles.All);
        Assert.Equal("client-before", secrets.Section(_maskinporten)["clientId"]);

        projectedVolume.WriteVersion(
            KubernetesProjectedVolume.UpdatedVersionDirectoryName,
            _maskinporten.FileName,
            CreateSettingsJson("client-after"),
            KubernetesProjectedVolume.UpdatedVersionLastWriteTimeUtc
        );
        projectedVolume.SwapDataSymlink(KubernetesProjectedVolume.UpdatedVersionDirectoryName);

        await Wait.Until(() => secrets.Section(_maskinporten)["clientId"] == "client-after", TimeSpan.FromSeconds(30));
    }

    /// <summary>
    /// On localtest studioctl provisions the secrets the way the operator does in a cluster, and names the
    /// directory it provisions into. That is how a developer runs against a real provisioned secret without it
    /// ever entering the app's configuration.
    /// </summary>
    [Fact]
    public async Task ForPlatform_ReadsTheStudioctlDirectory_OnLocaltest()
    {
        using var tempDirectory = new TempDirectory();

        await using var serviceProvider = BuildChannelProvider(
            hostName: "local.altinn.cloud",
            (StudioctlAppEnvironment.AppSecretsDirectoryKey, tempDirectory.Path)
        );

        var secrets = serviceProvider.GetRequiredService<ProvisionedSecrets>();
        Assert.True(secrets.ProvisionedByStudioctl);
        Assert.Equal(Path.GetFullPath(tempDirectory.Path), Path.GetFullPath(secrets.Directory));
    }

    /// <summary>
    /// The same key in a deployed environment moves nothing. This is the invariant: an app cannot hand itself
    /// secrets where provisioned ones are meant to be, not even by borrowing studioctl's key.
    /// </summary>
    [Fact]
    public async Task ForPlatform_IgnoresTheStudioctlDirectory_WhenNotOnLocaltest()
    {
        using var tempDirectory = new TempDirectory();

        await using var serviceProvider = BuildChannelProvider(
            hostName: "at22.altinn.cloud",
            (StudioctlAppEnvironment.AppSecretsDirectoryKey, tempDirectory.Path)
        );

        var secrets = serviceProvider.GetRequiredService<ProvisionedSecrets>();
        Assert.False(secrets.ProvisionedByStudioctl);
        Assert.Equal(Path.GetFullPath(ProvisionedSecrets.ClusterDirectory), Path.GetFullPath(secrets.Directory));
    }

    /// <summary>
    /// A localtest run naming no directory was started outside studioctl altogether, and gets the cluster path.
    /// </summary>
    [Fact]
    public async Task ForPlatform_UsesTheClusterDirectory_WhenStudioctlNamesNoDirectory()
    {
        await using var serviceProvider = BuildChannelProvider(hostName: "local.altinn.cloud");

        var secrets = serviceProvider.GetRequiredService<ProvisionedSecrets>();
        Assert.False(secrets.ProvisionedByStudioctl);
        Assert.Equal(Path.GetFullPath(ProvisionedSecrets.ClusterDirectory), Path.GetFullPath(secrets.Directory));
    }

    /// <summary>
    /// The channel exactly as an app gets it, for a given platform hostname and app configuration.
    /// </summary>
    private static ServiceProvider BuildChannelProvider(
        string hostName,
        params (string Key, string? Value)[] appConfiguration
    )
    {
        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(
            new ConfigurationBuilder()
                .AddInMemoryCollection(
                    appConfiguration.Select(value => new KeyValuePair<string, string?>(value.Key, value.Value))
                )
                .Build()
        );
        services.AddRuntimeEnvironment();
        services.Configure<GeneralSettings>(options => options.HostName = hostName);
        services.Configure<PlatformSettings>(_ => { });
        services.AddProvisionedSecrets();

        return services.BuildStrictServiceProvider();
    }

    private static string CreateSettingsJson(string clientId) =>
        $$"""
            {
              "MaskinportenSettings": {
                "authority": "https://test.maskinporten.no/",
                "clientId": "{{clientId}}"
              }
            }
            """;

    private sealed class TempDirectory : IDisposable
    {
        public TempDirectory() => Path = Directory.CreateTempSubdirectory().FullName;

        public string Path { get; }

        public void Dispose()
        {
            if (Directory.Exists(Path))
            {
                Directory.Delete(Path, recursive: true);
            }
        }
    }
}
