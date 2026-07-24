using System.IO;
using Altinn.App.Api.Extensions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Configuration.Json;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Extensions;

public sealed class WebHostBuilderExtensionsTests
{
    private readonly ITestOutputHelper _outputHelper;

    public WebHostBuilderExtensionsTests(ITestOutputHelper outputHelper) => _outputHelper = outputHelper;

    [Fact]
    public void AddRuntimeConfigFiles_Development_DoesNotAddRuntimeFiles()
    {
        using var tempDirectory = new TempDirectory(_outputHelper);
        File.WriteAllText(Path.Join(tempDirectory.Path, "appsettings.json"), "{}");
        IConfigurationBuilder configBuilder = new ConfigurationBuilder();

        WebHostBuilderExtensions.AddRuntimeConfigFiles(
            configBuilder,
            new TestHostEnvironment(Environments.Development),
            tempDirectory.Path
        );

        Assert.Empty(configBuilder.Sources.OfType<JsonConfigurationSource>());
    }

    [Fact]
    public void AddRuntimeConfigFiles_Production_AddsNonOverrideBeforeOverride()
    {
        using var tempDirectory = new TempDirectory(_outputHelper);
        File.WriteAllText(Path.Join(tempDirectory.Path, "30-config.json"), "{}");
        File.WriteAllText(Path.Join(tempDirectory.Path, "10-settings.json"), "{}");
        File.WriteAllText(Path.Join(tempDirectory.Path, "20-OVERRIDE.json"), "{}");
        File.WriteAllText(Path.Join(tempDirectory.Path, "40-settings.override.json"), "{}");
        IConfigurationBuilder configBuilder = new ConfigurationBuilder();

        WebHostBuilderExtensions.AddRuntimeConfigFiles(
            configBuilder,
            new TestHostEnvironment(Environments.Production),
            tempDirectory.Path
        );

        string[] jsonSourcePaths = configBuilder
            .Sources.OfType<JsonConfigurationSource>()
            .Select(source => source.Path ?? string.Empty)
            .ToArray();

        Assert.Equal(
            new[] { "10-settings.json", "30-config.json", "20-OVERRIDE.json", "40-settings.override.json" },
            jsonSourcePaths
        );
        Assert.All(configBuilder.Sources.OfType<JsonConfigurationSource>(), AssertUsesPollingFileProvider);
    }

    [Fact]
    public void AddRuntimeConfigFiles_Production_SkipsFilesAlreadyInConfigurationSources()
    {
        using var tempDirectory = new TempDirectory(_outputHelper);
        File.WriteAllText(Path.Join(tempDirectory.Path, "maskinporten-settings.json"), "{}");
        File.WriteAllText(Path.Join(tempDirectory.Path, "appsettings.json"), "{}");
        File.WriteAllText(Path.Join(tempDirectory.Path, "appsettings.override.json"), "{}");

        IConfigurationBuilder configBuilder = new ConfigurationBuilder();
        using var fileProvider = new PhysicalFileProvider(tempDirectory.Path);
        configBuilder.AddJsonFile(
            provider: fileProvider,
            path: "maskinporten-settings.json",
            optional: true,
            reloadOnChange: false
        );

        WebHostBuilderExtensions.AddRuntimeConfigFiles(
            configBuilder,
            new TestHostEnvironment(Environments.Production),
            tempDirectory.Path
        );

        string[] jsonSourcePaths = configBuilder
            .Sources.OfType<JsonConfigurationSource>()
            .Select(source => source.Path ?? string.Empty)
            .ToArray();

        Assert.Equal(
            1,
            jsonSourcePaths.Count(path => string.Equals(path, "maskinporten-settings.json", StringComparison.Ordinal))
        );
        Assert.Contains("appsettings.json", jsonSourcePaths);
        Assert.Contains("appsettings.override.json", jsonSourcePaths);
        Assert.True(
            Array.IndexOf(jsonSourcePaths, "appsettings.override.json")
                > Array.IndexOf(jsonSourcePaths, "appsettings.json")
        );
    }

    [LinuxOnlyFact]
    public async Task AddRuntimeConfigFiles_Production_ReloadsWhenKubernetesDataSymlinkChanges()
    {
        using var tempDirectory = new TempDirectory(_outputHelper);
        const string fileName = "runtime-settings.json";
        var projectedVolume = new KubernetesProjectedVolume(tempDirectory.Path);
        projectedVolume.WriteVersion(
            KubernetesProjectedVolume.InitialVersionDirectoryName,
            fileName,
            CreateRuntimeSettingsJson("before")
        );
        projectedVolume.CreateSymlinks(KubernetesProjectedVolume.InitialVersionDirectoryName, fileName);

        IConfigurationBuilder configBuilder = new ConfigurationBuilder();
        WebHostBuilderExtensions.AddRuntimeConfigFiles(
            configBuilder,
            new TestHostEnvironment(Environments.Production),
            tempDirectory.Path
        );

        var configuration = configBuilder.Build();
        using var configurationDisposable = configuration as IDisposable;
        Assert.Equal("before", configuration["RuntimeSettings:Value"]);

        projectedVolume.WriteVersion(
            KubernetesProjectedVolume.UpdatedVersionDirectoryName,
            fileName,
            CreateRuntimeSettingsJson("after")
        );
        projectedVolume.SwapDataSymlink(KubernetesProjectedVolume.UpdatedVersionDirectoryName);

        await Wait.Until(() => configuration["RuntimeSettings:Value"] == "after", TimeSpan.FromSeconds(15));
    }

