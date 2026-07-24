using Altinn.App.Core.Features.Maskinporten.Extensions;
using Altinn.App.Core.Features.Maskinporten.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Configuration.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using MaskinportenWebHostBuilderExtensions = Altinn.App.Core.Features.Maskinporten.Extensions.WebHostBuilderExtensions;

namespace Altinn.App.Core.Tests.Features.Maskinporten.Extensions;

public sealed class WebHostBuilderExtensionsTests
{
    private const string ConfigurationKey = "MaskinportenSettingsFilepath";
    private const string SettingsFileName = "maskinporten-settings.json";

    [Fact]
    public void AddMaskinportenSettingsFile_RegistersOptionalPollingSource_WhenFileDoesNotExist()
    {
        using var tempDirectory = new TempDirectory();
        string settingsPath = Path.Join(tempDirectory.Path, SettingsFileName);
        var configBuilder = new ConfigurationBuilder();

        configBuilder.AddMaskinportenSettingsFile(CreateContext(settingsPath), ConfigurationKey, settingsPath);

        var source = Assert.Single(configBuilder.Sources.OfType<JsonConfigurationSource>());
        var fileProvider = Assert.IsType<PhysicalFileProvider>(source.FileProvider);
        Assert.Equal(SettingsFileName, source.Path);
        Assert.True(source.Optional);
        Assert.True(source.ReloadOnChange);
        Assert.True(fileProvider.UsePollingFileWatcher);
        Assert.True(fileProvider.UseActivePolling);
    }

    [Fact]
    public void GetExistingProviderRoot_ReturnsPath_WhenDirectoryExists()
    {
        using var tempDirectory = new TempDirectory();

        string providerRoot = MaskinportenWebHostBuilderExtensions.GetExistingProviderRoot(tempDirectory.Path);

        Assert.Equal(tempDirectory.Path, providerRoot);
    }

    [Fact]
    public void GetExistingProviderRoot_ReturnsNearestExistingParent_WhenDirectoryDoesNotExist()
    {
        using var tempDirectory = new TempDirectory();
        string missingDirectory = Path.Join(tempDirectory.Path, "missing", "app-secrets");

        string providerRoot = MaskinportenWebHostBuilderExtensions.GetExistingProviderRoot(missingDirectory);

        Assert.Equal(tempDirectory.Path, providerRoot);
    }

    [Fact]
    public void AddMaskinportenSettingsFile_RegistersOptionalPollingSource_WhenDirectoryDoesNotExist()
    {
        using var tempDirectory = new TempDirectory();
        string settingsPath = Path.Join(tempDirectory.Path, "missing", SettingsFileName);
        var configBuilder = new ConfigurationBuilder();

        configBuilder.AddMaskinportenSettingsFile(CreateContext(settingsPath), ConfigurationKey, settingsPath);

        var source = Assert.Single(configBuilder.Sources.OfType<JsonConfigurationSource>());
        var fileProvider = Assert.IsType<PhysicalFileProvider>(source.FileProvider);
        Assert.Equal(Path.Join("missing", SettingsFileName), source.Path);
        Assert.True(source.Optional);
        Assert.True(source.ReloadOnChange);
        Assert.True(fileProvider.UsePollingFileWatcher);
        Assert.True(fileProvider.UseActivePolling);
    }

    [LinuxOnlyFact]
    public async Task AddMaskinportenSettingsFile_LoadsFile_WhenDirectoryAppearsLater()
    {
        using var tempDirectory = new TempDirectory();
        string settingsDirectory = Path.Join(tempDirectory.Path, "missing");
        string settingsPath = Path.Join(settingsDirectory, SettingsFileName);
        var configBuilder = new ConfigurationBuilder();
        configBuilder.AddMaskinportenSettingsFile(CreateContext(settingsPath), ConfigurationKey, settingsPath);

        var configuration = configBuilder.Build();
        using var configurationDisposable = configuration as IDisposable;

        Directory.CreateDirectory(settingsDirectory);
        await File.WriteAllTextAsync(settingsPath, CreateSettingsJson("client-after"));

        await Wait.Until(
            () => configuration["MaskinportenSettings:clientId"] == "client-after",
            TimeSpan.FromSeconds(15)
        );
    }

    [LinuxOnlyFact]
    public async Task AddMaskinportenSettingsFile_ReloadsOptions_WhenKubernetesDataSymlinkChanges()
    {
        using var tempDirectory = new TempDirectory();
        var projectedVolume = new KubernetesProjectedVolume(tempDirectory.Path);
        projectedVolume.WriteVersion(
            KubernetesProjectedVolume.InitialVersionDirectoryName,
            SettingsFileName,
            CreateSettingsJson("client-before")
        );
        projectedVolume.CreateSymlinks(KubernetesProjectedVolume.InitialVersionDirectoryName, SettingsFileName);

        string settingsPath = Path.Join(tempDirectory.Path, SettingsFileName);
        var configBuilder = new ConfigurationBuilder();
        configBuilder.AddMaskinportenSettingsFile(CreateContext(settingsPath), ConfigurationKey, settingsPath);

        var configuration = configBuilder.Build();
        using var configurationDisposable = configuration as IDisposable;
        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(configuration);
        services.ConfigureMaskinportenClient("MaskinportenSettings");

        await using var serviceProvider = services.BuildStrictServiceProvider();
        var options = serviceProvider.GetRequiredService<IOptionsMonitor<MaskinportenSettings>>();
        Assert.Equal("client-before", options.CurrentValue.ClientId);

        projectedVolume.WriteVersion(
            KubernetesProjectedVolume.UpdatedVersionDirectoryName,
            SettingsFileName,
            CreateSettingsJson("client-after")
        );
        projectedVolume.SwapDataSymlink(KubernetesProjectedVolume.UpdatedVersionDirectoryName);

        await Wait.Until(() => options.CurrentValue.ClientId == "client-after", TimeSpan.FromSeconds(15));
    }

    private static WebHostBuilderContext CreateContext(string settingsPath) =>
        new()
        {
            Configuration = new ConfigurationBuilder()
                .AddInMemoryCollection([new KeyValuePair<string, string?>(ConfigurationKey, settingsPath)])
                .Build(),
        };

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
