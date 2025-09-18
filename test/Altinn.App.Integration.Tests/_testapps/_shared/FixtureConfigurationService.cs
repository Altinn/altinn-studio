using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.Loader;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.AspNetCore.Server.Kestrel.Transport.Sockets;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyModel;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

#nullable enable

namespace TestApp.Shared;

/// <summary>
/// Service that manages fixture configuration including dynamic updates.
/// Provides an HTTP endpoint for receiving configuration updates from the test fixture.
/// </summary>
public sealed class FixtureConfigurationService : IDisposable
{
    private const int ConfigurationPort = 5006;
    private readonly CancellationTokenSource _cancellationTokenSource;
    private readonly KestrelServer _server;
    private readonly ManualResetEventSlim _initialResetEvent;
    private readonly object _lock = new();

    public FixtureConfiguration? Config { get; private set; }

    public static FixtureConfigurationService Instance { get; } = new();

    // Event fired when configuration changes
    public event Action? ConfigurationChanged;

    private FixtureConfigurationService()
    {
        _initialResetEvent = new ManualResetEventSlim(false);

        var timer = Stopwatch.StartNew();
        try
        {
            _cancellationTokenSource = new CancellationTokenSource();

            var loggerFactory = new LoggerFactory();
            var kestrelServer = new KestrelServer(
                new ConfigureKestrelServerOptions(),
                new SocketTransportFactory(new ConfigureSocketTransportOptions(), loggerFactory),
                loggerFactory
            );
            kestrelServer.Options.ListenAnyIP(ConfigurationPort);
            kestrelServer.StartAsync(new HttpApp(this), CancellationToken.None).GetAwaiter().GetResult();
            _server = kestrelServer;

            timer.Stop();
            Console.WriteLine(
                $"Configuration HTTP server started on port {ConfigurationPort} in {timer.Elapsed.TotalMilliseconds:0} ms"
            );
        }
        catch (Exception ex)
        {
            timer.Stop();
            Console.WriteLine(
                $"Failed to start HTTP configuration server in {timer.Elapsed.TotalMilliseconds:0} ms: {ex.Message}"
            );
            throw;
        }
    }

    /// <summary>
    /// Starts the HTTP configuration server and waits for initial configuration
    /// </summary>
    public void Initialize(TimeSpan? timeout = null)
    {
        // The AppFixture sends configuration via HTTP POST to /configure endpoint
        // as soon as the app container is in the `Starting` state.
        timeout ??= TimeSpan.FromSeconds(10);

        if (!_initialResetEvent.Wait(timeout.Value))
            throw new TimeoutException(
                $"Fixture configuration not received after {timeout.Value.TotalSeconds} seconds"
            );
    }

    public void Configure(IServiceCollection services, IConfiguration configuration, IWebHostEnvironment env)
    {
        // Check for scenario-specific services
        // Through "_scenarios" we can override/inject both configuration
        // and code that is specific to a test scenario.
        // This allows us to run the same app container image with slightly different
        // configurations and code which is more efficient than having to create and build a whole other app/image.
        var config = Config ?? throw new InvalidOperationException("Fixture configuration not initialized");

        services.AddTracingServices();

        var scenario = config.AppScenario ?? "default";
        if (scenario != "default")
        {
            var scenarioOverridePath = Path.Join(env.ContentRootPath, "scenario-overrides", "services");
            if (Directory.Exists(scenarioOverridePath))
            {
                try
                {
                    var csFiles = Directory.GetFiles(scenarioOverridePath, "*.cs", SearchOption.AllDirectories);
                    if (!csFiles.Any())
                        return;

                    var compiledAssembly = CompileScenarioServices(csFiles);
                    if (compiledAssembly is not null)
                    {
                        var serviceCount = RegisterServicesFromAssembly(services, compiledAssembly);
                    }
                    else
                    {
                        SnapshotLogger.LogInitError("Failed to compile scenario services assembly");
                    }
                }
                catch (Exception ex)
                {
                    SnapshotLogger.LogInitError($"Failed to register scenario services: {ex.Message}");
                }
            }
            else
            {
                SnapshotLogger.LogInitInfo(
                    $"Scenario '{scenario}' specified but no services directory found at {scenarioOverridePath}"
                );
            }
        }
    }

    private readonly byte[] _payloadErrorPayload = "Invalid configuration JSON"u8.ToArray();
    private readonly byte[] _okPayload = "Configuration updated successfully"u8.ToArray();

    private async Task ProcessConfigurationRequest(
        IHttpRequestFeature request,
        IHttpResponseFeature response,
        IHttpResponseBodyFeature responseBody
    )
    {
        try
        {
            if (request.Method != "POST" || !request.Path.Equals("/configure", StringComparison.OrdinalIgnoreCase))
            {
                response.StatusCode = 404;
                return;
            }

            var config = await JsonSerializer.DeserializeAsync<FixtureConfiguration>(request.Body);
            if (config is null)
            {
                response.StatusCode = 400;
                await responseBody.Stream.WriteAsync(_payloadErrorPayload);
                return;
            }

            lock (_lock)
            {
                var previousConfig = Config;
                if (config != Config)
                {
                    Config = config;
                    SyncScenarioConfig();
                    Environment.SetEnvironmentVariable(
                        "GeneralSettings__ExternalAppBaseUrl",
                        config.ExternalAppBaseUrl
                    );
                    ConfigurationChanged?.Invoke();
                    SnapshotLogger.LogInitInfo($"Fixture configuration updated");
                }

                // Signal that configuration has been received
                if (previousConfig is null)
                    _initialResetEvent.Set();
            }

            response.StatusCode = 200;
            await responseBody.Stream.WriteAsync(_okPayload);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error processing configuration request: {ex}");
            response.StatusCode = 500;
            await responseBody.Stream.WriteAsync(Encoding.UTF8.GetBytes($"Internal server error: {ex}"));
        }
    }

