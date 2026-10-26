using System.Data;
using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;
using OpenTelemetry;
using OpenTelemetry.Instrumentation.EntityFrameworkCore;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Core.Tests.Extensions;

/// <summary>
/// Tests the OpenTelemetry SDK configuration <c>AddTelemetry</c> registers: what a deployment can override
/// through the standard <c>OTEL_*</c> variables, which signals it exports, how a process identifies itself and
/// reports its start, and the custom histogram buckets.
/// </summary>
/// <remarks>
/// The <c>OTEL_*</c> values reach the SDK through <see cref="IConfiguration"/>, which a real host fills from the
/// environment. Each test supplies its own, so variables set on the machine running the tests cannot leak in.
/// </remarks>
public sealed class TelemetryConfigurationTests
{
    private static readonly double[] _durationBuckets =
    [
        0.0001,
        0.0005,
        0.001,
        0.0025,
        0.005,
        0.01,
        0.025,
        0.05,
        0.1,
        0.25,
        0.5,
        1,
        2.5,
        5,
        10,
        30,
        60,
        120,
        300,
    ];

    private static readonly double[] _wakeLatencyBuckets =
    [
        0.0005,
        0.001,
        0.0025,
        0.005,
        0.01,
        0.02,
        0.05,
        0.1,
        0.2,
        0.5,
        1,
        2,
        5,
        10,
        30,
        60,
    ];

    private static readonly double[] _waitBudgetBuckets =
    [
        1,
        2,
        5,
        10,
        30,
        60,
        300,
        900,
        1800,
        3600,
        10800,
        21600,
        43200,
        86400,
        259200,
        604800,
        1209600,
    ];

    /// <summary>
    /// Every histogram the engine emits, by its wire name, with the bucket boundaries its view gives it.
    /// </summary>
    private static readonly Dictionary<string, double[]> _histogramBuckets = new(StringComparer.Ordinal)
    {
        ["altinn.workflow_engine.workflow.queue.duration"] = _durationBuckets,
        ["altinn.workflow_engine.workflow.processing.duration"] = _durationBuckets,
        ["altinn.workflow_engine.workflow.duration"] = _durationBuckets,
        ["altinn.workflow_engine.step.queue.duration"] = _durationBuckets,
        ["altinn.workflow_engine.step.processing.duration"] = _durationBuckets,
        ["altinn.workflow_engine.step.duration"] = _durationBuckets,
        ["altinn.workflow_engine.main_loop.wait.duration"] = _durationBuckets,
        ["altinn.workflow_engine.main_loop.processing.duration"] = _durationBuckets,
        ["altinn.workflow_engine.main_loop.duration"] = _durationBuckets,
        ["altinn.workflow_engine.mailbox.receiver.wake.duration"] = _wakeLatencyBuckets,
        ["altinn.workflow_engine.step.wait.duration"] = _waitBudgetBuckets,
    };

    private static readonly string[] _arrayParameter = ["a", "b"];

    private static readonly Action<ILogger, Exception?> _logExportTest = LoggerMessage.Define(
        LogLevel.Warning,
        new EventId(1),
        "export test"
    );

    public static TheoryData<string> CustomBucketHistograms => new(_histogramBuckets.Keys);

    private const string OtlpEndpoint = "OTEL_EXPORTER_OTLP_ENDPOINT";
    private const string OtlpTracesEndpoint = "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT";
    private const string OtlpMetricsEndpoint = "OTEL_EXPORTER_OTLP_METRICS_ENDPOINT";
    private const string OtlpLogsEndpoint = "OTEL_EXPORTER_OTLP_LOGS_ENDPOINT";

    [Fact]
    public void AddTelemetry_NoEndpointVariable_NoSignalIsExported()
    {
        // Arrange
        using var sp = BuildProvider();

        // Act
        var exported = ExportedSignals(sp);

        // Assert — no exporter falls back to the SDK's default endpoint, where no collector listens
        Assert.Equal((false, false, false), exported);
    }

    [Theory]
    [InlineData(OtlpEndpoint, "http://collector:4317", true)]
    [InlineData(OtlpEndpoint, " ", false)]
    [InlineData(OtlpTracesEndpoint, "http://collector:4318/v1/traces", false)]
    [InlineData(OtlpMetricsEndpoint, "http://collector:4318/v1/metrics", false)]
    [InlineData(OtlpLogsEndpoint, "http://collector:4318/v1/logs", false)]
    public void AddTelemetry_EndpointVariable_OnlyTheSharedEndpointTurnsOnEverySignal(
        string variable,
        string endpoint,
        bool exported
    )
    {
        // Arrange
        using var sp = BuildProvider(new() { [variable] = endpoint });

        // Act
        var signals = ExportedSignals(sp);

        // Assert — a per-signal endpoint alone exports nothing, so no signal falls back to the SDK's default
        Assert.Equal((exported, exported, exported), signals);
    }

