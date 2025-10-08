using System.Buffers;
using System.Diagnostics;
using System.IO.Pipelines;
using System.Net;
using System.Text;
using System.Text.Json;
using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Configurations;
using DotNet.Testcontainers.Containers;
using DotNet.Testcontainers.Images;
using DotNet.Testcontainers.Networks;
using Microsoft.Extensions.Logging;
using TestApp.Shared;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests;

public sealed partial class AppFixture : IAsyncDisposable
{
    private const ushort LocaltestPort = 5101;
    private const ushort AppPort = 5005;
    private const ushort ConfigPort = 5006;
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

    private readonly ILogger _logger;
    private long _currentFixtureInstance;
    private readonly string _app;
    private readonly string _scenario;

    public string App => _app;
    private readonly INetwork _network;
    private readonly IContainer _localtestContainer;
    private readonly IContainer _appContainer;
    private readonly bool _isClassFixture;
    private readonly LogsConsumer _localtestLogsConsumer;
    private readonly LogsConsumer _appLogsConsumer;

    internal ScopedVerifier ScopedVerifier { get; private set; }

    private HttpClient? _appClient;
    private HttpClient? _localtestClient;

    public bool TestErrored { get; set; } = false;

    public ushort? PdfHostPort => _pdfServiceContainer?.GetMappedPublicPort(PdfServicePort);
    public ushort? LocaltestHostPort => _localtestContainer?.GetMappedPublicPort(LocaltestPort);
    public ushort? AppHostPort => _appContainer?.GetMappedPublicPort(AppPort);

