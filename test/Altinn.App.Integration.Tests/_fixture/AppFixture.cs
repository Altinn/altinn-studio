using System.Diagnostics;
using System.Globalization;
using System.Net;
using System.Text;
using System.Text.Json;
using CliWrap;
using CliWrap.Buffered;
using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Containers;
using DotNet.Testcontainers.Images;
using DotNet.Testcontainers.Networks;
using Microsoft.Extensions.Logging;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests;

public sealed partial class AppFixture : IAsyncDisposable
{
    private const ushort LocaltestPort = 5101;
    private const ushort AppPort = 5005;
    private const ushort PdfServicePort = 3000;
    private const string LocaltestHostname = "localtest";
    private const string AppHostname = "app";
    private const string PdfServiceHostname = "pdf-service";
    private static readonly string _localtestUrl = $"http://{LocaltestHostname}:{LocaltestPort}";
    private static readonly bool _reuseContainers = !string.IsNullOrWhiteSpace(
        Environment.GetEnvironmentVariable("TEST_REUSE_CONTAINERS")
    );
    private static readonly bool _keepContainers = !string.IsNullOrWhiteSpace(
        Environment.GetEnvironmentVariable("TEST_KEEP_CONTAINERS")
    );
    private static readonly bool _logFromTestContainers = !string.IsNullOrWhiteSpace(
        Environment.GetEnvironmentVariable("TEST_LOG_FROM_TEST_CONTAINERS")
    );
    private static readonly bool _forceRebuild = !string.IsNullOrWhiteSpace(
        Environment.GetEnvironmentVariable("TEST_FORCE_REBUILD")
    );
    private static readonly string _localtestBranch =
        Environment.GetEnvironmentVariable("TEST_LOCALTEST_BRANCH") ?? "main";
    private static readonly string _projectDirectory = ModuleInitializer.GetProjectDirectory();

    private static long _fixtureInstance = -1;
    private static readonly SemaphoreSlim _localtestCloneLock = new(1, 1);
    private static readonly SemaphoreSlim _localtestBuildLock = new(1, 1);
    private static readonly SemaphoreSlim _appBuildLock = new(1, 1);
    private static readonly SemaphoreSlim _pdfServiceLock = new(1, 1);
    private static readonly SemaphoreSlim _packLibrariesLock = new(1, 1);
    private static IFutureDockerImage? _localtestContainerImage;
    private static Dictionary<string, IFutureDockerImage> _appContainerImages = new();
    private static IContainer? _pdfServiceContainer;
    private static bool _librariesPacked = false;
    private static bool _localtestRepositoryCloned = false;

    private static long NextFixtureInstance() => Interlocked.Increment(ref _fixtureInstance);

    private static readonly JsonSerializerOptions _jsonSerializerOptions = new(JsonSerializerDefaults.Web);

    private readonly TestOutputLogger _logger;
    private readonly long _currentFixtureInstance;
    private readonly string _app;
    private readonly string _scenario;
    private readonly INetwork _network;
    private readonly IContainer _localtestContainer;
    private readonly IContainer _appContainer;
    private readonly string _portConfigDirectory;

    internal ScopedVerifier ScopedVerifier { get; }

    private HttpClient? _appClient;
    private HttpClient? _localtestClient;

    public bool TestErrored { get; set; } = false;

    private static readonly Dictionary<string, string> _localtestEnv = new()
    {
        { "DOTNET_ENVIRONMENT", "Docker" },
        { "LocalPlatformSettings__LocalAppUrl", $"http://{AppHostname}:{AppPort}" },
    };

