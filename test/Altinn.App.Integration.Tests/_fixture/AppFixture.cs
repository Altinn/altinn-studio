using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging;
using TestApp.Shared;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests;

public sealed partial class AppFixture : IAsyncDisposable
{
    private const ushort StudioctlLocaltestHostPort = 8000;
    private const ushort PdfServiceHostPort = 5300;
    private static readonly string _projectDirectory = ModuleInitializer.GetProjectDirectory();
    private static readonly string _generatedAppsDirectory = Path.Join(_projectDirectory, "_testapps", "generated");
    private static readonly string _nugetPackagesDirectory = Path.Join(_generatedAppsDirectory, ".nuget", "packages");

    private static long _fixtureInstance = -1;
    private static readonly SemaphoreSlim _packLibrariesLock = new(1, 1);
    private static bool _librariesPacked;

    private static long NextFixtureInstance() => Interlocked.Increment(ref _fixtureInstance);

    private static readonly JsonSerializerOptions _jsonSerializerOptions = new(JsonSerializerDefaults.Web);
    private static readonly JsonSerializerOptions _jsonSerializerOptionsIndented = new() { WriteIndented = true };

    private readonly record struct AppIdentity(string Org, string App)
    {
        public static AppIdentity Create(string appId)
        {
            var parts = appId.Split('/', 2);
            if (parts.Length != 2 || string.IsNullOrWhiteSpace(parts[0]) || string.IsNullOrWhiteSpace(parts[1]))
                throw new InvalidOperationException($"Invalid application id '{appId}'");

            return new AppIdentity(parts[0], parts[1]);
        }
    }

    private readonly ILogger _logger;
    private long _currentFixtureInstance;
    private readonly string _app;
    private readonly string _scenario;
    private readonly string _appId;
    private readonly string _originalAppId;
    private readonly string _org;
    private readonly string _effectiveApp;
    private readonly string _generatedAppDirectory;
    private readonly string _fixtureConfigurationPath;
    private int _appLogLineOffset;

    public string App => _app;
    internal string EffectiveApp => _effectiveApp;
    private readonly bool _isClassFixture;
    private readonly StudioctlEnvironmentLease _studioctlEnvironmentLease;
    private StudioctlAppProcess _appProcess;

    internal ScopedVerifier ScopedVerifier { get; private set; }

    private HttpClient? _appClient;
    private HttpClient? _localtestClient;
    private HttpClient? _directAppClient;

    private string AppPath => $"/{_org}/{_effectiveApp}";

    private string OriginalAppPath => $"/{_org}/{_app}";

    public bool TestErrored { get; set; }

    public ushort? PdfHostPort => PdfServiceHostPort;

    private AppFixture(
        ILogger logger,
        long currentFixtureInstance,
        string app,
        string scenario,
        string appId,
        string originalAppId,
        string org,
        string effectiveApp,
        string generatedAppDirectory,
        string fixtureConfigurationPath,
        bool isClassFixture,
        StudioctlEnvironmentLease studioctlEnvironmentLease,
        StudioctlAppProcess appProcess
    )
    {
        _logger = logger;
        _currentFixtureInstance = currentFixtureInstance;
        _app = app;
        _scenario = scenario;
        _appId = appId;
        _originalAppId = originalAppId;
        _org = org;
        _effectiveApp = effectiveApp;
        _generatedAppDirectory = generatedAppDirectory;
        _fixtureConfigurationPath = fixtureConfigurationPath;
        _isClassFixture = isClassFixture;
        _studioctlEnvironmentLease = studioctlEnvironmentLease;
        _appProcess = appProcess;
        ScopedVerifier = new ScopedVerifier(this);
    }

    public static async Task<AppFixture> Create(
        ITestOutputHelper output,
        string app = TestApps.Basic,
        string scenario = "default",
        bool isClassFixture = false
    )
    {
        var timer = Stopwatch.StartNew();
        using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(15));
        var cancellationToken = cts.Token;
        var fixtureInstance = NextFixtureInstance();

        // When running as a class fixture we can just log to stdout immediately,
        // but when running as a test-local fixture we need to use the ITestOutputHelper
        // to let xUnit capture and scope the output to the test itself.
        ILogger logger = isClassFixture
            ? new FixtureLogger(fixtureInstance, app, scenario)
            : new TestOutputLogger(output, fixtureInstance, app, scenario);

        logger.LogInformation("Creating fixture..");

