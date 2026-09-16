using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Features.Maskinporten.Extensions;
using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.App.Core.Internal;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Tests.Features.Maskinporten;

public sealed class MaskinportenSettingsSourceTests
{
    private const string SettingsFileName = "maskinporten-settings.json";

    /// <summary>
    /// The provisioned location is not reachable from the app's configuration - there is no key for it, and
    /// nothing composes it from one. This pins the path the platform actually mounts.
    /// </summary>
    [Fact]
    public void DefaultFilePath_IsTheProvisionedLocation()
    {
        Assert.Equal(
            Path.Join(AppSettings.DefaultRuntimeSecretsDirectory, SettingsFileName),
            MaskinportenSettingsSource.DefaultFilePath
        );
    }

    [Fact]
    public void GetExistingProviderRoot_ReturnsPath_WhenDirectoryExists()
    {
        using var tempDirectory = new TempDirectory();

        Assert.Equal(tempDirectory.Path, MaskinportenSettingsSource.GetExistingProviderRoot(tempDirectory.Path));
    }

    [Fact]
    public void GetExistingProviderRoot_ReturnsNearestExistingParent_WhenDirectoryDoesNotExist()
    {
        using var tempDirectory = new TempDirectory();
        string missingDirectory = Path.Join(tempDirectory.Path, "missing", "app-secrets");

        Assert.Equal(tempDirectory.Path, MaskinportenSettingsSource.GetExistingProviderRoot(missingDirectory));
    }

    [Fact]
    public void Settings_AreEmpty_WhenTheFileDoesNotExist()
    {
        using var tempDirectory = new TempDirectory();

        using var configuration = new MaskinportenSettingsSource(Path.Join(tempDirectory.Path, SettingsFileName));

        Assert.Empty(configuration.Section.AsEnumerable(makePathsRelative: true));
    }

    [Fact]
    public void Settings_AreEmpty_WhenTheDirectoryDoesNotExist()
    {
        using var tempDirectory = new TempDirectory();

        using var configuration = new MaskinportenSettingsSource(
            Path.Join(tempDirectory.Path, "missing", SettingsFileName)
        );

        Assert.Empty(configuration.Section.AsEnumerable(makePathsRelative: true));
    }

    [Fact]
    public async Task Options_BindTheProvisionedFile()
    {
        using var tempDirectory = new TempDirectory();
        string settingsPath = Path.Join(tempDirectory.Path, SettingsFileName);
        await File.WriteAllTextAsync(settingsPath, CreateSettingsJson("provisioned-client"));

        await using var serviceProvider = BuildOptionsProvider(settingsPath);

        var settings = serviceProvider.GetRequiredService<IOptions<MaskinportenSettings>>().Value;
        Assert.Equal("provisioned-client", settings.ClientId);
        Assert.Equal("https://test.maskinporten.no/", settings.Authority);
    }

    [Fact]
    public async Task Options_IgnoreAnyMaskinportenInputInTheAppConfiguration()
    {
        // The whole point of the private configuration root: an app cannot supply, extend or displace the
        // credentials the platform provisions, no matter what it puts in its own configuration.
        using var tempDirectory = new TempDirectory();
        string settingsPath = Path.Join(tempDirectory.Path, SettingsFileName);
        await File.WriteAllTextAsync(settingsPath, CreateSettingsJson("provisioned-client"));

        await using var serviceProvider = BuildOptionsProvider(
            settingsPath,
            ("MaskinportenSettings:clientId", "app-supplied-client"),
            ("MaskinportenSettings:jwkBase64", "app-supplied-key"),
            ("MaskinportenSettingsFilepath", "/app/an-identity-of-my-own.json"),
            ("AppSettings:RuntimeSecretsDirectory", "/app/secrets-of-my-own")
        );

        var settings = serviceProvider.GetRequiredService<IOptions<MaskinportenSettings>>().Value;
        Assert.Equal("provisioned-client", settings.ClientId);
        Assert.Null(settings.JwkBase64);
    }