    private static Dictionary<string, string?> CreateAppEnv(long fixtureInstance, string name, string scenario)
    {
        Assert.NotNull(_pdfServiceContainer);
        var pdfServiceUrl =
            $"http://host.docker.internal:{_pdfServiceContainer.GetMappedPublicPort(PdfServicePort)}/pdf";

        return new()
        {
            { "DOTNET_ENVIRONMENT", "Development" },
            { "AppSettings__OpenIdWellKnownEndpoint", $"{_localtestUrl}/authentication/api/v1/openid/" },
            { "PlatformSettings__ApiStorageEndpoint", $"{_localtestUrl}/storage/api/v1/" },
            { "PlatformSettings__ApiRegisterEndpoint", $"{_localtestUrl}/register/api/v1/" },
            { "PlatformSettings__ApiProfileEndpoint", $"{_localtestUrl}/profile/api/v1/" },
            { "PlatformSettings__ApiAuthenticationEndpoint", $"{_localtestUrl}/authentication/api/v1/" },
            { "PlatformSettings__ApiAuthorizationEndpoint", $"{_localtestUrl}/authorization/api/v1/" },
            { "PlatformSettings__ApiEventsEndpoint", $"{_localtestUrl}/events/api/v1/" },
            { "PlatformSettings__ApiPdf2Endpoint", pdfServiceUrl },
            { "PlatformSettings__ApiNotificationEndpoint", $"{_localtestUrl}/notifications/api/v1/" },
            { "PlatformSettings__ApiCorrespondenceEndpoint", $"{_localtestUrl}/correspondence/api/v1/" },
            { "TEST_FIXTURE_INSTANCE", $"{fixtureInstance:00}" },
            { "TEST_APP_NAME", name },
            { "TEST_APP_SCENARIO", scenario },
        };
    }

    private AppFixture(
        TestOutputLogger logger,
        long currentFixtureInstance,
        string app,
        string scenario,
        INetwork network,
        IContainer localtestContainer,
        IContainer appContainer,
        string portConfigDirectory
    )
    {
        _logger = logger;
        _currentFixtureInstance = currentFixtureInstance;
        _app = app;
        _scenario = scenario;
        _network = network;
        _localtestContainer = localtestContainer;
        _appContainer = appContainer;
        _portConfigDirectory = portConfigDirectory;
        ScopedVerifier = new ScopedVerifier(this);
    }

    public async Task<string> GetSnapshotAppLogs()
    {
        // Gets stdout and stderr logs from the app container and combines/filters (while sorting by timestamp)
        // - Log messages from `SnapshotLogger` in the app
        // - Error logs (`fail:` prefix in the default M.E.L log format)

        var logs = await _appContainer.GetLogsAsync(timestampsEnabled: true);

        var expectedPrefix = $"[{_currentFixtureInstance:00}/{_app}/{_scenario}]";
        var stdOut = logs.Stdout.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        var stdErr = logs.Stderr.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        var data = new List<(DateTime Timestamp, string Line)>(stdOut.Length + stdErr.Length);
        static bool IsStartOfLogMessage(
            string line,
            string prefix,
            out ReadOnlySpan<char> timestamp,
            out ReadOnlySpan<char> start,
            out bool isSnapshotMessage,
            out bool isError
        )
        {
            timestamp = default;
            start = default;
            isSnapshotMessage = false;
            isError = false;
            var firstWhitespace = line.IndexOf(' ');
            if (firstWhitespace < 0)
                return false;
            timestamp = line.AsSpan(0, firstWhitespace);
            start = line.AsSpan(firstWhitespace + 1); // Skip timestamp
            isSnapshotMessage = start.StartsWith(prefix);
            isError = start.StartsWith("fail:");
            return isSnapshotMessage
                || isError
                || start.StartsWith("info:")
                || start.StartsWith("warn:")
                || start.StartsWith("dbug:");
        }

        static void AddLines(string[] source, List<(DateTime Timestamp, string Line)> target, string prefix)
        {
            for (int i = 0; i < source.Length; i++)
            {
                var line = source[i];
                if (
                    !IsStartOfLogMessage(
                        line,
                        prefix,
                        out var timestampString,
                        out var start,
                        out var isSnapshotMessage,
                        out var isErrorMessage
                    )
                )
                    continue;

                var timestamp = DateTime.Parse(timestampString, CultureInfo.InvariantCulture);
                if (isSnapshotMessage)
                {
                    start = $"[{start.Slice(4)}"; // Remove the fixture index as tests run with parallelism
                    target.Add((timestamp, start.ToString()));
                }
                else if (isErrorMessage)
                {
                    var fullMessage = new StringBuilder();
                    fullMessage.Append(start);
                    for (int j = i + 1; j < source.Length; j++)
                    {
                        if (IsStartOfLogMessage(source[j], prefix, out _, out start, out _, out _))
                            break;
                        if (start.IsEmpty)
                            continue;

                        fullMessage.Append('\n');
                        fullMessage.Append(start);
                    }
                    target.Add((timestamp, fullMessage.ToString()));
                }
            }
        }
        AddLines(stdOut, data, expectedPrefix);
        AddLines(stdErr, data, expectedPrefix);

        // Sort by RFC3339Nano timestamp and remove timestamp prefix
        data.Sort((a, b) => a.Timestamp.CompareTo(b.Timestamp));

        var result = string.Join('\n', data.Select(d => d.Line));
        return result;
    }