    [Fact]
    public void TryParseEnvironmentJson_ParsesFlatStudioctlEnvironment()
    {
        bool parsed = StudioctlLocalConfiguration.TryParseEnvironmentJson(
            """
            {
              "ASPNETCORE_ENVIRONMENT": "Development",
              "PlatformSettings__ApiStorageEndpoint": "http://local.altinn.cloud:8000/storage/api/v1/",
              "STUDIOCTL_APP_RUN": "1",
              "Ignored": 123
            }
            """,
            out Dictionary<string, string?> values
        );

        Assert.True(parsed);
        Assert.Equal("Development", values["ASPNETCORE_ENVIRONMENT"]);
        Assert.Equal("http://local.altinn.cloud:8000/storage/api/v1/", values["PlatformSettings__ApiStorageEndpoint"]);
        Assert.Equal("1", values["STUDIOCTL_APP_RUN"]);
        Assert.DoesNotContain("Ignored", values.Keys);
    }

    [Fact]
    public void TryParseEnvironmentJson_InvalidJson_ReturnsFalse()
    {
        bool parsed = StudioctlLocalConfiguration.TryParseEnvironmentJson("{", out Dictionary<string, string?> values);

        Assert.False(parsed);
        Assert.Empty(values);
    }

    [Fact]
    public void NormalizeConfigurationKeys_MapsEnvironmentVariableSeparatorsToConfigurationSeparators()
    {
        Dictionary<string, string?> values = new()
        {
            ["PlatformSettings__ApiStorageEndpoint"] = "http://local.altinn.cloud:8000/storage/api/v1/",
            ["OTEL_EXPORTER_OTLP_ENDPOINT"] = "http://otel.local.altinn.cloud:4317",
        };

        Dictionary<string, string?> normalized = StudioctlLocalConfiguration.NormalizeConfigurationKeys(values);

        Assert.Equal(
            "http://local.altinn.cloud:8000/storage/api/v1/",
            normalized["PlatformSettings:ApiStorageEndpoint"]
        );
        Assert.Equal("http://otel.local.altinn.cloud:4317", normalized["OTEL_EXPORTER_OTLP_ENDPOINT"]);
    }

    [Fact]
    public void CreateStartInfo_UsesStudioctlAppEnvWithDefaultRandomHostPort()
    {
        var startInfo = StudioctlLocalConfiguration.CreateStartInfo("/apps/test/App/App.csproj");

        Assert.Equal("studioctl", startInfo.FileName);
        Assert.Equal(
            new[] { "app", "env", "--json", "--project", "/apps/test/App/App.csproj" },
            startInfo.ArgumentList
        );
        Assert.DoesNotContain("--random-host-port=false", startInfo.ArgumentList);
    }

    [Fact]
    public void ShouldAdd_StudioctlAppRunSet_ReturnsFalse()
    {
        using var tempDirectory = new TempDirectory(_outputHelper);
        using var environmentVariable = new EnvironmentVariableScope("STUDIOCTL_APP_RUN", "1");

        bool shouldAdd = StudioctlLocalConfiguration.ShouldAdd(
            new TestHostEnvironment(Environments.Development) { ContentRootPath = tempDirectory.Path }
        );

        Assert.False(shouldAdd);
    }

    [Fact]
    public void ShouldAdd_NonDevelopment_ReturnsFalse()
    {
        using var tempDirectory = new TempDirectory(_outputHelper);
        using var environmentVariable = new EnvironmentVariableScope("STUDIOCTL_APP_RUN", null);

        bool shouldAdd = StudioctlLocalConfiguration.ShouldAdd(
            new TestHostEnvironment(Environments.Production) { ContentRootPath = tempDirectory.Path }
        );

        Assert.False(shouldAdd);
    }

    private sealed class TestHostEnvironment(string environmentName) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = environmentName;

        public string ApplicationName { get; set; } = nameof(WebHostBuilderExtensionsTests);

        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;

        public IFileProvider ContentRootFileProvider { get; set; } = new PhysicalFileProvider(AppContext.BaseDirectory);
    }

    private static void AssertUsesPollingFileProvider(JsonConfigurationSource source)
    {
        var fileProvider = Assert.IsType<PhysicalFileProvider>(source.FileProvider);
        Assert.True(source.Optional);
        Assert.True(source.ReloadOnChange);
        Assert.True(fileProvider.UsePollingFileWatcher);
        Assert.True(fileProvider.UseActivePolling);
    }

    private static string CreateRuntimeSettingsJson(string value) =>
        $$"""
            {
              "RuntimeSettings": {
                "Value": "{{value}}"
              }
            }
            """;

    private readonly struct TempDirectory : IDisposable
    {
        private readonly ITestOutputHelper _outputHelper;

        public TempDirectory(ITestOutputHelper outputHelper)
        {
            _outputHelper = outputHelper;
            Path = Directory.CreateTempSubdirectory().FullName;
        }

        public string Path { get; }

        public void Dispose()
        {
            if (!Directory.Exists(Path))
                return;

            try
            {
                Directory.Delete(Path, recursive: true);
            }
            catch (Exception ex)
            {
                _outputHelper.WriteLine(
                    $"WARNING: Failed to clean up temp directory '{Path}': {ex.GetType().Name}: {ex.Message}"
                );
            }
        }
    }

    private sealed class EnvironmentVariableScope : IDisposable
    {
        private readonly string _name;
        private readonly string? _originalValue;

        public EnvironmentVariableScope(string name, string? value)
        {
            _name = name;
            _originalValue = Environment.GetEnvironmentVariable(name);
            Environment.SetEnvironmentVariable(name, value);
        }

        public void Dispose() => Environment.SetEnvironmentVariable(_name, _originalValue);
    }
}