        StudioctlEnvironmentLease? studioctlEnvironmentLease = null;
        StudioctlAppProcess? appProcess = null;
        string? generatedAppDirectory = null;
        try
        {
            await EnsureLibrariesPacked(logger, cancellationToken);
            var originalAppId = GetAppId(app);
            var appIdentity = AppIdentity.Create(originalAppId);
            var effectiveApp = $"{appIdentity.App}-f{fixtureInstance:0000}";
            var appId = $"{appIdentity.Org}/{effectiveApp}";
            generatedAppDirectory = GetGeneratedAppDirectory(app, fixtureInstance);
            studioctlEnvironmentLease = await StudioctlEnvironmentLease.Acquire(logger, cancellationToken);
            generatedAppDirectory = await GenerateAppDirectory(
                app,
                scenario,
                appId,
                generatedAppDirectory,
                logger,
                cancellationToken
            );
            var fixtureConfigurationPath = Path.Join(generatedAppDirectory, ".fixture", "configuration.json");
            await WriteFixtureConfiguration(
                fixtureConfigurationPath,
                app,
                scenario,
                fixtureInstance,
                cancellationToken
            );
            appProcess = await StudioctlAppProcess.Start(
                generatedAppDirectory,
                fixtureConfigurationPath,
                _nugetPackagesDirectory,
                logger,
                cancellationToken
            );
            // studioctl run performs readiness checks. This only catches an immediate post-start crash.
            await EnsureAppStillRunning(appProcess, cancellationToken);

            logger.LogInformation("Fixture created in {ElapsedSeconds}s", timer.Elapsed.TotalSeconds.ToString("0.00"));
            return new AppFixture(
                logger,
                fixtureInstance,
                app,
                scenario,
                appId,
                originalAppId,
                appIdentity.Org,
                effectiveApp,
                generatedAppDirectory,
                fixtureConfigurationPath,
                isClassFixture,
                studioctlEnvironmentLease,
                appProcess
            );
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create fixture");
            if (appProcess is not null)
                await appProcess.DisposeAsync();
            if (studioctlEnvironmentLease is not null)
                await studioctlEnvironmentLease.DisposeAsync();
            await DeleteDirectoryBestEffort(logger, generatedAppDirectory);
            throw;
        }
    }

    private static async Task EnsureAppStillRunning(StudioctlAppProcess appProcess, CancellationToken cancellationToken)
    {
        if (!appProcess.IsRunning())
        {
            var appLogs = await GetAppLogs(appProcess, cancellationToken);
            throw new InvalidOperationException($"App process exited after studioctl reported it ready.\n{appLogs}");
        }
    }

    private static async Task<string> GetAppLogs(StudioctlAppProcess appProcess, CancellationToken cancellationToken)
    {
        var logLines = await appProcess.GetLogLines(startLine: 0, cancellationToken);
        return string.Join('\n', logLines);
    }

    public HttpClient GetAppClient()
    {
        if (_appClient == null)
        {
            _appClient = new HttpClient
            {
                BaseAddress = new Uri($"http://local.altinn.cloud:{StudioctlLocaltestHostPort}"),
            };
            _appClient.DefaultRequestHeaders.Add("User-Agent", "Altinn.App.Integration.Tests");
        }

        return _appClient;
    }

    public HttpClient GetLocaltestClient()
    {
        if (_localtestClient == null)
        {
            _localtestClient = new HttpClient
            {
                BaseAddress = new Uri($"http://localhost:{StudioctlLocaltestHostPort}"),
            };
            _localtestClient.DefaultRequestHeaders.Add("User-Agent", "Altinn.App.Integration.Tests");
        }

        return _localtestClient;
    }

    public HttpClient GetDirectAppClient()
    {
        if (_directAppClient == null)
        {
            _directAppClient = new HttpClient { BaseAddress = _appProcess.BaseUri };
            _directAppClient.DefaultRequestHeaders.Add("User-Agent", "Altinn.App.Integration.Tests");
        }

        return _directAppClient;
    }

    public async Task<string> GetSnapshotAppLogs(CancellationToken cancellationToken = default)
    {
        // Gets logs from the app process
        // - Log messages from `SnapshotLogger` in the app
        // - Error logs (`fail:` prefix in the default M.E.L log format)

        var expectedPrefix = $"[{_currentFixtureInstance:00}/{_app}/{_scenario}";
        var allLines = await _appProcess.GetLogLines(_appLogLineOffset, cancellationToken);

        var data = new List<string>(allLines.Count);
        static bool IsStartOfLogMessage(
            string line,
            string prefix,
            out ReadOnlySpan<char> start,
            out bool isSnapshotMessage,
            out bool isError
        )
        {
            start = line;
            isSnapshotMessage = start.StartsWith(prefix);
            isError = start.StartsWith("fail:") || start.StartsWith("crit:");
            return isSnapshotMessage
                || isError
                || start.StartsWith("info:")
                || start.StartsWith("warn:")
                || start.StartsWith("dbug:")
                || start.StartsWith("trce:");
        }

        static void AddLines(IReadOnlyList<string> source, List<string> target, string prefix)
        {
            for (int i = 0; i < source.Count; i++)
            {
                var line = source[i];
                if (
                    !IsStartOfLogMessage(line, prefix, out var start, out var isSnapshotMessage, out var isErrorMessage)
                )
                    continue;

                if (isSnapshotMessage)
                {
                    // Remove the fixture index as tests run with parallelism - use efficient slicing
                    target.Add($"[{start[4..]}");
                }
                else if (isErrorMessage)
                {
                    var fullMessage = new StringBuilder();
                    fullMessage.Append(start);
                    var j = i + 1;
                    for (; j < source.Count; j++)
                    {
                        if (IsStartOfLogMessage(source[j], prefix, out start, out _, out _))
                            break;
                        if (start.IsEmpty)
                            continue;

                        fullMessage.Append('\n');
                        fullMessage.Append(start);
                    }
                    target.Add(fullMessage.ToString());
                    i = j - 1; // skip lines we just consumed
                }
            }
        }
        AddLines(allLines, data, expectedPrefix);

        var result = string.Join('\n', data);
        return result;
    }

    public async Task<string> GetAppLogs(CancellationToken cancellationToken = default)
    {
        var allLines = await _appProcess.GetLogLines(_appLogLineOffset, cancellationToken);
        var result = string.Join('\n', allLines);
        return result;
    }

    public Task<string> GetLocaltestLogs(CancellationToken cancellationToken = default) =>
        _studioctlEnvironmentLease.GetLogs(cancellationToken);

    private string ResolveAppEndpoint(string endpoint)
    {
        if (endpoint.StartsWith(OriginalAppPath, StringComparison.Ordinal))
            return AppPath + endpoint[OriginalAppPath.Length..];

        return endpoint;
    }

    public async Task ResetBetweenTestsAsync(
        ITestOutputHelper? output = null,
        CancellationToken cancellationToken = default
    )
    {
        Assert.True(_isClassFixture);

        _currentFixtureInstance = NextFixtureInstance();
        _appLogLineOffset = await _appProcess.GetLogLineCount(cancellationToken);

        // Update logger with new test output helper and fixture instance
        if (output is not null && _logger is TestOutputLogger logger)
            logger.UpdateOutput(output, _currentFixtureInstance);

        await WriteFixtureConfiguration(
            _fixtureConfigurationPath,
            _app,
            _scenario,
            _currentFixtureInstance,
            cancellationToken
        );

        if (_localtestClient is not null)
        {
            _localtestClient.Dispose();
            _localtestClient = null;
        }
        if (_appClient is not null)
        {
            _appClient.Dispose();
            _appClient = null;
        }

        await ReloadFixtureConfiguration(cancellationToken);

        TestErrored = false;

        ScopedVerifier = new ScopedVerifier(this);
    }

    private async Task ReloadFixtureConfiguration(CancellationToken cancellationToken)
    {
        if (!_appProcess.IsRunning())
        {
            var appLogs = await GetAppLogs(_appProcess, cancellationToken);
            throw new InvalidOperationException($"App process exited before fixture reset.\n{appLogs}");
        }

        using var response = await GetDirectAppClient()
            .PostAsync("/test/fixture-configuration/reload", null, cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    private static async Task<string> GenerateAppDirectory(
        string name,
        string scenario,
        string appId,
        string generatedDirectory,
        ILogger logger,
        CancellationToken cancellationToken
    )
    {
        var sourceDirectory = Path.GetFullPath(Path.Join(GetAppDir(name), ".."));
        await DeleteDirectoryBestEffort(logger, generatedDirectory);
        Directory.CreateDirectory(generatedDirectory);

        CopyDirectory(
            sourceDirectory,
            generatedDirectory,
            static relativePath =>
                ContainsPathSegment(relativePath, "_packages")
                || ContainsPathSegment(relativePath, "_shared")
                || ContainsPathSegment(relativePath, "bin")
                || ContainsPathSegment(relativePath, "obj")
        );

        await SyncPackages(generatedDirectory, cancellationToken);
        await SyncShared(generatedDirectory, cancellationToken);
        CopyScenarioOverrides(name, scenario, generatedDirectory);

        foreach (
            var metadataPath in Directory.GetFiles(
                generatedDirectory,
                "applicationmetadata.json",
                SearchOption.AllDirectories
            )
        )
        {
            PatchApplicationId(metadataPath, appId);
        }

        return generatedDirectory;
    }

    private static string GetGeneratedAppDirectory(string name, long fixtureInstance) =>
        Path.Join(_generatedAppsDirectory, $"{name}-f{fixtureInstance:0000}");

    private static async Task WriteFixtureConfiguration(
        string path,
        string name,
        string scenario,
        long fixtureInstance,
        CancellationToken cancellationToken
    )
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var fixtureConfig = new FixtureConfiguration(name, scenario, fixtureInstance);

        var configJson = JsonSerializer.Serialize(fixtureConfig, _jsonSerializerOptionsIndented);
        await File.WriteAllTextAsync(path, configJson, cancellationToken);
    }

    private static void CopyScenarioOverrides(string name, string scenario, string generatedDirectory)
    {
        if (scenario == "default")
            return;

        var scenarioDirectory = GetScenarioDir(name, scenario);
        var targetDirectory = Path.Join(generatedDirectory, "App", "scenario-overrides");
        CopyDirectory(scenarioDirectory, targetDirectory, static _ => false);
    }

    private static void PatchApplicationId(string metadataPath, string appId)
    {
        var metadata =
            JsonNode.Parse(File.ReadAllText(metadataPath))?.AsObject()
            ?? throw new InvalidOperationException($"Invalid application metadata JSON in {metadataPath}");
        metadata["id"] = appId;
        File.WriteAllText(metadataPath, metadata.ToJsonString(_jsonSerializerOptionsIndented));
    }

    private static void CopyDirectory(string sourceDirectory, string targetDirectory, Func<string, bool> skip)
    {
        Directory.CreateDirectory(targetDirectory);
        foreach (var directory in Directory.GetDirectories(sourceDirectory, "*", SearchOption.AllDirectories))
        {
            var relativePath = Path.GetRelativePath(sourceDirectory, directory);
            if (skip(relativePath))
                continue;

            Directory.CreateDirectory(Path.Join(targetDirectory, relativePath));
        }

        foreach (var file in Directory.GetFiles(sourceDirectory, "*", SearchOption.AllDirectories))
        {
            var relativePath = Path.GetRelativePath(sourceDirectory, file);
            if (skip(relativePath))
                continue;

            var targetPath = Path.Join(targetDirectory, relativePath);
            Directory.CreateDirectory(Path.GetDirectoryName(targetPath)!);
            File.Copy(file, targetPath, overwrite: true);
        }
    }

    private static bool ContainsPathSegment(string path, string segment)
    {
        foreach (var part in path.Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar))
            if (string.Equals(part, segment, StringComparison.OrdinalIgnoreCase))
                return true;
        return false;
    }

    private static async Task DeleteDirectoryBestEffort(ILogger logger, string? path)
    {
        if (string.IsNullOrWhiteSpace(path) || !Directory.Exists(path))
            return;

        Exception? lastException = null;
        for (int attempt = 0; attempt < 5; attempt++)
        {
            try
            {
                Directory.Delete(path, recursive: true);
                return;
            }
            catch (IOException ex)
            {
                lastException = ex;
            }
            catch (UnauthorizedAccessException ex)
            {
                lastException = ex;
            }

            await Task.Delay(TimeSpan.FromMilliseconds(100));
        }

        logger.LogWarning(lastException, "Failed to delete generated app directory {Path}", path);
    }

    public async ValueTask DisposeAsync()
    {
        if (_localtestClient is not null)
        {
            _localtestClient.Dispose();
            _localtestClient = null;
        }
        if (_appClient is not null)
        {
            _appClient.Dispose();
            _appClient = null;
        }
        if (_directAppClient is not null)
        {
            _directAppClient.Dispose();
            _directAppClient = null;
        }

        if (TestErrored && !_isClassFixture)
        {
            // TestErrored is set to true for test/snapshot failures.
            // When this happens we might not reach the stage of the test where we snapshot app logs.
            _logger.LogError("Test errored, logging app output");
            await LogAppLogs();
        }

        await _appProcess.DisposeAsync();
        await DeleteDirectoryBestEffort(_logger, _generatedAppDirectory);
        await _studioctlEnvironmentLease.DisposeAsync();
    }

    internal Task LogAppLogs(CancellationToken cancellationToken = default) =>
        LogAppLogs(_logger, _appProcess, cancellationToken);

    private static async Task LogAppLogs(
        ILogger logger,
        StudioctlAppProcess appProcess,
        CancellationToken cancellationToken
    )
    {
        logger.LogError(
            "Localtest is managed by studioctl. Run 'studioctl env logs --follow=false' for localtest logs."
        );
        {
            var logLines = await appProcess.GetLogLines(startLine: 0, cancellationToken);
            var logs = string.Join("\n", logLines);
            logger.LogError("App logs:\n{Logs}", logs);
        }
    }

    private static string GetAppDir(string name)
    {
        var appDirectory = Path.Join(_projectDirectory, $"_testapps/{name}/App");
        var info = new DirectoryInfo(appDirectory);
        if (!info.Exists)
        {
            throw new DirectoryNotFoundException(
                $"The directory {appDirectory} does not exist. Please check the path."
            );
        }
        return info.FullName;
    }

    private static string GetAppId(string name)
    {
        var metadataPath = Path.Join(GetAppDir(name), "config", "applicationmetadata.json");
        using var metadata = JsonDocument.Parse(File.ReadAllText(metadataPath));
        if (!metadata.RootElement.TryGetProperty("id", out var idElement))
            throw new InvalidOperationException($"Missing application id in {metadataPath}");

        var appId = idElement.GetString();
        if (string.IsNullOrWhiteSpace(appId))
            throw new InvalidOperationException($"Empty application id in {metadataPath}");

        return appId;
    }

    private static string GetScenarioDir(string name, string scenario)
    {
        var scenarioDirectory = Path.Join(_projectDirectory, $"_testapps/{name}/_scenarios/{scenario}");
        var info = new DirectoryInfo(scenarioDirectory);

        if (!info.Exists)
        {
            throw new DirectoryNotFoundException(
                $"The scenario directory {scenarioDirectory} does not exist. Please check the scenario name '{scenario}'."
            );
        }
        return info.FullName;
    }

    private static async Task EnsureLibrariesPacked(ILogger logger, CancellationToken cancellationToken)
    {
        if (_librariesPacked)
            return;

        await _packLibrariesLock.WaitAsync(cancellationToken);
        try
        {
            if (_librariesPacked)
                return;

            logger.LogInformation("Packing libraries");

            var output = Path.Join(ModuleInitializer.GetProjectDirectory(), "_testapps", "_packages");
            await NuGetPackaging.PackLibraries(output, logger, cancellationToken);
            await DeleteDirectoryBestEffort(logger, Path.GetDirectoryName(_nugetPackagesDirectory));
            Directory.CreateDirectory(_nugetPackagesDirectory);
            _librariesPacked = true;

            logger.LogInformation("Packed libraries");
        }
        finally
        {
            _packLibrariesLock.Release();
        }
    }

    private static async Task SyncPackages(string appDirectory, CancellationToken cancellationToken)
    {
        var packagesDirectory = Path.Join(_projectDirectory, "_testapps", "_packages");
        var appPackagesDirectory = Path.Join(appDirectory, "_packages");
        if (Directory.Exists(appPackagesDirectory))
            Directory.Delete(appPackagesDirectory, true);
        Directory.CreateDirectory(appPackagesDirectory);
        foreach (var file in Directory.GetFiles(packagesDirectory))
        {
            var fileName = Path.GetFileName(file);
            var destFile = Path.Join(appPackagesDirectory, fileName);
            await using var source = File.OpenRead(file);
            await using var destination = File.Create(destFile);
            await source.CopyToAsync(destination, cancellationToken);
        }
    }

    private static async Task SyncShared(string appDirectory, CancellationToken cancellationToken)
    {
        var sharedDirectory = Path.Join(_projectDirectory, "_testapps", "_shared");
        var appSharedDirectory = Path.Join(appDirectory, "_shared");
        if (Directory.Exists(appSharedDirectory))
            Directory.Delete(appSharedDirectory, true);
        Directory.CreateDirectory(appSharedDirectory);
        foreach (var file in Directory.GetFiles(sharedDirectory))
        {
            var fileName = Path.GetFileName(file);
            var destFile = Path.Join(appSharedDirectory, fileName);
            await using var source = File.OpenRead(file);
            await using var destination = File.Create(destFile);
            await source.CopyToAsync(destination, cancellationToken);
        }
    }
}