    private static async Task EnsureLocaltestRepositoryCloned(TestOutputLogger logger)
    {
        if (_localtestRepositoryCloned)
            return;

        await _localtestCloneLock.WaitAsync();
        try
        {
            if (_localtestRepositoryCloned)
                return;

            var localtestDirectory = Path.Join(_projectDirectory, "_localtest");

            if (Directory.Exists(Path.Join(localtestDirectory, ".git")))
            {
                logger.LogInformation("Updating existing app-localtest repository: {Branch}", _localtestBranch);

                // Check current branch
                var currentBranch = await Cli.Wrap("git")
                    .WithArguments(["branch", "--show-current"])
                    .WithWorkingDirectory(localtestDirectory)
                    .ExecuteBufferedAsync()
                    .Select(x => x.StandardOutput.Trim());

                if (currentBranch != _localtestBranch)
                {
                    // Different branch requested, easier to delete and re-clone
                    logger.LogInformation(
                        "Branch changed from {CurrentBranch} to {NewBranch}, re-cloning",
                        currentBranch,
                        _localtestBranch
                    );
                    Directory.Delete(localtestDirectory, true);
                    Directory.CreateDirectory(localtestDirectory);

                    // Clone the repository with the new branch
                    await Cli.Wrap("git")
                        .WithArguments(
                            [
                                "clone",
                                "--depth=1",
                                "https://github.com/Altinn/app-localtest",
                                "--branch",
                                _localtestBranch,
                                localtestDirectory,
                            ]
                        )
                        .WithWorkingDirectory(_projectDirectory)
                        .ExecuteBufferedAsync();
                }
                else
                {
                    // Same branch, just update
                    await Cli.Wrap("git")
                        .WithArguments(["fetch", "origin", _localtestBranch])
                        .WithWorkingDirectory(localtestDirectory)
                        .ExecuteBufferedAsync();

                    await Cli.Wrap("git")
                        .WithArguments(["reset", "--hard", $"origin/{_localtestBranch}"])
                        .WithWorkingDirectory(localtestDirectory)
                        .ExecuteBufferedAsync();
                }
            }
            else
            {
                logger.LogInformation("Cloning app-localtest repository: {Branch}", _localtestBranch);

                // Ensure parent directory exists
                if (Directory.Exists(localtestDirectory))
                    Directory.Delete(localtestDirectory, true);
                Directory.CreateDirectory(localtestDirectory);

                // Clone the repository
                await Cli.Wrap("git")
                    .WithArguments(
                        [
                            "clone",
                            "--depth=1",
                            "https://github.com/Altinn/app-localtest",
                            "--branch",
                            _localtestBranch,
                            localtestDirectory,
                        ]
                    )
                    .WithWorkingDirectory(_projectDirectory)
                    .ExecuteBufferedAsync();
            }

            var sha = await Cli.Wrap("git")
                .WithArguments(["rev-parse", "--short", "HEAD"])
                .WithWorkingDirectory(localtestDirectory)
                .ExecuteBufferedAsync()
                .Select(x => x.StandardOutput.Trim());

            _localtestRepositoryCloned = true;
            logger.LogInformation("app-localtest repository ready - {Branch} / {Sha}", _localtestBranch, sha);
        }
        finally
        {
            _localtestCloneLock.Release();
        }
    }

