using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Features.Maskinporten.Extensions;
using Altinn.App.Core.Features.Maskinporten.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Tests.Features.Maskinporten;

public sealed class MaskinportenConfigurationTests
{
    private const string SettingsFileName = "maskinporten-settings.json";

    [Fact]
    public void ResolveFilePath_PrefersTheConfiguredPath()
    {
        var configuration = ConfigurationWith(
            ("MaskinportenSettingsFilepath", "/somewhere/else.json"),
            ("AppSettings:RuntimeSecretsDirectory", "/ignored")
        );

        Assert.Equal("/somewhere/else.json", MaskinportenConfiguration.ResolveFilePath(configuration));
    }

    [Fact]
    public void ResolveFilePath_FallsBackToTheRuntimeSecretsDirectory()
    {
        var configuration = ConfigurationWith(("AppSettings:RuntimeSecretsDirectory", "/custom-secrets"));

        Assert.Equal(
            Path.Join("/custom-secrets", SettingsFileName),
            MaskinportenConfiguration.ResolveFilePath(configuration)
        );
    }

    [Fact]
    public void ResolveFilePath_FallsBackToThePlatformSecretsDirectory()
    {
        Assert.Equal(
            Path.Join(AppSettings.DefaultRuntimeSecretsDirectory, SettingsFileName),
            MaskinportenConfiguration.ResolveFilePath(ConfigurationWith())
        );
    }

    [Fact]
    public void GetExistingProviderRoot_ReturnsPath_WhenDirectoryExists()
    {
        using var tempDirectory = new TempDirectory();

        Assert.Equal(tempDirectory.Path, MaskinportenConfiguration.GetExistingProviderRoot(tempDirectory.Path));
    }

    [Fact]
    public void GetExistingProviderRoot_ReturnsNearestExistingParent_WhenDirectoryDoesNotExist()
    {
        using var tempDirectory = new TempDirectory();
        string missingDirectory = Path.Join(tempDirectory.Path, "missing", "app-secrets");

        Assert.Equal(tempDirectory.Path, MaskinportenConfiguration.GetExistingProviderRoot(missingDirectory));
    }

    [Fact]
    public void Settings_AreEmpty_WhenTheFileDoesNotExist()
    {
        using var tempDirectory = new TempDirectory();

        using var configuration = new MaskinportenConfiguration(Path.Join(tempDirectory.Path, SettingsFileName));

        Assert.Empty(configuration.Settings.AsEnumerable(makePathsRelative: true));
    }

    [Fact]
    public void Settings_AreEmpty_WhenTheDirectoryDoesNotExist()
    {
        using var tempDirectory = new TempDirectory();

        using var configuration = new MaskinportenConfiguration(
            Path.Join(tempDirectory.Path, "missing", SettingsFileName)
        );

        Assert.Empty(configuration.Settings.AsEnumerable(makePathsRelative: true));
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
    public async Task Options_IgnoreAMaskinportenSettingsSectionInTheAppConfiguration()
    {
        // The whole point of the private configuration root: an app cannot supply, extend or displace the
        // credentials the platform provisions, no matter what it puts in its own configuration.
        using var tempDirectory = new TempDirectory();
        string settingsPath = Path.Join(tempDirectory.Path, SettingsFileName);
        await File.WriteAllTextAsync(settingsPath, CreateSettingsJson("provisioned-client"));

        await using var serviceProvider = BuildOptionsProvider(
            settingsPath,
            ("MaskinportenSettings:clientId", "app-supplied-client"),
            ("MaskinportenSettings:jwkBase64", "app-supplied-key")
        );

        var settings = serviceProvider.GetRequiredService<IOptions<MaskinportenSettings>>().Value;
        Assert.Equal("provisioned-client", settings.ClientId);
        Assert.Null(settings.JwkBase64);
    }

    [Fact]
    public async Task Options_FailValidation_WhenNothingIsProvisioned()
    {
        using var tempDirectory = new TempDirectory();

        await using var serviceProvider = BuildOptionsProvider(Path.Join(tempDirectory.Path, SettingsFileName));

        Assert.Throws<OptionsValidationException>(() =>
            serviceProvider.GetRequiredService<IOptions<MaskinportenSettings>>().Value
        );
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
    /// The Maskinporten options exactly as an app binds them, for a settings file at
    /// <paramref name="settingsFilePath"/> and an app configuration of <paramref name="appConfiguration"/>.
    /// </summary>
    private static ServiceProvider BuildOptionsProvider(
        string settingsFilePath,
        params (string Key, string? Value)[] appConfiguration
    )
    {
        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(
            ConfigurationWith([("MaskinportenSettingsFilepath", settingsFilePath), .. appConfiguration])
        );
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
