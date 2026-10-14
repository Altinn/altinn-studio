using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using OpenTelemetry;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Core.Tests.Extensions;

/// <summary>
/// Tests the OpenTelemetry SDK configuration <c>AddTelemetry</c> registers: what a deployment can override
/// through the standard <c>OTEL_*</c> variables, and the custom histogram buckets.
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

    public static TheoryData<string> CustomBucketHistograms => new(_histogramBuckets.Keys);

    [Fact]
    public void AddTelemetry_NoResourceVariables_ResourceTakesTheInCodeServiceIdentity()
    {
        // Arrange
        using var sp = BuildProvider();

        // Act
        var meterResource = Attributes(sp.GetRequiredService<MeterProvider>().GetResource());
        var tracerResource = Attributes(sp.GetRequiredService<TracerProvider>().GetResource());

        // Assert
        foreach (var resource in new[] { meterResource, tracerResource })
        {
            Assert.Equal("WorkflowEngine", resource["service.name"]);
            Assert.Equal(Metrics.ServiceVersion, resource["service.version"]);
            Assert.Equal(Environment.MachineName, resource["service.instance.id"]);
        }
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
        var meterResource = Attributes(sp.GetRequiredService<MeterProvider>().GetResource());
        var tracerResource = Attributes(sp.GetRequiredService<TracerProvider>().GetResource());

        // Assert
        foreach (var resource in new[] { meterResource, tracerResource })
        {
            Assert.Equal("workflow-engine-app", resource["service.name"]);
            Assert.Equal("altinn", resource["service.namespace"]);
            Assert.Equal("at23", resource["deployment.environment.name"]);

            // Still from code: the deployment sets neither
            Assert.Equal(Metrics.ServiceVersion, resource["service.version"]);
            Assert.Equal(Environment.MachineName, resource["service.instance.id"]);
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
        using var sp = BuildProvider(new() { ["OTEL_METRIC_EXPORT_INTERVAL"] = configured });

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

    private static ServiceProvider BuildProvider(
        Dictionary<string, string?>? configuration = null,
        Action<IServiceCollection>? configureServices = null
    )
    {
        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(
            new ConfigurationBuilder().AddInMemoryCollection(configuration ?? []).Build()
        );
        services.AddTelemetry();
        configureServices?.Invoke(services);
        return services.BuildServiceProvider();
    }

    private static Dictionary<string, object> Attributes(Resource resource) =>
        resource.Attributes.ToDictionary(StringComparer.Ordinal);

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