    private static async Task<IFutureDockerImage> EnsureLocaltestImageBuilt(
        TestOutputLogger logger,
        TestOutputLogger testContainersLogger
    )
    {
        if (_localtestContainerImage is not null)
            return _localtestContainerImage;

        await _localtestBuildLock.WaitAsync();
        try
        {
            if (_localtestContainerImage is not null)
                return _localtestContainerImage;

            logger.LogInformation("Building container images");
            var localtestDirectory = Path.Join(_projectDirectory, "_localtest");
            var localtestBuilder = new ImageFromDockerfileBuilder()
                .WithName($"applib-localtest:latest")
                .WithDockerfileDirectory(localtestDirectory)
                .WithCleanUp(false)
                .WithDeleteIfExists(_forceRebuild);

            if (_logFromTestContainers)
                localtestBuilder = localtestBuilder.WithLogger(testContainersLogger);

            _localtestContainerImage = localtestBuilder.Build();

            await _localtestContainerImage.CreateAsync();
            return _localtestContainerImage;
        }
        finally
        {
            _localtestBuildLock.Release();
        }
    }

    private static async Task<IFutureDockerImage> EnsureAppImageBuilt(
        string name,
        TestOutputLogger logger,
        TestOutputLogger testContainersLogger
    )
    {
        await _appBuildLock.WaitAsync();
        try
        {
            if (_appContainerImages.TryGetValue(name, out var existingImage))
                return existingImage;

            logger.LogInformation("Building app container image");

            var appDirectory = GetAppDir(name);
            CopyPackages(name);

            var appBuilder = new ImageFromDockerfileBuilder()
                .WithName($"applib-{name}:latest")
                .WithDockerfileDirectory(Directory.GetParent(appDirectory)!.FullName)
                .WithCleanUp(false)
                .WithDeleteIfExists(_forceRebuild);

            if (_logFromTestContainers)
                appBuilder = appBuilder.WithLogger(testContainersLogger);

            var appContainerImage = appBuilder.Build();

            await appContainerImage.CreateAsync();
            _appContainerImages[name] = appContainerImage;
            return appContainerImage;
        }
        finally
        {
            _appBuildLock.Release();
        }
    }

    private static async Task<IContainer> EnsurePdfServiceStarted(
        TestOutputLogger logger,
        TestOutputLogger testContainersLogger
    )
    {
        if (_pdfServiceContainer is not null)
            return _pdfServiceContainer;

        await _pdfServiceLock.WaitAsync();
        try
        {
            if (_pdfServiceContainer is not null)
                return _pdfServiceContainer;

            logger.LogInformation("Starting shared PDF service container");

            var pdfServiceContainerBuilder = new ContainerBuilder()
                .WithName("applib-pdf-service-shared")
                .WithImage("browserless/chrome:1-puppeteer-21.3.6")
                .WithHostname(PdfServiceHostname)
                .WithEnvironment("HOST", "0.0.0.0")
                .WithPortBinding(PdfServicePort, assignRandomHostPort: true)
                .WithWaitStrategy(Wait.ForUnixContainer().UntilHttpRequestIsSucceeded(r => r.ForPort(PdfServicePort)))
                .WithReuse(_reuseContainers)
                .WithCleanUp(!_keepContainers)
                // The PDF service doesn't need to run in the same network as localtest and the app
                // so we communicate between app and PDF service over host network
                // (host.docker.internal and local.altinn.cloud)
                .WithExtraHost("host.docker.internal", "host-gateway")
                .WithExtraHost("local.altinn.cloud", "host-gateway");

            if (_logFromTestContainers)
                pdfServiceContainerBuilder = pdfServiceContainerBuilder.WithLogger(testContainersLogger);

            _pdfServiceContainer = pdfServiceContainerBuilder.Build();
            await _pdfServiceContainer.StartAsync();

            return _pdfServiceContainer;
        }
        finally
        {
            _pdfServiceLock.Release();
        }
    }