    [Fact]
    public async Task Options_FailValidation_WhenNothingIsProvisioned()
    {
        using var tempDirectory = new TempDirectory();
        string settingsPath = Path.Join(tempDirectory.Path, SettingsFileName);

        await using var serviceProvider = BuildOptionsProvider(settingsPath);

        var exception = Assert.Throws<OptionsValidationException>(() =>
            serviceProvider.GetRequiredService<IOptions<MaskinportenSettings>>().Value
        );
        // The failure names the place the platform provisions into, not a field, and points a developer who
        // hits it on their own machine at the tool that provisions locally.
        Assert.Contains(settingsPath, exception.Message, StringComparison.Ordinal);
        Assert.Contains("where the platform provisions them", exception.Message, StringComparison.Ordinal);
        Assert.Contains("studioctl app maskinporten set", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Options_FailValidationFieldByField_WhenTheFileIsIncomplete()
    {
        // A partial file is a different problem from a missing one, and the data annotations describe it.
        using var tempDirectory = new TempDirectory();
        string settingsPath = Path.Join(tempDirectory.Path, SettingsFileName);
        await File.WriteAllTextAsync(settingsPath, """{ "MaskinportenSettings": { "clientId": "half-a-client" } }""");

        await using var serviceProvider = BuildOptionsProvider(settingsPath);

        var exception = Assert.Throws<OptionsValidationException>(() =>
            serviceProvider.GetRequiredService<IOptions<MaskinportenSettings>>().Value
        );
        Assert.Contains("Authority", exception.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("studioctl", exception.Message, StringComparison.Ordinal);
    }

    [LinuxOnlyFact]
    public async Task Options_LoadTheFile_WhenTheSecretsDirectoryAppearsLater()
    {
        // The secrets volume is mounted by the platform and can show up after the app has started.
        using var tempDirectory = new TempDirectory();
        string settingsDirectory = Path.Join(tempDirectory.Path, "missing");
        string settingsPath = Path.Join(settingsDirectory, SettingsFileName);

        await using var serviceProvider = BuildOptionsProvider(settingsPath);
        var options = serviceProvider.GetRequiredService<IOptionsMonitor<MaskinportenSettings>>();

        Directory.CreateDirectory(settingsDirectory);
        await File.WriteAllTextAsync(settingsPath, CreateSettingsJson("client-after"));

        await Wait.Until(() => TryReadClientId(options) == "client-after", TimeSpan.FromSeconds(30));
    }

    [LinuxOnlyFact]
    public async Task Options_Reload_WhenTheKubernetesDataSymlinkChanges()
    {
        using var tempDirectory = new TempDirectory();
        var projectedVolume = new KubernetesProjectedVolume(tempDirectory.Path);
        projectedVolume.WriteVersion(
            KubernetesProjectedVolume.InitialVersionDirectoryName,
            SettingsFileName,
            CreateSettingsJson("client-before"),
            KubernetesProjectedVolume.InitialVersionLastWriteTimeUtc
        );
        projectedVolume.CreateSymlinks(KubernetesProjectedVolume.InitialVersionDirectoryName, SettingsFileName);

        await using var serviceProvider = BuildOptionsProvider(Path.Join(tempDirectory.Path, SettingsFileName));
        var options = serviceProvider.GetRequiredService<IOptionsMonitor<MaskinportenSettings>>();
        Assert.Equal("client-before", options.CurrentValue.ClientId);

        projectedVolume.WriteVersion(
            KubernetesProjectedVolume.UpdatedVersionDirectoryName,
            SettingsFileName,
            CreateSettingsJson("client-after"),
            KubernetesProjectedVolume.UpdatedVersionLastWriteTimeUtc
        );
        projectedVolume.SwapDataSymlink(KubernetesProjectedVolume.UpdatedVersionDirectoryName);

        await Wait.Until(() => options.CurrentValue.ClientId == "client-after", TimeSpan.FromSeconds(30));
    }

    /// <summary>
    /// On localtest studioctl provisions the credentials the way the operator does
    /// in a cluster, and names the directory it provisions into. That is how a developer tests a real
    /// Maskinporten integration from a local run without the credentials ever entering the app's configuration.
    /// </summary>
    [Fact]
    public async Task Options_ReadTheStudioctlDirectory_OnLocaltest()
    {
        using var tempDirectory = new TempDirectory();
        await File.WriteAllTextAsync(
            Path.Join(tempDirectory.Path, SettingsFileName),
            CreateSettingsJson("developers-own-client")
        );

        await using var serviceProvider = BuildAppProvider(
            hostName: "local.altinn.cloud",
            (StudioctlAppEnvironment.AppSecretsDirectoryKey, tempDirectory.Path)
        );

        var settings = serviceProvider.GetRequiredService<IOptions<MaskinportenSettings>>().Value;
        Assert.Equal("developers-own-client", settings.ClientId);
        var source = serviceProvider.GetRequiredService<MaskinportenSettingsSource>();
        Assert.True(source.ProvisionedByStudioctl);
        Assert.Equal(Path.Join(tempDirectory.Path, SettingsFileName), source.FilePath);
    }

    /// <summary>
    /// The same key in a deployed environment moves nothing. This is the invariant: an app cannot hand itself
    /// an identity where a provisioned one is meant to be, not even by borrowing studioctl's key.
    /// </summary>
    [Fact]
    public async Task Options_IgnoreTheStudioctlDirectory_WhenNotOnLocaltest()
    {
        using var tempDirectory = new TempDirectory();
        await File.WriteAllTextAsync(
            Path.Join(tempDirectory.Path, SettingsFileName),
            CreateSettingsJson("developers-own-client")
        );

        await using var serviceProvider = BuildAppProvider(
            hostName: "at22.altinn.cloud",
            (StudioctlAppEnvironment.AppSecretsDirectoryKey, tempDirectory.Path)
        );

        var source = serviceProvider.GetRequiredService<MaskinportenSettingsSource>();
        Assert.False(source.ProvisionedByStudioctl);
        Assert.Equal(Path.GetFullPath(MaskinportenSettingsSource.DefaultFilePath), source.FilePath);
    }

    /// <summary>
    /// A MaskinportenSettings section in the app's own configuration is not a Maskinporten surface anywhere,
    /// localtest included: the file is the only input, so there is never a section name to get right.
    /// </summary>
    [Fact]
    public async Task Options_IgnoreAMaskinportenSection_OnLocaltest()
    {
        await using var serviceProvider = BuildAppProvider(
            hostName: "local.altinn.cloud",
            ("MaskinportenSettings:authority", "https://test.maskinporten.no/"),
            ("MaskinportenSettings:clientId", "developers-own-client")
        );

        Assert.Throws<OptionsValidationException>(() =>
            serviceProvider.GetRequiredService<IOptions<MaskinportenSettings>>().Value
        );
    }

    [Fact]
    public async Task Options_UseTheProvisionedLocation_WhenStudioctlNamesNoDirectory()
    {
        await using var serviceProvider = BuildAppProvider(hostName: "local.altinn.cloud");

        var source = serviceProvider.GetRequiredService<MaskinportenSettingsSource>();
        Assert.False(source.ProvisionedByStudioctl);
        Assert.Equal(Path.GetFullPath(MaskinportenSettingsSource.DefaultFilePath), source.FilePath);
    }

    /// <summary>
    /// studioctl named a directory but nothing has been stored there yet - the state a developer is in the
    /// first time their integration asks for a token. The failure says exactly what to run, and not where.
    /// </summary>
    [Fact]
    public async Task Options_NameTheStudioctlCommand_WhenTheStudioctlDirectoryIsEmpty()
    {
        using var tempDirectory = new TempDirectory();

        await using var serviceProvider = BuildAppProvider(
            hostName: "local.altinn.cloud",
            (StudioctlAppEnvironment.AppSecretsDirectoryKey, tempDirectory.Path)
        );

        var exception = Assert.Throws<OptionsValidationException>(() =>
            serviceProvider.GetRequiredService<IOptions<MaskinportenSettings>>().Value
        );
        Assert.Contains(
            "No Maskinporten client is stored for this local run",
            exception.Message,
            StringComparison.Ordinal
        );
        Assert.Contains("studioctl app maskinporten set", exception.Message, StringComparison.Ordinal);
        // Where studioctl keeps the file is not the developer's concern; naming it would invite hand edits.
        Assert.DoesNotContain(tempDirectory.Path, exception.Message, StringComparison.Ordinal);
    }

    /// <summary>
    /// The Maskinporten options as an app binds them, through the real registration, for a given platform
    /// hostname and app configuration. Nothing is provisioned at the cluster's location - which is the
    /// situation on a developer's machine.
    /// </summary>
    private static ServiceProvider BuildAppProvider(
        string hostName,
        params (string Key, string? Value)[] appConfiguration
    )
    {
        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(ConfigurationWith(appConfiguration));
        services.AddRuntimeEnvironment();
        services.Configure<GeneralSettings>(options => options.HostName = hostName);
        services.Configure<PlatformSettings>(_ => { });
        services.AddMaskinportenSettings();

        return services.BuildStrictServiceProvider();
    }

    /// <summary>
    /// The Maskinporten options exactly as an app binds them, for a settings file at
    /// <paramref name="settingsFilePath"/> and an app configuration of <paramref name="appConfiguration"/>.
    /// Registering the source first is the only way to move the file - an app has no such lever.
    /// </summary>
    private static ServiceProvider BuildOptionsProvider(
        string settingsFilePath,
        params (string Key, string? Value)[] appConfiguration
    )
    {
        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(ConfigurationWith(appConfiguration));
        services.AddSingleton(_ => new MaskinportenSettingsSource(settingsFilePath));
        services.AddMaskinportenSettings();

        return services.BuildStrictServiceProvider();
    }

    private static IConfigurationRoot ConfigurationWith(params (string Key, string? Value)[] values) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(values.Select(value => new KeyValuePair<string, string?>(value.Key, value.Value)))
            .Build();

    /// <summary>
    /// The configured client id, or <c>null</c> while the settings are still unreadable — polling for a file
    /// that has not appeared yet means reading options that do not validate.
    /// </summary>
    private static string? TryReadClientId(IOptionsMonitor<MaskinportenSettings> options)
    {
        try
        {
            return options.CurrentValue.ClientId;
        }
        catch (OptionsValidationException)
        {
            return null;
        }
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
