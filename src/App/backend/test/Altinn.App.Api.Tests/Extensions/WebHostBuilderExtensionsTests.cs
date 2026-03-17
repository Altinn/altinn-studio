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
    }

    [Fact]
    public void AddRuntimeConfigFiles_Production_SkipsFilesAlreadyInConfigurationSources()
    {
        using var tempDirectory = new TempDirectory(_outputHelper);
        File.WriteAllText(Path.Join(tempDirectory.Path, "maskinporten-settings.json"), "{}");
        File.WriteAllText(Path.Join(tempDirectory.Path, "appsettings.json"), "{}");
        File.WriteAllText(Path.Join(tempDirectory.Path, "appsettings.override.json"), "{}");

        IConfigurationBuilder configBuilder = new ConfigurationBuilder();
        var fileProvider = new PhysicalFileProvider(tempDirectory.Path);
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

    private sealed class TestHostEnvironment(string environmentName) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = environmentName;

        public string ApplicationName { get; set; } = nameof(WebHostBuilderExtensionsTests);

        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;

        public IFileProvider ContentRootFileProvider { get; set; } = new PhysicalFileProvider(AppContext.BaseDirectory);
    }

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
}