    private static async Task<(
        INetwork network,
        IContainer localtestContainer,
        IContainer appContainer,
        string portConfigDirectory
    )> InitializeContainers(
        long fixtureInstance,
        string name,
        string scenario,
        IFutureDockerImage localtestContainerImage,
        IFutureDockerImage appContainerImage,
        TestOutputLogger logger,
        TestOutputLogger testContainersLogger
    )
    {
        var timer = Stopwatch.StartNew();
        var scenarioDirectory = GetScenarioDir(name, scenario);

        // Create port configuration directory
        var portConfigDirectory = Path.Combine(Path.GetTempPath(), $"applib-fixture-{fixtureInstance:00}-ports");
        if (Directory.Exists(portConfigDirectory))
            Directory.Delete(portConfigDirectory, true);
        Directory.CreateDirectory(portConfigDirectory);
        logger.LogInformation("Created port config directory: {PortConfigDirectory}", portConfigDirectory);

        INetwork? network = null;
        IContainer? localtestContainer = null;
        IContainer? appContainer = null;

        try
        {
            logger.LogInformation("Starting fixture");
            var networkBuilder = new NetworkBuilder()
                .WithName($"applib-{name}-network-{fixtureInstance:00}")
                .WithReuse(false)
                .WithCleanUp(true);

            if (_logFromTestContainers)
                networkBuilder = networkBuilder.WithLogger(testContainersLogger);

            network = networkBuilder.Build();

            await network.CreateAsync();

            var localtestContainerBuilder = new ContainerBuilder()
                .WithName($"applib-{name}-localtest-{fixtureInstance:00}")
                .WithImage(localtestContainerImage)
                .WithHostname(LocaltestHostname)
                .WithNetwork(network)
                .WithEnvironment(_localtestEnv)
                .WithPortBinding(LocaltestPort, true)
                .WithWaitStrategy(Wait.ForUnixContainer().UntilContainerIsHealthy(failingStreak: 10))
                .WithReuse(_reuseContainers)
                .WithCleanUp(!_keepContainers)
                // The PDF service doesn't need to run in the same network as localtest and the app
                // so we communicate between app and PDF service over host network (host.docker.internal)
                .WithExtraHost("host.docker.internal", "host-gateway");

            if (_logFromTestContainers)
                localtestContainerBuilder = localtestContainerBuilder.WithLogger(testContainersLogger);

            localtestContainer = localtestContainerBuilder.Build();

            var appEnv = CreateAppEnv(fixtureInstance, name, scenario);
            var appContainerBuilder = new ContainerBuilder()
                .WithName($"applib-{name}-app-{fixtureInstance:00}")
                .WithImage(appContainerImage)
                .WithHostname(AppHostname)
                .WithNetwork(network)
                .WithEnvironment(appEnv)
                .WithPortBinding(AppPort, assignRandomHostPort: true)
                .WithWaitStrategy(Wait.ForUnixContainer().UntilContainerIsHealthy(failingStreak: 10))
                .WithReuse(_reuseContainers)
                .WithCleanUp(!_keepContainers)
                .WithExtraHost("host.docker.internal", "host-gateway");

            if (_logFromTestContainers)
                appContainerBuilder = appContainerBuilder.WithLogger(testContainersLogger);

            // Only bind mount scenario directory if it exists (not for "default" scenario)
            if (scenario != "default" && Directory.Exists(scenarioDirectory))
            {
                logger.LogInformation("Mounting scenario directory: {ScenarioDirectory}", scenarioDirectory);
                appContainerBuilder = appContainerBuilder.WithBindMount(scenarioDirectory, "/App/scenario-overrides");
            }

            // Mount port configuration directory
            // Since we select random host ports for app containers we can't know in advance what the port will be
            // As soon as the container reaches the `Starting` state the port is available and mapped
            // and so we use a volume as the means for injecting the port information.
            // The app starts with a fs watcher to retrieve the information efficiently
            appContainerBuilder = appContainerBuilder.WithBindMount(portConfigDirectory, "/App/port-config");
            appContainer = appContainerBuilder.Build();
            var tcs = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            appContainer.Starting += (sender, args) =>
            {
                logger.LogInformation("App container starting with ID: {ContainerId}", appContainer.Id);
                tcs.TrySetResult();
            };

            var localtestStartup = localtestContainer.StartAsync();
            var appStartup = appContainer.StartAsync();

            // When the `Starting` event is raise we can proceed by writing port configuration to the mounted volume
            await tcs.Task;
            await WritePortConfiguration(appContainer, portConfigDirectory, logger);

            await Task.WhenAll(localtestStartup, appStartup);
            logger.LogInformation("Built fixture in {ElapsedSeconds} s", timer.Elapsed.TotalSeconds.ToString("0.0"));
            return (network, localtestContainer, appContainer, portConfigDirectory);
        }
        catch (Exception ex)
        {
            logger.LogInformation(ex, "Failed to create fixture");

            try
            {
                logger.LogError("Crashed during fixture creation, dumping logs:");
                await LogContainerLogs(logger, localtestContainer, appContainer);
            }
            catch (Exception lex)
            {
                logger.LogError(lex, "Failed to retrieve app container logs");
            }

            await TryDispose(logger, appContainer);
            await TryDispose(logger, localtestContainer);
            await TryDispose(logger, network);
            throw;
        }
    }