    [Fact]
    public async Task AddTelemetry_EndpointAndProtocolVariables_EverySignalReachesTheEndpoint()
    {
        // Arrange
        using var collector = new OtlpHttpCollector();
        using var sp = BuildProvider(
            new() { [OtlpEndpoint] = collector.Endpoint.ToString(), ["OTEL_EXPORTER_OTLP_PROTOCOL"] = "http/protobuf" }
        );
        var tracerProvider = sp.GetRequiredService<TracerProvider>();
        var meterProvider = sp.GetRequiredService<MeterProvider>();
        var loggerProvider = sp.GetRequiredService<LoggerProvider>();

        // Act
        var activity = Metrics.Source.StartActivity("export-test");
        Assert.NotNull(activity);
        activity.Dispose();
        _logExportTest(sp.GetRequiredService<ILoggerFactory>().CreateLogger("export-test"), null);
        Assert.True(tracerProvider.ForceFlush(5000));
        Assert.True(meterProvider.ForceFlush(5000));
        Assert.True(loggerProvider.ForceFlush(5000));

        // Assert
        var received = await collector.WaitForPaths(["/v1/traces", "/v1/metrics", "/v1/logs"]);
        Assert.Equal(["/v1/logs", "/v1/metrics", "/v1/traces"], received.Order(StringComparer.Ordinal));
    }

    [Fact]
    public void AddTelemetry_NoResourceVariables_ResourceTakesTheInCodeServiceIdentity()
    {
        // Arrange
        using var sp = BuildProvider();

        // Act
        var resources = SignalResources(sp);

        // Assert
        foreach (var resource in resources)
        {
            Assert.Equal("WorkflowEngine", resource["service.name"]);
            Assert.Equal(Metrics.ServiceVersion, resource["service.version"]);
            Assert.Equal(Metrics.ServiceInstanceId, resource["service.instance.id"]);
        }
    }

    [Fact]
    public void AddTelemetry_NoResourceVariables_EverySignalOfEveryProviderCarriesOneProcessWideUuid()
    {
        // Arrange
        using var first = BuildProvider();
        using var second = BuildProvider();

        // Act
        var instanceIds = SignalResources(first)
            .Concat(SignalResources(second))
            .Select(resource => resource["service.instance.id"])
            .ToList();

        // Assert — a UUID rather than the host name, which every engine on a machine and every container
        // restart in a pod would share, and generated once, not once per provider
        Assert.Equal(6, instanceIds.Count);
        var instanceId = Assert.IsType<string>(Assert.Single(instanceIds.Distinct()));
        Assert.True(Guid.TryParseExact(instanceId, "D", out _), $"'{instanceId}' is not a UUID");
    }

    [Fact]
    public void AddTelemetry_InstanceIdInResourceAttributes_TakesPrecedenceOverTheProcessUuid()
    {
        // Arrange
        using var sp = BuildProvider(
            new() { ["OTEL_RESOURCE_ATTRIBUTES"] = "service.instance.id=workflow-engine-app-7d4b9-x2x4z" }
        );

        // Act
        var resources = SignalResources(sp);

        // Assert
        Assert.All(
            resources,
            resource => Assert.Equal("workflow-engine-app-7d4b9-x2x4z", resource["service.instance.id"])
        );
    }

    [Fact]
    public void AddTelemetry_NoEngineActivity_EveryCollectionExportsTheProcessStartTime()
    {
        // Arrange
        using var process = Process.GetCurrentProcess();
        var processStart = (process.StartTime.ToUniversalTime() - DateTime.UnixEpoch).TotalSeconds;

        using var exporter = new MetricSnapshotExporter();
        using var reader = new BaseExportingMetricReader(exporter);
        using var sp = BuildProvider(configureServices: services =>
            services.ConfigureOpenTelemetryMeterProvider(builder => builder.AddReader(reader))
        );
        _ = sp.GetRequiredService<MeterProvider>();

        // Act
        reader.Collect();
        reader.Collect();

        // Assert
        Assert.Equal(2, exporter.Exports.Count);
        Assert.All(
            exporter.Exports,
            export =>
            {
                var gauge = Assert.Single(export, metric => metric.Name == "altinn.workload.start_time");
                Assert.Equal(MetricType.DoubleGauge, gauge.Type);
                Assert.Equal("s", gauge.Unit);
                var point = Assert.Single(gauge.Points);
                Assert.Equal(processStart, point.Value, tolerance: 1);
                Assert.Equal(0, point.TagCount);
            }
        );
    }