    private AppFixture(
        ILogger logger,
        long currentFixtureInstance,
        string app,
        string scenario,
        INetwork network,
        IContainer localtestContainer,
        IContainer appContainer,
        bool isClassFixture,
        LogsConsumer localtestLogsConsumer,
        LogsConsumer appLogsConsumer
    )
    {
        _logger = logger;
        _currentFixtureInstance = currentFixtureInstance;
        _app = app;
        _scenario = scenario;
        _network = network;
        _localtestContainer = localtestContainer;
        _appContainer = appContainer;
        _isClassFixture = isClassFixture;
        _localtestLogsConsumer = localtestLogsConsumer;
        _appLogsConsumer = appLogsConsumer;
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
        ILogger testContainersLogger = isClassFixture
            ? new FixtureLogger(fixtureInstance, app, scenario, true)
            : new TestOutputLogger(output, fixtureInstance, app, scenario, true);
        ILogger logger = isClassFixture
            ? new FixtureLogger(fixtureInstance, app, scenario, false)
            : new TestOutputLogger(output, fixtureInstance, app, scenario, false);

        logger.LogInformation("Creating fixture..");

        try
        {
            // Build images and start PDF service in parallel for better performance
            // Cloning localtest repo has to occur before building the localtest image since
            // the image build relies on the repository being present.
            // Packing has to occur before building the app image since
            // the app image rely on local nupkg's to be present.
            // The rest can happen in parallel
            var hostIp = await ContainerRuntimeService.GetHostIP(cancellationToken);
            logger.LogInformation("Detected host IP for container communication: {HostIP}", hostIp);

            await EnsureLocaltestRepositoryCloned(logger, cancellationToken);
            var localtestImageTask = EnsureLocaltestImageBuilt(logger, testContainersLogger, cancellationToken);
            var pdfServiceTask = EnsurePdfServiceStarted(logger, testContainersLogger, hostIp, cancellationToken);
            await EnsureLibrariesPacked(logger, cancellationToken);
            var appImageTask = EnsureAppImageBuilt(app, logger, testContainersLogger, cancellationToken);

            await Task.WhenAll(localtestImageTask, pdfServiceTask, appImageTask);
            var localtestContainerImage = await localtestImageTask;
            var appContainerImage = await appImageTask;
            await pdfServiceTask; // We don't capture and dispose this anywhere. Testcontainers will take care of it

            // Initialize containers (including network creation and PDF service)
            var (network, localtestContainer, appContainer, localtestLogsConsumer, appLogsConsumer) =
                await InitializeContainers(
                    fixtureInstance,
                    app,
                    scenario,
                    localtestContainerImage,
                    appContainerImage,
                    logger,
                    testContainersLogger,
                    hostIp,
                    cancellationToken
                );

            logger.LogInformation("Fixture created in {ElapsedSeconds}s", timer.Elapsed.TotalSeconds.ToString("0.00"));
            return new AppFixture(
                logger,
                fixtureInstance,
                app,
                scenario,
                network,
                localtestContainer,
                appContainer,
                isClassFixture,
                localtestLogsConsumer,
                appLogsConsumer
            );
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create fixture");
            throw;
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
            var appExternalUrl = $"http://host.containers.internal:{_appContainer.GetMappedPublicPort(AppPort)}";
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

    public string GetSnapshotAppLogs()
    {
        // Gets logs from the app container
        // - Log messages from `SnapshotLogger` in the app
        // - Error logs (`fail:` prefix in the default M.E.L log format)

        var expectedPrefix = $"[{_currentFixtureInstance:00}/{_app}/{_scenario}";
        var allLines = _appLogsConsumer.GetLines();

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

    public string GetAppLogs()
    {
        var allLines = _appLogsConsumer.GetLines();
        var result = string.Join('\n', allLines);
        return result;
    }

    public string GetLocaltestLogs()
    {
        var allLines = _localtestLogsConsumer.GetLines();
        var result = string.Join('\n', allLines);
        return result;
    }

    public async Task ResetBetweenTestsAsync(
        ITestOutputHelper? output = null,
        CancellationToken cancellationToken = default
    )
    {
        Assert.True(_isClassFixture);

        _currentFixtureInstance = NextFixtureInstance();

        // Update logger with new test output helper and fixture instance
        if (output is not null && _logger is TestOutputLogger logger)
            logger.UpdateOutput(output, _currentFixtureInstance);

        _localtestLogsConsumer.SetCurrentFixtureInstance(_currentFixtureInstance);
        _appLogsConsumer.SetCurrentFixtureInstance(_currentFixtureInstance);

        // Update fixture configuration in the container with new fixture instance
        await SendFixtureConfiguration(
            _app,
            _scenario,
            _appContainer,
            _currentFixtureInstance,
            _logger,
            cancellationToken
        );

        // Reset error state
        TestErrored = false;

        // Dispose and reset HTTP clients to clear cookies, headers, and cached state
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

        // Recreate ScopedVerifier to reset index counter and test case state
        ScopedVerifier = new ScopedVerifier(this);

        // Note: We intentionally keep containers running as they are expensive to restart
        // and provide good isolation between tests through the HTTP layer
    }

    private static readonly Dictionary<string, string> _localtestEnv = new()
    {
        { "DOTNET_ENVIRONMENT", "Docker" },
        { "LocalPlatformSettings__LocalAppUrl", $"http://{AppHostname}:{AppPort}" },
    };

    private static Dictionary<string, string?> CreateAppEnv(long fixtureInstance, string name, string scenario)
    {
        Assert.NotNull(_pdfServiceContainer);
        var pdfServiceUrl =
            $"http://host.containers.internal:{_pdfServiceContainer.GetMappedPublicPort(PdfServicePort)}/pdf";

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
        };
    }

    private static async Task EnsureLocaltestRepositoryCloned(ILogger logger, CancellationToken cancellationToken)
    {
        if (_localtestRepositoryCloned)
            return;

        await _localtestCloneLock.WaitAsync(cancellationToken);
        try
        {
            if (_localtestRepositoryCloned)
                return;

            var localtestDirectory = Path.Join(_projectDirectory, "_localtest");

            if (Directory.Exists(Path.Join(localtestDirectory, ".git")))
            {
                logger.LogInformation("Updating existing app-localtest repository: {Branch}", _localtestBranch);

                var currentBranch = await new Command(
                    "git",
                    "branch --show-current",
                    localtestDirectory,
                    CancellationToken: cancellationToken
                ).Select(r => r.StdOut.Trim());

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

                    await new Command(
                        "git",
                        $"clone --depth=1 https://github.com/Altinn/app-localtest --branch {_localtestBranch} {localtestDirectory}",
                        _projectDirectory,
                        CancellationToken: cancellationToken
                    );
                }
                else
                {
                    // Same branch, just update
                    await new Command(
                        "git",
                        $"fetch origin {_localtestBranch}",
                        localtestDirectory,
                        CancellationToken: cancellationToken
                    );
                    await new Command(
                        "git",
                        $"reset --hard origin/{_localtestBranch}",
                        localtestDirectory,
                        CancellationToken: cancellationToken
                    );
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
                await new Command(
                    "git",
                    $"clone --depth=1 https://github.com/Altinn/app-localtest --branch {_localtestBranch} {localtestDirectory}",
                    _projectDirectory,
                    CancellationToken: cancellationToken
                );
            }

            var sha = await new Command(
                "git",
                "rev-parse --short HEAD",
                localtestDirectory,
                CancellationToken: cancellationToken
            ).Select(r => r.StdOut.Trim());

            _localtestRepositoryCloned = true;
            logger.LogInformation("app-localtest repository ready - {Branch} / {Sha}", _localtestBranch, sha);
        }
        finally
        {
            _localtestCloneLock.Release();
        }
    }

    private static async Task<IFutureDockerImage> EnsureLocaltestImageBuilt(
        ILogger logger,
        ILogger testContainersLogger,
        CancellationToken cancellationToken
    )
    {
        if (_localtestContainerImage is not null)
            return _localtestContainerImage;

        await _localtestBuildLock.WaitAsync(cancellationToken);
        try
        {
            if (_localtestContainerImage is not null)
                return _localtestContainerImage;

            logger.LogInformation("Building localtest container image");
            var localtestDirectory = Path.Join(_projectDirectory, "_localtest");
            var localtestBuilder = new ImageFromDockerfileBuilder()
                .WithName($"applib-localtest:latest")
                .WithDockerfileDirectory(localtestDirectory)
                .WithCleanUp(false)
                .WithDeleteIfExists(_forceRebuild);

            if (_logFromTestContainers)
                localtestBuilder = localtestBuilder.WithLogger(testContainersLogger);

            var localtestContainerImage = localtestBuilder.Build();

            await localtestContainerImage.CreateAsync(cancellationToken);
            logger.LogInformation("Built localtest container image..");
            _localtestContainerImage = localtestContainerImage;
            return _localtestContainerImage;
        }
        finally
        {
            _localtestBuildLock.Release();
        }
    }

    private static async Task<IFutureDockerImage> EnsureAppImageBuilt(
        string name,
        ILogger logger,
        ILogger testContainersLogger,
        CancellationToken cancellationToken
    )
    {
        await _appBuildLock.WaitAsync(cancellationToken);
        try
        {
            if (_appContainerImages.TryGetValue(name, out var existingImage))
                return existingImage;

            logger.LogInformation("Building app container image");

            var appDirectory = GetAppDir(name);
            await Task.WhenAll(SyncPackages(name), SyncShared(name));

            var appBuilder = new ImageFromDockerfileBuilder()
                .WithName($"applib-{name}:latest")
                .WithDockerfileDirectory(Directory.GetParent(appDirectory)!.FullName)
                .WithCleanUp(false)
                .WithDeleteIfExists(_forceRebuild);

            if (_logFromTestContainers)
                appBuilder = appBuilder.WithLogger(testContainersLogger);

            var appContainerImage = appBuilder.Build();

            await appContainerImage.CreateAsync(cancellationToken);
            _appContainerImages[name] = appContainerImage;

            logger.LogInformation("Built app container image");
            return appContainerImage;
        }
        finally
        {
            _appBuildLock.Release();
        }
    }

    private static async Task<IContainer> EnsurePdfServiceStarted(
        ILogger logger,
        ILogger testContainersLogger,
        string hostIp,
        CancellationToken cancellationToken
    )
    {
        if (_pdfServiceContainer is not null)
            return _pdfServiceContainer;

        await _pdfServiceLock.WaitAsync(cancellationToken);
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
                // The PDF service is very slow so we start it as part of "static initialization" (it runs as a single instance with a host port for the whole testrun).
                // So we communicate between app and PDF service over host network through `host.containers.internal`.
                // The PDF calls back to the host over `local.altinn.cloud`. It normally points to 127.0.0.1 so we have to override it in the container.
                .WithExtraHost("host.containers.internal", hostIp)
                .WithExtraHost("local.altinn.cloud", hostIp);

            if (_logFromTestContainers)
                pdfServiceContainerBuilder = pdfServiceContainerBuilder.WithLogger(testContainersLogger);

            var pdfServiceContainer = pdfServiceContainerBuilder.Build();
            await pdfServiceContainer.StartAsync(cancellationToken);
            logger.LogInformation("Started PDF service container");
            _pdfServiceContainer = pdfServiceContainer;

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
        LogsConsumer localtestLogsConsumer,
        LogsConsumer appLogsConsumer
    )> InitializeContainers(
        long fixtureInstance,
        string name,
        string scenario,
        IFutureDockerImage localtestContainerImage,
        IFutureDockerImage appContainerImage,
        ILogger logger,
        ILogger testContainersLogger,
        string hostIp,
        CancellationToken cancellationToken
    )
    {
        var timer = Stopwatch.StartNew();
        var scenarioDirectory = GetScenarioDir(name, scenario);

        INetwork? network = null;
        IContainer? localtestContainer = null;
        IContainer? appContainer = null;

        var localtestLogsConsumer = new LogsConsumer(logger, fixtureInstance, cancellationToken);
        var appLogsConsumer = new LogsConsumer(logger, fixtureInstance, cancellationToken);
        try
        {
            logger.LogInformation("Starting containers");
            var networkBuilder = new NetworkBuilder()
                .WithName($"applib-{name}-network-{fixtureInstance:00}")
                .WithReuse(false)
                .WithCleanUp(true);

            if (_logFromTestContainers)
                networkBuilder = networkBuilder.WithLogger(testContainersLogger);

            network = networkBuilder.Build();

            await network.CreateAsync(cancellationToken);

            var localtestContainerBuilder = new ContainerBuilder()
                .WithName($"applib-{name}-localtest-{fixtureInstance:00}")
                .WithImage(localtestContainerImage)
                .WithHostname(LocaltestHostname)
                .WithNetwork(network)
                .WithEnvironment(_localtestEnv)
                .WithPortBinding(LocaltestPort, true)
                .WithWaitStrategy(Wait.ForUnixContainer().UntilContainerIsHealthy(failingStreak: 20))
                .WithOutputConsumer(localtestLogsConsumer)
                .WithReuse(_reuseContainers)
                .WithCleanUp(!_keepContainers)
                .WithExtraHost("host.containers.internal", hostIp);

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
                .WithPortBinding(ConfigPort, assignRandomHostPort: true)
                .WithWaitStrategy(Wait.ForUnixContainer().UntilContainerIsHealthy(failingStreak: 20))
                .WithOutputConsumer(appLogsConsumer)
                .WithReuse(_reuseContainers)
                .WithCleanUp(!_keepContainers)
                .WithExtraHost("host.containers.internal", hostIp);

            if (_logFromTestContainers)
                appContainerBuilder = appContainerBuilder.WithLogger(testContainersLogger);

            // Only bind mount scenario directory if it exists (not for "default" scenario)
            if (scenario != "default" && Directory.Exists(scenarioDirectory))
            {
                logger.LogInformation("Mounting scenario directory: {ScenarioDirectory}", scenarioDirectory);
                appContainerBuilder = appContainerBuilder.WithBindMount(scenarioDirectory, "/App/scenario-overrides");
            }

            // Configuration is now sent via HTTP once the container reaches the `Starting` state
            appContainer = appContainerBuilder.Build();
            var tcs = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            appContainer.Starting += (sender, args) =>
            {
                logger.LogInformation("App container starting with ID: {ContainerId}", appContainer.Id);
                tcs.TrySetResult();
            };

            var localtestStartup = localtestContainer.StartAsync(cancellationToken);
            var appStartup = appContainer.StartAsync(cancellationToken);

            // When the `Starting` event is raise we can proceed by writing fixture configuration to the mounted volume
            await tcs.Task.WaitAsync(cancellationToken);
            await SendFixtureConfiguration(name, scenario, appContainer, fixtureInstance, logger, cancellationToken);

            await Task.WhenAll(localtestStartup, appStartup);
            logger.LogInformation("Started fixture in {ElapsedSeconds}s", timer.Elapsed.TotalSeconds.ToString("0.0"));
            return (network, localtestContainer, appContainer, localtestLogsConsumer, appLogsConsumer);
        }
        catch (Exception ex)
        {
            logger.LogInformation(ex, "Failed to create fixture");

            try
            {
                logger.LogError("Crashed during fixture creation, dumping logs:");
                LogContainerLogs(logger, localtestLogsConsumer, appLogsConsumer);
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

    private static async Task SendFixtureConfiguration(
        string name,
        string scenario,
        IContainer appContainer,
        long fixtureInstance,
        ILogger logger,
        CancellationToken cancellationToken
    )
    {
        const int retries = 20;
        var appPort = appContainer.GetMappedPublicPort(AppPort);
        var configPort = appContainer.GetMappedPublicPort(ConfigPort);
        var configUrl = $"http://localhost:{configPort}/configure";
        logger.LogInformation("Sending fixture configuration to app at: {ConfigUrl}", configUrl);
        for (int i = 0; i < retries; i++)
        {
            try
            {
                var fixtureConfig = new FixtureConfiguration(
                    name,
                    scenario,
                    fixtureInstance,
                    appPort,
                    $"http://local.altinn.cloud:{appPort}/{{org}}/{{app}}/"
                );

                var configJson = JsonSerializer.Serialize(
                    fixtureConfig,
                    new JsonSerializerOptions { WriteIndented = true }
                );

                using var httpClient = new HttpClient();
                httpClient.Timeout = TimeSpan.FromSeconds(10);

                using var content = new StringContent(configJson, Encoding.UTF8, "application/json");
                using var response = await httpClient.PostAsync(configUrl, content, cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
                    throw new HttpRequestException(
                        $"Failed to send configuration to app: {response.StatusCode} - {errorContent}"
                    );
                }

                logger.LogInformation("Sent fixture configuration to {ConfigUrl}, attempt {Attempt}", configUrl, i + 1);
                break;
            }
            catch (Exception ex)
            {
                if (i == retries - 1)
                {
                    logger.LogError(ex, "Failed to send fixture configuration to app");
                    throw;
                }
                await Task.Delay(Math.Min(100 * i, 500));
            }
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

        if (TestErrored && !_isClassFixture)
        {
            // TestErrored is set to true for test/snapshot failures.
            // When this happens we might not reach the stage of the test where
            // we snapshot app logs. So we have additional code here
            // to output container logs at the end so that test failures in CI for example
            // is easier to debug.
            await _localtestContainer.StopAsync();
            await _appContainer.StopAsync();

            _logger.LogError("Test errored, logging container output");
            LogContainerLogs();
        }

        await TryDispose(_appContainer);
        await TryDispose(_localtestContainer);
        await TryDispose(_network);
    }

    internal void LogContainerLogs() => LogContainerLogs(_logger, _localtestLogsConsumer, _appLogsConsumer);

    private static void LogContainerLogs(ILogger logger, LogsConsumer localtestLogs, LogsConsumer appLogs)
    {
        {
            var logs = string.Join("\n", localtestLogs.GetLines());
            logger.LogError("Localtest container logs:\n{Logs}", logs);
        }
        {
            var logs = string.Join("\n", appLogs.GetLines());
            logger.LogError("App container logs:\n{Logs}", logs);
        }
    }

    private async Task TryDispose(IAsyncDisposable? disposable) => await TryDispose(_logger, disposable);

    private static async Task TryDispose(ILogger logger, IAsyncDisposable? disposable)
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
            _librariesPacked = true;

            logger.LogInformation("Packed libraries");
        }
        finally
        {
            _packLibrariesLock.Release();
        }
    }

    private static async Task SyncPackages(string name)
    {
        var appDirectory = GetAppDir(name);
        var packagesDirectory = Path.Join(_projectDirectory, "_testapps", "_packages");
        var appPackagesDirectory = Path.Join(appDirectory, "..", "_packages");
        if (Directory.Exists(appPackagesDirectory))
            Directory.Delete(appPackagesDirectory, true);
        Directory.CreateDirectory(appPackagesDirectory);
        foreach (var file in Directory.GetFiles(packagesDirectory))
        {
            var fileName = Path.GetFileName(file);
            var destFile = Path.Join(appPackagesDirectory, fileName);
            await using var source = File.OpenRead(file);
            await using var destination = File.Create(destFile);
            await source.CopyToAsync(destination);
        }
    }

    private static async Task SyncShared(string name)
    {
        var appDirectory = GetAppDir(name);
        var sharedDirectory = Path.Join(_projectDirectory, "_testapps", "_shared");
        var appSharedDirectory = Path.Join(appDirectory, "..", "_shared");
        if (Directory.Exists(appSharedDirectory))
            Directory.Delete(appSharedDirectory, true);
        Directory.CreateDirectory(appSharedDirectory);
        foreach (var file in Directory.GetFiles(sharedDirectory))
        {
            var fileName = Path.GetFileName(file);
            var destFile = Path.Join(appSharedDirectory, fileName);
            await using var source = File.OpenRead(file);
            await using var destination = File.Create(destFile);
            await source.CopyToAsync(destination);
        }
    }

    internal sealed class LogsConsumer : IOutputConsumer
    {
        // This is a rather complicated way to actually recombine stdout and stderr
        // into a single stream. It seems like Testcontainers takes Docker.Dotnet's
        // multiplexed stream and splits it into 2.
        // We could use Docker.Dotnet directly but then we would probably get other issues to solve..
        // NOTE: even though we try to read every line in the order they were printed, it seems thats
        // not possible due to the way Testcontainers works. See the LogsConsumer test in the fixture tests.
        private readonly Pipe _pipe;
        private readonly SynchronizedWriteStream _writeStream;
        private long _currentFixtureInstance;
        private readonly Dictionary<long, List<string>> _lines = new(4);
        private readonly object _lock = new();
        private readonly ILogger _logger;
        private readonly CancellationToken _cancellationToken;

        public bool Enabled => true;

        public Stream Stdout => _writeStream;

        public Stream Stderr => _writeStream;

        public LogsConsumer(ILogger logger, long fixtureInstance, CancellationToken cancellationToken)
        {
            _pipe = new();
            _writeStream = new SynchronizedWriteStream(_pipe.Writer.AsStream());

            _logger = logger;
            _currentFixtureInstance = fixtureInstance;
            _cancellationToken = cancellationToken;
            _ = Task.Run(ReadLines);
        }

        public void SetCurrentFixtureInstance(long fixtureInstance) => _currentFixtureInstance = fixtureInstance;

        public IReadOnlyList<string> GetLines(long? forFixtureInstance = null)
        {
            lock (_lock)
            {
                if (_lines.TryGetValue(forFixtureInstance ?? _currentFixtureInstance, out var lines))
                    return lines.ToArray();
            }
            return Array.Empty<string>();
        }

        private async Task ReadLines()
        {
            var cancellationToken = _cancellationToken;
            try
            {
                var reader = _pipe.Reader;
                while (!cancellationToken.IsCancellationRequested)
                {
                    var result = await reader.ReadAsync(cancellationToken);
                    if (result.IsCanceled)
                        break;

                    var buffer = result.Buffer;
                    while (buffer.Length > 0)
                    {
                        var eol = buffer.PositionOf((byte)'\n');
                        if (eol == null)
                            break;

                        var line = buffer.Slice(0, eol.Value);
                        var lineStr = Encoding.UTF8.GetString(line.ToArray());
                        var currentInstance = _currentFixtureInstance;
                        lock (_lock)
                        {
                            if (!_lines.TryGetValue(currentInstance, out var lines))
                                _lines[currentInstance] = lines = new List<string>(32);
                            lines.Add(lineStr);
                        }

                        buffer = buffer.Slice(buffer.GetPosition(1, eol.Value));
                    }

                    reader.AdvanceTo(buffer.Start, buffer.End);

                    if (result.IsCompleted)
                        break;
                }

                await reader.CompleteAsync();
            }
            catch (OperationCanceledException)
            {
                // Ignore
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while reading logs");
                Environment.FailFast("Fatal error in LogsConsumer", ex);
            }

            _logger.LogInformation("Log reading task is exiting");
        }

        public void Dispose()
        {
            _pipe.Writer.Complete();
            _writeStream.Dispose();
        }
    }
}