    private static async Task WritePortConfiguration(
        IContainer appContainer,
        string portConfigDirectory,
        TestOutputLogger logger
    )
    {
        try
        {
            var appPort = appContainer.GetMappedPublicPort(AppPort);
            var portConfig = new
            {
                externalAppPort = appPort,
                externalAppBaseUrl = $"http://local.altinn.cloud:{appPort}/{{org}}/{{app}}/",
            };

            var portConfigJson = JsonSerializer.Serialize(
                portConfig,
                new JsonSerializerOptions { WriteIndented = true }
            );
            var portConfigFile = Path.Combine(portConfigDirectory, "ports.json");

            await File.WriteAllTextAsync(portConfigFile, portConfigJson);
            logger.LogInformation("Wrote port configuration to {PortConfigFile}", portConfigFile);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to write port configuration to {PortConfigDirectory}", portConfigDirectory);
            throw;
        }
    }

    public static async Task<AppFixture> Create(ITestOutputHelper output, string name, string scenario = "default")
    {
        var fixtureInstance = NextFixtureInstance();
        var testContainersLogger = new TestOutputLogger(output, fixtureInstance, name, scenario, true);
        var logger = new TestOutputLogger(output, fixtureInstance, name, scenario, false);

        try
        {
            // Build images and start PDF service in parallel for better performance
            // Cloning localtest repo has to occur before building the localtest image since
            // the image build relies on the repository being present.
            // Packing has to occur before building the app image since
            // the app image rely on local nupkg's to be present.
            // The rest can happen in parallel
            await EnsureLocaltestRepositoryCloned(logger);
            var localtestImageTask = EnsureLocaltestImageBuilt(logger, testContainersLogger);
            var pdfServiceTask = EnsurePdfServiceStarted(logger, testContainersLogger);
            await EnsureLibrariesPacked();
            var appImageTask = EnsureAppImageBuilt(name, logger, testContainersLogger);

            await Task.WhenAll(localtestImageTask, pdfServiceTask, appImageTask);
            var localtestContainerImage = await localtestImageTask;
            var appContainerImage = await appImageTask;
            await pdfServiceTask; // We don't capture and dispose this anywhere. Testcontainers will take care of it

            // Initialize containers (including network creation and PDF service)
            var (network, localtestContainer, appContainer, portConfigDirectory) = await InitializeContainers(
                fixtureInstance,
                name,
                scenario,
                localtestContainerImage,
                appContainerImage,
                logger,
                testContainersLogger
            );

            return new AppFixture(
                logger,
                fixtureInstance,
                name,
                scenario,
                network,
                localtestContainer,
                appContainer,
                portConfigDirectory
            );
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create fixture");
            throw;
        }
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

        if (TestErrored)
        {
            // TestErrored is set to true for test/snapshot failures.
            // When this happens we might not reach the stage of the test where
            // we snapshot app logs. So we have additional code here
            // to output container logs at the end so that test failures in CI for example
            // is easier to debug.
            await _localtestContainer.StopAsync();
            await _appContainer.StopAsync();

            _logger.LogError("Test errored, logging container output");
            await LogContainerLogs(_logger, _localtestContainer, _appContainer);
        }

        await TryDispose(_appContainer);
        await TryDispose(_localtestContainer);
        await TryDispose(_network);

        // Clean up port config directory
        if (Directory.Exists(_portConfigDirectory))
        {
            try
            {
                Directory.Delete(_portConfigDirectory, true);
            }
            catch (Exception ex)
            {
                // Log but don't throw - cleanup is best effort
                _logger.LogWarning(
                    ex,
                    "Failed to clean up port config directory {PortConfigDirectory}",
                    _portConfigDirectory
                );
            }
        }
    }