    [Fact]
    public void AddTelemetry_ResourceVariablesSet_TheyTakePrecedenceOverTheInCodeServiceIdentity()
    {
        // Arrange
        using var sp = BuildProvider(
            new()
            {
                ["OTEL_SERVICE_NAME"] = "workflow-engine-app",
                ["OTEL_RESOURCE_ATTRIBUTES"] = "service.namespace=altinn,deployment.environment.name=at23",
            }
        );

        // Act
        var resources = SignalResources(sp);

        // Assert
        foreach (var resource in resources)
        {
            Assert.Equal("workflow-engine-app", resource["service.name"]);
            Assert.Equal("altinn", resource["service.namespace"]);
            Assert.Equal("at23", resource["deployment.environment.name"]);

            // Still from code: the deployment sets neither
            Assert.Equal(Metrics.ServiceVersion, resource["service.version"]);
            Assert.Equal(Metrics.ServiceInstanceId, resource["service.instance.id"]);
        }
    }

    [Theory]
    [InlineData(null, "service.name=from-attributes", "from-attributes")]
    [InlineData("from-service-name", "service.name=from-attributes", "from-service-name")]
    [InlineData(null, "service.namespace=altinn", "WorkflowEngine")]
    public void AddTelemetry_ServiceNameSources_ServiceNameVariableThenResourceAttributesThenCode(
        string? serviceName,
        string resourceAttributes,
        string expectedServiceName
    )
    {
        // Arrange
        using var sp = BuildProvider(
            new() { ["OTEL_SERVICE_NAME"] = serviceName, ["OTEL_RESOURCE_ATTRIBUTES"] = resourceAttributes }
        );

        // Act
        var resource = Attributes(sp.GetRequiredService<MeterProvider>().GetResource());

        // Assert
        Assert.Equal(expectedServiceName, resource["service.name"]);
    }

    [Theory]
    [InlineData("15000", 15_000)]
    [InlineData(null, null)]
    public void AddTelemetry_MetricExportInterval_IsLeftToTheEnvironment(string? configured, int? expected)
    {
        // Arrange
        using var sp = BuildProvider(
            new()
            {
                [OtlpMetricsEndpoint] = "http://127.0.0.1:1/v1/metrics",
                ["OTEL_METRIC_EXPORT_INTERVAL"] = configured,
            }
        );

        // Act
        // Building the provider runs the OTLP exporter's reader factory, which hands these options — the
        // instance the options monitor caches — to any in-code callback before it creates the periodic reader.
        // A null interval leaves the reader on the SDK default.
        _ = sp.GetRequiredService<MeterProvider>();
        var readerOptions = sp.GetRequiredService<IOptionsMonitor<MetricReaderOptions>>().Get(Options.DefaultName);

        // Assert
        Assert.Equal(expected, readerOptions.PeriodicExportingMetricReaderOptions.ExportIntervalMilliseconds);
    }

    [Theory]
    [MemberData(nameof(CustomBucketHistograms))]
    public void AddTelemetry_CustomBucketHistogram_ExportsItsViewBoundaries(string instrumentName)
    {
        // Arrange
        using var exporter = new HistogramBoundsExporter();
        using var reader = new BaseExportingMetricReader(exporter);
        using var sp = BuildProvider(configureServices: services =>
            services.ConfigureOpenTelemetryMeterProvider(builder => builder.AddReader(reader))
        );
        _ = sp.GetRequiredService<MeterProvider>();

        var histogram = Assert.Single(EngineHistograms(), h => h.Name == instrumentName);

        // Act
        histogram.Record(1);
        reader.Collect();

        // Assert
        Assert.True(exporter.Bounds.TryGetValue(instrumentName, out var bounds), $"{instrumentName} was not exported");
        Assert.Equal(_histogramBuckets[instrumentName], bounds);
    }

    [Fact]
    public void CustomBucketHistograms_CoverEveryEngineHistogram()
    {
        // Act
        var emitted = EngineHistograms().Select(h => h.Name).Order(StringComparer.Ordinal);

        // Assert
        Assert.Equal(emitted, _histogramBuckets.Keys.Order(StringComparer.Ordinal));
    }

