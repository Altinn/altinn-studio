using System.Diagnostics;
using System.IO;
using System.Text.Json;
using Altinn.App.Api.Extensions;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Maskinporten.Extensions;
using Altinn.App.Core.Internal;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.ProvisionedSecrets;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Configuration.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Extensions;

public sealed class WebHostBuilderExtensionsTests
{
    private readonly ITestOutputHelper _outputHelper;

    public WebHostBuilderExtensionsTests(ITestOutputHelper outputHelper) => _outputHelper = outputHelper;

    [Fact]
    public void AddRuntimeConfigFiles_AddsNonOverrideBeforeOverride()
    {
        using var tempDirectory = new TempDirectory(_outputHelper);
        File.WriteAllText(Path.Join(tempDirectory.Path, "30-config.json"), "{}");
        File.WriteAllText(Path.Join(tempDirectory.Path, "10-settings.json"), "{}");
        File.WriteAllText(Path.Join(tempDirectory.Path, "20-OVERRIDE.json"), "{}");
        File.WriteAllText(Path.Join(tempDirectory.Path, "40-settings.override.json"), "{}");
        IConfigurationBuilder configBuilder = new ConfigurationBuilder();

        WebHostBuilderExtensions.AddRuntimeConfigFiles(configBuilder, tempDirectory.Path, []);

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
    public void AddRuntimeConfigFiles_SkipsFilesAlreadyInConfigurationSources()
    {
        using var tempDirectory = new TempDirectory(_outputHelper);
        File.WriteAllText(Path.Join(tempDirectory.Path, "platform-settings.json"), "{}");
        File.WriteAllText(Path.Join(tempDirectory.Path, "appsettings.json"), "{}");
        File.WriteAllText(Path.Join(tempDirectory.Path, "appsettings.override.json"), "{}");

        IConfigurationBuilder configBuilder = new ConfigurationBuilder();
        using var fileProvider = new PhysicalFileProvider(tempDirectory.Path);
        configBuilder.AddJsonFile(
            provider: fileProvider,
            path: "platform-settings.json",
            optional: true,
            reloadOnChange: false
        );

        WebHostBuilderExtensions.AddRuntimeConfigFiles(configBuilder, tempDirectory.Path, []);

        string[] jsonSourcePaths = configBuilder
            .Sources.OfType<JsonConfigurationSource>()
            .Select(source => source.Path ?? string.Empty)
            .ToArray();

        Assert.Equal(
            1,
            jsonSourcePaths.Count(path => string.Equals(path, "platform-settings.json", StringComparison.Ordinal))
        );
        Assert.Contains("appsettings.json", jsonSourcePaths);
        Assert.Contains("appsettings.override.json", jsonSourcePaths);
        Assert.True(
            Array.IndexOf(jsonSourcePaths, "appsettings.override.json")
                > Array.IndexOf(jsonSourcePaths, "appsettings.json")
        );
    }

    [LinuxOnlyFact]
    public async Task AddRuntimeConfigFiles_ReloadsWhenKubernetesDataSymlinkChanges()
    {
        using var tempDirectory = new TempDirectory(_outputHelper);
        const string fileName = "runtime-settings.json";
        var projectedVolume = new KubernetesProjectedVolume(tempDirectory.Path);
        projectedVolume.WriteVersion(
            KubernetesProjectedVolume.InitialVersionDirectoryName,
            fileName,
            CreateRuntimeSettingsJson("before"),
            KubernetesProjectedVolume.InitialVersionLastWriteTimeUtc
        );
        projectedVolume.CreateSymlinks(KubernetesProjectedVolume.InitialVersionDirectoryName, fileName);

        IConfigurationBuilder configBuilder = new ConfigurationBuilder();
        WebHostBuilderExtensions.AddRuntimeConfigFiles(configBuilder, tempDirectory.Path, []);

        var configuration = configBuilder.Build();
        using var configurationDisposable = configuration as IDisposable;
        Assert.Equal("before", configuration["RuntimeSettings:Value"]);

        projectedVolume.WriteVersion(
            KubernetesProjectedVolume.UpdatedVersionDirectoryName,
            fileName,
            CreateRuntimeSettingsJson("after"),
            KubernetesProjectedVolume.UpdatedVersionLastWriteTimeUtc
        );
        projectedVolume.SwapDataSymlink(KubernetesProjectedVolume.UpdatedVersionDirectoryName);

        await Wait.Until(() => configuration["RuntimeSettings:Value"] == "after", TimeSpan.FromSeconds(30));
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
        // studioctl's error is shown as text, so it must not come with color codes.
        Assert.Equal("1", startInfo.Environment["NO_COLOR"]);
    }

    [Fact]
    public void Import_StudioctlPrintsItsEnvironment_ReturnsIt()
    {
        using var tempDirectory = new TempDirectory(_outputHelper);
        string output = Path.Join(tempDirectory.Path, "env.json");
        File.WriteAllText(output, """{"PlatformSettings__ApiStorageEndpoint":"http://local.altinn.cloud:8000/"}""");

        StudioctlImport import = StudioctlLocalConfiguration.Import(
            Shell(unix: $"cat '{output}'", windows: $"type {output}"),
            _importTimeout
        );

        Assert.Null(import.Failure);
        Assert.Equal("http://local.altinn.cloud:8000/", import.Values["PlatformSettings__ApiStorageEndpoint"]);
    }

    [Fact]
    public void Import_StudioctlFails_KeepsWhatItPrinted()
    {
        StudioctlImport import = StudioctlLocalConfiguration.Import(
            Shell(
                unix: "echo 'no Altinn app found: run from an app directory' >&2; exit 1",
                windows: "echo no Altinn app found: run from an app directory 1>&2 & exit /b 1"
            ),
            _importTimeout
        );

        Assert.Empty(import.Values);
        Assert.NotNull(import.Failure);
        Assert.StartsWith("'studioctl app env' exited with code 1: ", import.Failure, StringComparison.Ordinal);
        Assert.Contains("no Altinn app found: run from an app directory", import.Failure, StringComparison.Ordinal);
    }

    [Fact]
    public void Import_StudioctlIsNotOnPath_SaysSo()
    {
        ProcessStartInfo startInfo = StudioctlLocalConfiguration.CreateStartInfo("/apps/test/App/App.csproj");
        startInfo.FileName = $"studioctl-missing-{Guid.NewGuid():N}";

        StudioctlImport import = StudioctlLocalConfiguration.Import(startInfo, _importTimeout);

        Assert.NotNull(import.Failure);
        Assert.StartsWith("studioctl could not be started", import.Failure, StringComparison.Ordinal);
        Assert.Contains("PATH", import.Failure, StringComparison.Ordinal);
    }

    [Fact]
    public void Import_StudioctlDoesNotFinish_StopsItAndSaysSo()
    {
        StudioctlImport import = StudioctlLocalConfiguration.Import(
            Shell(unix: "sleep 30", windows: "ping -n 30 127.0.0.1 > nul"),
            TimeSpan.FromMilliseconds(500)
        );

        Assert.NotNull(import.Failure);
        Assert.StartsWith("'studioctl app env' did not finish within", import.Failure, StringComparison.Ordinal);
    }

    [Fact]
    public void Import_StudioctlPrintsSomethingElse_SaysSo()
    {
        StudioctlImport import = StudioctlLocalConfiguration.Import(
            Shell(unix: "echo 'A new version is available'", windows: "echo A new version is available"),
            _importTimeout
        );

        Assert.Equal("'studioctl app env' printed something other than a JSON object.", import.Failure);
    }

    /// <summary>
    /// The <c>dotnet run</c> path when studioctl fails: the app does not start, and the failure gives
    /// studioctl's reason rather than the advice to install studioctl.
    /// </summary>
    [Fact]
    public void FailedImport_IsWhatTheStartupFailureNames()
    {
        StudioctlImport import = StudioctlLocalConfiguration.Import(
            Shell(
                unix: "echo 'legacy localtest is running' >&2; exit 1",
                windows: "echo legacy localtest is running 1>&2 & exit /b 1"
            ),
            _importTimeout
        );
        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection([new(StudioctlAppEnvironment.ImportFailureKey, import.Failure)])
            .Build();

        var exception = Assert.Throws<ApplicationConfigException>(() =>
            ProvisionedSecrets.FromConfiguration(configuration)
        );

        Assert.Contains(ProvisionedSecrets.DirectoryKey, exception.Message, StringComparison.Ordinal);
        Assert.Contains("legacy localtest is running", exception.Message, StringComparison.Ordinal);
    }

    private static readonly TimeSpan _importTimeout = TimeSpan.FromSeconds(30);

    /// <summary>
    /// Runs a script in the platform's shell, standing in for studioctl.
    /// </summary>
    private static ProcessStartInfo Shell(string unix, string windows)
    {
        bool isWindows = OperatingSystem.IsWindows();
        ProcessStartInfo startInfo = new(isWindows ? "cmd.exe" : "/bin/sh")
        {
            RedirectStandardError = true,
            RedirectStandardOutput = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };
        startInfo.ArgumentList.Add(isWindows ? "/c" : "-c");
        startInfo.ArgumentList.Add(isWindows ? windows : unix);
        return startInfo;
    }

    /// <summary>
    /// The <c>dotnet run</c> path: what <c>studioctl app env --json</c> prints, imported the way
    /// <see cref="StudioctlLocalConfiguration"/> imports it, is all the provisioned secrets channel needs —
    /// studioctl says where it put the secrets and what it called each file, exactly as the platform does for
    /// a deployed app. The keys are spelled out because they are the wire contract with studioctl.
    /// </summary>
    [Fact]
    public void ImportedStudioctlEnvironment_ReachesTheProvisionedSecretsChannel()
    {
        using var tempDirectory = new TempDirectory(_outputHelper);
        bool parsed = StudioctlLocalConfiguration.TryParseEnvironmentJson(
            $$"""
            {
              "GeneralSettings__HostName": "local.altinn.cloud",
              "STUDIOCTL_APP_RUN": "1",
              "RUNTIME_APP_SECRETS_DIR": {{JsonSerializer.Serialize(tempDirectory.Path)}},
              "RUNTIME_APP_SECRETS_MASKINPORTEN_FILENAME": "maskinporten-settings.json",
              "RUNTIME_APP_SECRETS_APPCODES_FILENAME": "app-codes.json"
            }
            """,
            out Dictionary<string, string?> values
        );
        Assert.True(parsed);
        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(StudioctlLocalConfiguration.NormalizeConfigurationKeys(values))
            .Build();

        var services = new ServiceCollection();
        services.AddSingleton(configuration);
        services.AddRuntimeEnvironment();
        // The Maskinporten startup check logs, and a container built without a host has no logging of its own.
        services.AddLogging();
        services.Configure<GeneralSettings>(configuration.GetSection("GeneralSettings"));
        services.Configure<PlatformSettings>(_ => { });
        services.AddMaskinportenSettings();
        using ServiceProvider serviceProvider = services.BuildStrictServiceProvider();

        var secrets = serviceProvider.GetRequiredService<ProvisionedSecrets>();
        Assert.Equal(Path.GetFullPath(tempDirectory.Path), Path.GetFullPath(secrets.Directory));
        Assert.Equal(
            Path.GetFullPath(Path.Join(tempDirectory.Path, "maskinporten-settings.json")),
            Path.GetFullPath(secrets.PathOf(ProvisionedSecretFiles.Maskinporten))
        );
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

    [Fact]
    public void AddRuntimeConfigFiles_NeverAddsAProvisionedSecretsFile()
    {
        // The files the libraries host are bound through the provisioned secrets channel. If the sweep of the
        // secrets mount also loaded them, their sections would be back in the app's configuration - where a
        // package binding one of those names by convention would pick them up. A hosted file is excluded by
        // the name the platform gave it, which is the only name anything here knows.
        using var tempDirectory = new TempDirectory(_outputHelper);
        File.WriteAllText(Path.Join(tempDirectory.Path, "credentials-the-platform-named.json"), "{}");
        File.WriteAllText(Path.Join(tempDirectory.Path, "Credentials-The-Platform-Named.override.json"), "{}");
        File.WriteAllText(Path.Join(tempDirectory.Path, "platform-settings.json"), "{}");
        IConfigurationBuilder configBuilder = new ConfigurationBuilder();

        // The excluded names are resolved from the variables the platform sets, the way ConfigureAppWebHost
        // resolves them: nothing here is told what a hosted file is called.
        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection([
                new(ProvisionedSecrets.DirectoryKey, tempDirectory.Path),
                new(ProvisionedSecretFiles.Maskinporten.FileNameKey, "credentials-the-platform-named.json"),
            ])
            .Build();
        List<string> hostedFileNames = [];
        foreach (ProvisionedSecretFile file in ProvisionedSecretFiles.All)
        {
            if (file.TryResolve(configuration, out ProvisionedSecretFile? resolved) && resolved.IsResolved)
            {
                hostedFileNames.Add(resolved.FileName);
            }
        }

        WebHostBuilderExtensions.AddRuntimeConfigFiles(
            configBuilder,
            configuration[ProvisionedSecrets.DirectoryKey],
            hostedFileNames
        );

        string[] jsonSourcePaths = configBuilder
            .Sources.OfType<JsonConfigurationSource>()
            .Select(source => source.Path ?? string.Empty)
            .ToArray();

        Assert.DoesNotContain("credentials-the-platform-named.json", jsonSourcePaths);
        Assert.Equal(
            new[] { "platform-settings.json", "Credentials-The-Platform-Named.override.json" },
            jsonSourcePaths
        );
    }

    /// <summary>
    /// Nothing said where the secrets are. That is a real problem, and the provisioned secrets startup check
    /// is what reports it, naming the variable — this sweep simply has nothing to sweep.
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void AddRuntimeConfigFiles_AddsNothing_WhenNoSecretsDirectoryIsNamed(string? secretsDirectory)
    {
        IConfigurationBuilder configBuilder = new ConfigurationBuilder();

        WebHostBuilderExtensions.AddRuntimeConfigFiles(configBuilder, secretsDirectory, []);

        Assert.Empty(configBuilder.Sources.OfType<JsonConfigurationSource>());
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