    private static void SyncScenarioConfig()
    {
        var scenarioConfigPath = "/App/scenario-overrides/config";
        if (!Directory.Exists(scenarioConfigPath))
        {
            SnapshotLogger.LogInitWarning($"No scenario config directory found at {scenarioConfigPath}");
            return;
        }
        var targetConfigPath = "/App/config";

        foreach (var file in Directory.GetFiles(scenarioConfigPath, "*", SearchOption.AllDirectories))
        {
            var relativePath = Path.GetRelativePath(scenarioConfigPath, file);
            var targetFile = Path.Join(targetConfigPath, relativePath);
            var targetDir = Path.GetDirectoryName(targetFile);

            if (!string.IsNullOrEmpty(targetDir) && !Directory.Exists(targetDir))
            {
                Directory.CreateDirectory(targetDir);
            }

            File.Copy(file, targetFile, overwrite: true);
        }
    }

    private static Assembly? CompileScenarioServices(string[] csFiles)
    {
        var sourceTexts = csFiles.Select(file => File.ReadAllText(file)).ToList();
        if (!sourceTexts.Any())
            return null;

        var references = DependencyContext
            .Default!.CompileLibraries.SelectMany(cl => cl.ResolveReferencePaths())
            .Select(asm => MetadataReference.CreateFromFile(asm))
            .ToArray();

        var compilation = CSharpCompilation.Create(
            assemblyName: $"Altinn.Application.For.IntegrationTesting.Scenario",
            syntaxTrees: sourceTexts.Select(source => CSharpSyntaxTree.ParseText(source)),
            references: references,
            options: new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary)
        );

        using var memoryStream = new MemoryStream();
        var emitResult = compilation.Emit(memoryStream);

        if (!emitResult.Success)
        {
            var errors = string.Join("\n", emitResult.Diagnostics.Select(d => d.ToString()));
            SnapshotLogger.LogInitError($"Compilation failed:\n{errors}");
            return null;
        }

        memoryStream.Seek(0, SeekOrigin.Begin);
        return AssemblyLoadContext.Default.LoadFromStream(memoryStream);
    }

    private static int RegisterServicesFromAssembly(IServiceCollection services, Assembly assembly)
    {
        int registeredCount = 0;
        foreach (var type in assembly.GetTypes())
        {
            var method = type.GetMethod("RegisterServices", BindingFlags.Public | BindingFlags.Static);
            if (
                method != null
                && method.GetParameters().Length == 1
                && method.GetParameters()[0].ParameterType == typeof(IServiceCollection)
            )
            {
                method.Invoke(null, [services]);
                registeredCount++;
            }
        }
        return registeredCount;
    }

    public void Dispose()
    {
        try
        {
            _cancellationTokenSource?.Cancel();
            _server?.StopAsync(default).GetAwaiter().GetResult();
            _server?.Dispose();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error disposing HTTP configuration server: {ex.Message}");
        }
        finally
        {
            _cancellationTokenSource?.Dispose();
        }
    }

    private sealed class HttpApp(FixtureConfigurationService svc) : IHttpApplication<IFeatureCollection>
    {
        public IFeatureCollection CreateContext(IFeatureCollection contextFeatures)
        {
            return contextFeatures;
        }

        public void DisposeContext(IFeatureCollection context, Exception? exception) { }

        public async Task ProcessRequestAsync(IFeatureCollection features)
        {
            var request = (IHttpRequestFeature)(
                features[typeof(IHttpRequestFeature)] ?? throw new InvalidOperationException("No IHttpRequestFeature")
            );
            var response = (IHttpResponseFeature)(
                features[typeof(IHttpResponseFeature)] ?? throw new InvalidOperationException("No IHttpResponseFeature")
            );
            var responseBody = (IHttpResponseBodyFeature)(
                features[typeof(IHttpResponseBodyFeature)]
                ?? throw new InvalidOperationException("No IHttpResponseBodyFeature")
            );

            await svc.ProcessConfigurationRequest(request, response, responseBody);
        }
    }

    private sealed class Logger : ILogger, IDisposable
    {
        public IDisposable? BeginScope<TState>(TState state)
            where TState : notnull => this;

        public bool IsEnabled(LogLevel logLevel) => logLevel >= LogLevel.Information;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter
        )
        {
            var message = formatter(state, exception);
            Console.WriteLine($"Kestrel: {message}");
        }

        public void Dispose() { }
    }

    private sealed class LoggerFactory : ILoggerFactory
    {
        private readonly ILogger _logger = new Logger();

        public void Dispose() { }

        public void AddProvider(ILoggerProvider provider) { }

        public ILogger CreateLogger(string categoryName) => this._logger;
    }

    private sealed class ConfigureKestrelServerOptions : IOptions<KestrelServerOptions>
    {
        public ConfigureKestrelServerOptions()
        {
            this.Value = new KestrelServerOptions() { };
        }

        public KestrelServerOptions Value { get; }
    }

    private sealed class ConfigureSocketTransportOptions : IOptions<SocketTransportOptions>
    {
        public ConfigureSocketTransportOptions()
        {
            this.Value = new SocketTransportOptions() { };
        }

        public SocketTransportOptions Value { get; }
    }
}