    [Fact]
    public void AddTelemetry_QueryParametersEmitted_EachParameterIsItsOwnSemanticConventionAttribute()
    {
        // Arrange
        using var sp = BuildProvider(enableDatabaseInstrumentation: true, emitQueryParameters: true);
        using var command = QueryWithParameters();
        using var activity = new Activity("db");

        // Act
        EnrichDatabaseSpan(sp)(activity, command);

        // Assert — named by the parameter without its placeholder prefix, or by its index when it has no name
        Assert.Equal("ttd/e2e-tests", activity.GetTagItem("db.query.parameter.__ns_0"));
        Assert.Equal("42", activity.GetTagItem("db.query.parameter.p1"));
        Assert.Equal("[\"a\",\"b\"]", activity.GetTagItem("db.query.parameter.p2"));
        Assert.Equal("7", activity.GetTagItem("db.query.parameter.4"));
        Assert.DoesNotContain(activity.TagObjects, t => t.Key == "db.query.parameter.p3");
        Assert.DoesNotContain(activity.TagObjects, t => t.Key == "db.statement.parameters");
    }

    [Fact]
    public void AddTelemetry_QueryParametersNotEmitted_DatabaseSpanCarriesNoParameterValues()
    {
        // Arrange
        using var sp = BuildProvider(enableDatabaseInstrumentation: true);
        using var command = QueryWithParameters();
        using var activity = new Activity("db");

        // Act
        EnrichDatabaseSpan(sp)(activity, command);

        // Assert
        Assert.DoesNotContain(
            activity.TagObjects,
            t => t.Key.StartsWith("db.query.parameter.", StringComparison.Ordinal)
        );
    }

    private static NpgsqlCommand QueryWithParameters()
    {
        var command = new NpgsqlCommand("SELECT 1");
        command.Parameters.AddWithValue("@__ns_0", "ttd/e2e-tests");
        command.Parameters.AddWithValue("p1", 42);
        command.Parameters.AddWithValue("@p2", _arrayParameter);
        command.Parameters.AddWithValue("@p3", DBNull.Value);
        command.Parameters.Add(new NpgsqlParameter { Value = 7 });
        return command;
    }

    /// <summary>
    /// The enrichment the engine registers on the Entity Framework Core instrumentation, which runs for every
    /// database span.
    /// </summary>
    private static Action<Activity, IDbCommand> EnrichDatabaseSpan(ServiceProvider sp)
    {
        var options = sp.GetRequiredService<IOptionsMonitor<EntityFrameworkInstrumentationOptions>>()
            .Get(Options.DefaultName);
        return Assert.IsType<Action<Activity, IDbCommand>>(options.EnrichWithIDbCommand);
    }

    private static ServiceProvider BuildProvider(
        Dictionary<string, string?>? configuration = null,
        Action<IServiceCollection>? configureServices = null,
        bool enableDatabaseInstrumentation = false,
        bool emitQueryParameters = false
    )
    {
        var services = new ServiceCollection();
        var config = new ConfigurationBuilder().AddInMemoryCollection(configuration ?? []).Build();
        services.AddSingleton<IConfiguration>(config);
        services.AddTelemetry(
            config,
            emitQueryParameters: emitQueryParameters,
            enableDatabaseInstrumentation: enableDatabaseInstrumentation
        );
        configureServices?.Invoke(services);
        return services.BuildServiceProvider();
    }

    /// <summary>
    /// Whether the tracer, meter and logger providers each have an exporter. The engine adds nothing to a pipeline
    /// but its OTLP exporter, so a provider without a processor or reader exports nothing. The SDK does not expose
    /// its pipeline, so this reads it by reflection, and fails loudly if the SDK renames it.
    /// </summary>
    private static (bool Traces, bool Metrics, bool Logs) ExportedSignals(ServiceProvider sp) =>
        (
            PipelineMember(sp.GetRequiredService<TracerProvider>(), "Processor") is not null,
            PipelineMember(sp.GetRequiredService<MeterProvider>(), "Reader") is not null,
            PipelineMember(sp.GetRequiredService<LoggerProvider>(), "Processor") is not null
        );

    private static object? PipelineMember(object provider, string name)
    {
        var property = provider
            .GetType()
            .GetProperty(name, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
        Assert.NotNull(property);
        return property.GetValue(provider);
    }

    private static Dictionary<string, object> Attributes(Resource resource) =>
        resource.Attributes.ToDictionary(StringComparer.Ordinal);

    /// <summary>
    /// The resource attributes of the tracer, meter and logger providers, in that order.
    /// </summary>
    private static Dictionary<string, object>[] SignalResources(ServiceProvider sp) =>
        [
            Attributes(sp.GetRequiredService<TracerProvider>().GetResource()),
            Attributes(sp.GetRequiredService<MeterProvider>().GetResource()),
            Attributes(
                Assert.Single(sp.GetServices<ILoggerProvider>().OfType<OpenTelemetryLoggerProvider>()).GetResource()
            ),
        ];