    private static async Task LogContainerLogs(ILogger logger, IContainer? localtestContainer, IContainer? appContainer)
    {
        if (localtestContainer is not null)
        {
            var localtestLogs = await GetCombinedLogs(localtestContainer);
            logger.LogError("Localtest container logs:\n{Logs}", localtestLogs);
        }
        if (appContainer is not null)
        {
            var appLogs = await GetCombinedLogs(appContainer);
            logger.LogError("App container logs:\n{Logs}", appLogs);
        }
    }

    private async Task TryDispose(IAsyncDisposable? disposable) => await TryDispose(_logger, disposable);

    private static async Task TryDispose(TestOutputLogger logger, IAsyncDisposable? disposable)
    {
        if (disposable is null)
            return;

        try
        {
            await disposable.DisposeAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to dispose {Type}", disposable.GetType().FullName);
        }
    }

    public HttpClient GetAppClient()
    {
        if (_appClient == null)
        {
            var cookieContainer = new CookieContainer();
            var handler = new HttpClientHandler() { CookieContainer = cookieContainer };

            _appClient = new HttpClient(handler)
            {
                BaseAddress = new Uri(
                    $"http://local.altinn.cloud:{_localtestContainer.GetMappedPublicPort(LocaltestPort)}"
                ),
            };
            _appClient.DefaultRequestHeaders.Add("User-Agent", "Altinn.App.Integration.Tests");

            // Add frontendVersion cookie with the app's external URL
            var appExternalUrl = GetAppExternalUrl();
            var baseUri = _appClient.BaseAddress!;
            cookieContainer.Add(baseUri, new Cookie("frontendVersion", appExternalUrl));
        }

        return _appClient;
    }

    public HttpClient GetLocaltestClient()
    {
        if (_localtestClient == null)
        {
            _localtestClient = new HttpClient
            {
                BaseAddress = new Uri($"http://localhost:{_localtestContainer.GetMappedPublicPort(LocaltestPort)}"),
            };
            _localtestClient.DefaultRequestHeaders.Add("User-Agent", "Altinn.App.Integration.Tests");
        }

        return _localtestClient;
    }