    /// <summary>
    /// The histograms declared on <see cref="Metrics"/>, found by reflection so a new one cannot be added
    /// without a decision about its buckets.
    /// </summary>
    private static IEnumerable<System.Diagnostics.Metrics.Histogram<double>> EngineHistograms() =>
        typeof(Metrics)
            .GetFields(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Static)
            .Select(field => field.GetValue(null))
            .OfType<System.Diagnostics.Metrics.Histogram<double>>();

    /// <summary>
    /// Keeps what each export held, metric by metric, with the value of every double gauge point. It copies them
    /// during the export because the SDK reuses its metric objects across collections.
    /// </summary>
    private sealed class MetricSnapshotExporter : BaseExporter<Metric>
    {
        public List<List<ExportedMetric>> Exports { get; } = [];

        public override ExportResult Export(in Batch<Metric> batch)
        {
            var export = new List<ExportedMetric>();
            foreach (var metric in batch)
            {
                var points = new List<ExportedPoint>();
                if (metric.MetricType == MetricType.DoubleGauge)
                {
                    foreach (ref readonly var point in metric.GetMetricPoints())
                        points.Add(new ExportedPoint(point.GetGaugeLastValueDouble(), point.Tags.Count));
                }

                export.Add(new ExportedMetric(metric.Name, metric.Unit, metric.MetricType, points));
            }

            Exports.Add(export);
            return ExportResult.Success;
        }
    }

    private sealed record ExportedMetric(string Name, string Unit, MetricType Type, List<ExportedPoint> Points);

    private sealed record ExportedPoint(double Value, int TagCount);

    /// <summary>
    /// A stand-in OTLP/HTTP collector on a free loopback port that answers every request with 200 and keeps the
    /// path it was sent to.
    /// </summary>
    private sealed class OtlpHttpCollector : IDisposable
    {
        private readonly HttpListener _listener = new();
        private readonly List<string> _paths = [];
        private readonly Lock _lock = new();

        public OtlpHttpCollector()
        {
            Endpoint = new Uri($"http://127.0.0.1:{FreePort()}/");
            _listener.Prefixes.Add(Endpoint.ToString());
            _listener.Start();
            _ = Task.Run(Serve);
        }

        public Uri Endpoint { get; }

        public async Task<IReadOnlyList<string>> WaitForPaths(string[] expected)
        {
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            while (!timeout.IsCancellationRequested)
            {
                lock (_lock)
                {
                    if (expected.All(_paths.Contains))
                        return [.. _paths.Distinct(StringComparer.Ordinal)];
                }

                await Task.Delay(50, CancellationToken.None);
            }

            lock (_lock)
                return [.. _paths.Distinct(StringComparer.Ordinal)];
        }

        public void Dispose() => _listener.Close();

        private async Task Serve()
        {
            while (_listener.IsListening)
            {
                HttpListenerContext context;
                try
                {
                    context = await _listener.GetContextAsync();
                }
                catch (Exception e) when (e is HttpListenerException or ObjectDisposedException)
                {
                    return;
                }

                lock (_lock)
                    _paths.Add(context.Request.Url?.AbsolutePath ?? "");
                context.Response.StatusCode = 200;
                context.Response.Close();
            }
        }

        private static int FreePort()
        {
            using var socket = new TcpListener(IPAddress.Loopback, 0);
            socket.Start();
            return ((IPEndPoint)socket.LocalEndpoint).Port;
        }
    }

    /// <summary>
    /// Keeps the explicit bucket boundaries of every histogram it is handed, by instrument name.
    /// </summary>
    private sealed class HistogramBoundsExporter : BaseExporter<Metric>
    {
        public Dictionary<string, double[]> Bounds { get; } = new(StringComparer.Ordinal);

        public override ExportResult Export(in Batch<Metric> batch)
        {
            foreach (var metric in batch)
            {
                if (metric.MetricType != MetricType.Histogram)
                    continue;

                foreach (ref readonly var point in metric.GetMetricPoints())
                {
                    var bounds = new List<double>();
                    foreach (var bucket in point.GetHistogramBuckets())
                    {
                        if (!double.IsPositiveInfinity(bucket.ExplicitBound))
                            bounds.Add(bucket.ExplicitBound);
                    }

                    Bounds[metric.Name] = [.. bounds];
                }
            }

            return ExportResult.Success;
        }
    }
}