    public string GetAppExternalUrl()
    {
        return $"http://host.docker.internal:{_appContainer.GetMappedPublicPort(AppPort)}";
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

    private static string GetScenarioDir(string name, string scenario)
    {
        var scenarioDirectory = Path.Join(_projectDirectory, $"_testapps/{name}/_scenarios/{scenario}");
        var info = new DirectoryInfo(scenarioDirectory);

        // For "default" scenario, we don't expect a _scenarios directory to exist
        if (scenario == "default")
        {
            return scenarioDirectory; // Return the path even if it doesn't exist
        }

        if (!info.Exists)
        {
            throw new DirectoryNotFoundException(
                $"The scenario directory {scenarioDirectory} does not exist. Please check the scenario name '{scenario}'."
            );
        }
        return info.FullName;
    }

    private static async Task EnsureLibrariesPacked()
    {
        await _packLibrariesLock.WaitAsync();
        try
        {
            if (_librariesPacked)
                return;

            await PackLibraries();
            _librariesPacked = true;
        }
        finally
        {
            _packLibrariesLock.Release();
        }
    }

    private static async Task PackLibraries()
    {
        var output = Path.Join(_projectDirectory, "_testapps", "_packages");
        var solutionDirectory = GetSolutionDir();
        var result = await Cli.Wrap("dotnet")
            .WithArguments(["pack", "-c", "Release", "--output", output])
            .WithWorkingDirectory(solutionDirectory)
            .ExecuteAsync();
        Assert.Equal(0, result.ExitCode);
    }

    private static void CopyPackages(string name)
    {
        var appDirectory = GetAppDir(name);
        var packagesDirectory = Path.Join(_projectDirectory, "_testapps", "_packages");
        var appPackagesDirectory = Path.Join(appDirectory, "..", "_packages");
        if (Directory.Exists(appPackagesDirectory))
        {
            Directory.Delete(appPackagesDirectory, true);
        }
        Directory.CreateDirectory(appPackagesDirectory);
        foreach (var file in Directory.GetFiles(packagesDirectory))
        {
            var fileName = Path.GetFileName(file);
            var destFile = Path.Combine(appPackagesDirectory, fileName);
            File.Copy(file, destFile);
        }
    }

    private static string GetSolutionDir()
    {
        var solutionDirectory = Path.Join(_projectDirectory, "..", "..");
        var info = new DirectoryInfo(solutionDirectory);
        if (!info.Exists)
        {
            throw new DirectoryNotFoundException(
                $"The directory {solutionDirectory} does not exist. Please check the path."
            );
        }
        return info.FullName;
    }

    private static async Task<string> GetCombinedLogs(IContainer container)
    {
        var logs = await container.GetLogsAsync(timestampsEnabled: true);
        var stdOut = logs.Stdout.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        var stdErr = logs.Stderr.Split('\n', StringSplitOptions.RemoveEmptyEntries);

        var data = new List<(DateTime Timestamp, string Line)>(stdOut.Length + stdErr.Length);
        static void AddLines(string[] source, List<(DateTime Timestamp, string Line)> data)
        {
            foreach (var line in source)
            {
                if (string.IsNullOrWhiteSpace(line))
                    continue;

                var firstWhitespace = line.IndexOf(' ');
                data.Add(
                    (
                        DateTime.Parse(line.AsSpan(0, firstWhitespace), CultureInfo.InvariantCulture),
                        line.Substring(firstWhitespace + 1)
                    )
                );
            }
        }
        AddLines(stdOut, data);
        AddLines(stdErr, data);

        // Sort by timestamp
        data.Sort((a, b) => a.Timestamp.CompareTo(b.Timestamp));
        return string.Join('\n', data.Select(d => d.Line));
    }
}
