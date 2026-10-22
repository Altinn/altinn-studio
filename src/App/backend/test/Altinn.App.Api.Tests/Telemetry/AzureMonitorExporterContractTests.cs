using System.Collections.Concurrent;
using System.Diagnostics;
using System.Diagnostics.Metrics;
using System.IO.Compression;
using System.Net;
using System.Text.Json;
using Azure.Core.Pipeline;
using Azure.Monitor.OpenTelemetry.Exporter;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;

namespace Altinn.App.Api.Tests;

[CollectionDefinition(Name, DisableParallelization = true)]
public sealed class AzureMonitorExporterCollection
{
    public const string Name = "Azure Monitor exporter environment";
}

[Collection(AzureMonitorExporterCollection.Name)]
public sealed class AzureMonitorExporterContractTests : IDisposable
{
    private const string Source = "Altinn.AzureMonitor.Contract";
    private const string Endpoint = "https://westeurope-5.in.applicationinsights.azure.com/";
    private readonly Dictionary<string, string?> _environment = new();

    public AzureMonitorExporterContractTests()
    {
        SetEnvironment("APPLICATIONINSIGHTS_STATSBEAT_DISABLED", "true");
        SetEnvironment("APPLICATIONINSIGHTS_SDKSTATS_DISABLED_ALL", "true");
        SetEnvironment("OTEL_TRACES_SAMPLER", null);
        SetEnvironment("OTEL_TRACES_SAMPLER_ARG", null);
    }

    [Fact]
    public async Task Defaults_Export_Every_Trace_In_A_Burst_And_App_Metrics()
    {
        using var capture = new CaptureTransport();
        await using var services = BuildServices(capture);
        var traces = services.GetRequiredService<TracerProvider>();
        var metrics = services.GetRequiredService<MeterProvider>();
        using var source = new ActivitySource(Source);
        using var meter = new Meter(Source);
        for (var i = 0; i < 100; i++)
        {
            using var activity = source.StartActivity("contract-request", ActivityKind.Server);
        }
        meter.CreateCounter<int>("contract-counter").Add(7);

        Assert.True(traces.ForceFlush());
        Assert.True(metrics.ForceFlush());
        Assert.Equal(
            100,
            capture.Data("RequestData").Count(d => d.GetProperty("name").GetString() == "contract-request")
        );
        Assert.Contains(
            capture.Data("MetricData"),
            d =>
                d.GetProperty("metrics")
                    .EnumerateArray()
                    .Any(m =>
                        m.GetProperty("name").GetString() == "contract-counter"
                        && m.GetProperty("value").GetDouble() == 7
                    )
        );
        Assert.All(capture.Requests, uri => Assert.Equal(new Uri(Endpoint).Host, uri.Host));
    }

    [Theory]
    [InlineData(false, false)]
    [InlineData(false, true)]
    [InlineData(true, false)]
    [InlineData(true, true)]
    public async Task Logs_Are_Independent_Of_Trace_Sampling_Unless_Owner_Opts_In(bool filterLogs, bool configureAfter)
    {
        using var capture = new CaptureTransport();
        Action<IServiceCollection> configure = services =>
            services.Configure<AzureMonitorExporterOptions>(options =>
                options.EnableTraceBasedLogsSampler = filterLogs
            );
        await using var services = BuildServices(
            capture,
            configureAfter ? null : configure,
            configureAfter ? configure : null
        );
        var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger(Source);
        foreach (var context in new[] { "none", "unrecorded", "recorded" })
        {
            using var activity =
                context == "none" ? null : new Activity(context).SetIdFormat(ActivityIdFormat.W3C).Start();
            if (activity is not null)
                activity.ActivityTraceFlags =
                    context == "recorded" ? ActivityTraceFlags.Recorded : ActivityTraceFlags.None;
            foreach (var level in new[] { LogLevel.Information, LogLevel.Warning, LogLevel.Error, LogLevel.Critical })
                logger.Log(level, "contract-log:{Context}:{Level}", context, level);
        }
        var loggerProvider = services.GetRequiredService<LoggerProvider>();
        Assert.True(loggerProvider.ForceFlush());
        var messages = capture.Data("MessageData").Select(d => d.GetProperty("message").GetString()).ToArray();
        var expectedContexts = filterLogs ? new[] { "none", "recorded" } : new[] { "none", "unrecorded", "recorded" };
        var expected =
            from context in expectedContexts
            from level in new[] { LogLevel.Information, LogLevel.Warning, LogLevel.Error, LogLevel.Critical }
            select $"contract-log:{context}:{level}";
        Assert.Equal(expected.Order(), messages.Order());
    }

    [Fact]
    public async Task Default_Logs_Preserve_Errors_In_Unrecorded_Traces()
    {
        using var capture = new CaptureTransport();
        await using var services = BuildServices(capture);
        var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger(Source);
        using (var activity = new Activity("unrecorded").SetIdFormat(ActivityIdFormat.W3C).Start())
        {
            activity.ActivityTraceFlags = ActivityTraceFlags.None;
            logger.LogError("contract-error");
            logger.LogCritical("contract-critical");
        }
        Assert.True(services.GetRequiredService<LoggerProvider>().ForceFlush());
        Assert.Equal(
            new[] { "contract-critical", "contract-error" },
            capture.Data("MessageData").Select(d => d.GetProperty("message").GetString()).Order()
        );
    }

    [Theory]
    [InlineData(false, false)]
    [InlineData(false, true)]
    [InlineData(true, false)]
    [InlineData(true, true)]
    public async Task Owner_Exporter_Options_Can_Drop_All_Traces(bool configureAfter, bool useRateLimit)
    {
        using var capture = new CaptureTransport();
        Action<IServiceCollection> configure = services =>
            services.Configure<AzureMonitorExporterOptions>(options =>
            {
                options.TracesPerSecond = useRateLimit ? 0 : null;
                options.SamplingRatio = useRateLimit ? 1 : 0;
            });
        await using var services = BuildServices(
            capture,
            configureAfter ? null : configure,
            configureAfter ? configure : null
        );
        var provider = services.GetRequiredService<TracerProvider>();
        using var source = new ActivitySource(Source);
        using (var activity = source.StartActivity("contract-request", ActivityKind.Server))
            Assert.False(activity?.Recorded ?? false);
        Assert.True(provider.ForceFlush());
        Assert.Empty(capture.Data("RequestData"));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Owner_Custom_Sampler_After_Altinn_Registration_Is_Used(bool withServiceProvider)
    {
        using var capture = new CaptureTransport();
        var sampler = new OwnerSampler();
        await using var services = BuildServices(
            capture,
            after: services =>
            {
                if (withServiceProvider)
                {
                    services.AddSingleton(sampler);
                    services.ConfigureOpenTelemetryTracerProvider(
                        (sp, b) => b.SetSampler(sp.GetRequiredService<OwnerSampler>())
                    );
                }
                else
                    services.ConfigureOpenTelemetryTracerProvider(b => b.SetSampler(sampler));
            }
        );
        var provider = services.GetRequiredService<TracerProvider>();
        using var source = new ActivitySource(Source);
        using (var activity = source.StartActivity("contract-request", ActivityKind.Server))
            Assert.False(activity?.Recorded ?? false);
        Assert.Equal(1, sampler.Calls);
        Assert.True(provider.ForceFlush());
        Assert.Empty(capture.Data("RequestData"));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Owner_Processor_Enrichment_Precedes_Azure_Metric_Extraction(bool withServiceProvider)
    {
        using var capture = new CaptureTransport();
        var processor = new OwnerEnrichmentProcessor();
        await using var services = BuildServices(
            capture,
            before: services =>
            {
                if (withServiceProvider)
                {
                    services.AddSingleton(processor);
                    services.ConfigureOpenTelemetryTracerProvider(
                        (sp, b) => b.AddProcessor(sp.GetRequiredService<OwnerEnrichmentProcessor>())
                    );
                }
                else
                    services.ConfigureOpenTelemetryTracerProvider(b => b.AddProcessor(processor));
            }
        );
        var provider = services.GetRequiredService<TracerProvider>();
        bool? metricSuccess = null;
        using var listener = new MeterListener();
        listener.InstrumentPublished = (instrument, listener) =>
        {
            if (instrument.Name == "RequestDurationStandardMetric")
                listener.EnableMeasurementEvents(instrument);
        };
        listener.SetMeasurementEventCallback<double>(
            (instrument, value, tags, state) =>
            {
                foreach (var tag in tags)
                    if (tag.Key == "Request.Success")
                        metricSuccess = (bool)tag.Value!;
            }
        );
        listener.Start();
        using var source = new ActivitySource(Source);
        using (var activity = source.StartActivity("contract-request", ActivityKind.Server))
        {
            activity!.SetTag("http.request.method", "GET");
            activity.SetTag("url.scheme", "https");
            activity.SetTag("server.address", "contract.example");
            activity.SetTag("url.path", "/contract");
            activity.SetTag("http.response.status_code", 200);
        }

        Assert.Equal(false, metricSuccess);
        Assert.False(processor.SawAzureMetricExtraction);
        Assert.True(provider.ForceFlush());
        var request = Assert.Single(capture.Data("RequestData"));
        Assert.Equal("500", request.GetProperty("responseCode").GetString());
        Assert.False(request.GetProperty("success").GetBoolean());
        Assert.Equal("owner-value", request.GetProperty("properties").GetProperty("owner-property").GetString());
    }

    [Theory]
    [InlineData("microsoft.fixed_percentage", "0")]
    [InlineData("microsoft.rate_limited", "0")]
    public async Task Supported_Environment_Sampler_Overrides_Altinn_Defaults(string sampler, string argument)
    {
        SetEnvironment("OTEL_TRACES_SAMPLER", sampler);
        SetEnvironment("OTEL_TRACES_SAMPLER_ARG", argument);
        using var capture = new CaptureTransport();
        await using var services = BuildServices(capture);
        var provider = services.GetRequiredService<TracerProvider>();
        using var source = new ActivitySource(Source);
        using (var activity = source.StartActivity("contract-request", ActivityKind.Server))
            Assert.False(activity?.Recorded ?? false);
        Assert.True(provider.ForceFlush());
        Assert.Empty(capture.Data("RequestData"));
    }

    [Theory]
    [InlineData("APPLICATIONINSIGHTS_CONNECTION_STRING")]
    [InlineData("AzureMonitorExporter__ConnectionString")]
    public async Task Platform_Connection_String_Overrides_Azure_Settings_For_All_Three_Signals(string variable)
    {
        SetEnvironment(variable, $"InstrumentationKey={Guid.NewGuid()}");
        using var capture = new CaptureTransport();
        await using var services = BuildServices(capture);

        AssertAllSignalsExportTo(services, capture, Endpoint);
    }

    [Theory]
    [InlineData(false, false)]
    [InlineData(false, true)]
    [InlineData(true, false)]
    [InlineData(true, true)]
    public async Task Owner_Connection_String_Precedence_Applies_To_All_Three_Signals(
        bool configureAfter,
        bool postConfigure
    )
    {
        using var capture = new CaptureTransport();
        const string ownerEndpoint = "https://northeurope-3.in.applicationinsights.azure.com/";
        var ownerConnectionString = $"InstrumentationKey={Guid.NewGuid()};IngestionEndpoint={ownerEndpoint}";
        Action<IServiceCollection> configure = services =>
        {
            if (postConfigure)
                services.PostConfigure<AzureMonitorExporterOptions>(options =>
                    options.ConnectionString = ownerConnectionString
                );
            else
                services.Configure<AzureMonitorExporterOptions>(options =>
                    options.ConnectionString = ownerConnectionString
                );
        };
        await using var services = BuildServices(
            capture,
            configureAfter ? null : configure,
            configureAfter ? configure : null
        );

        // Configure before AddAltinnAppServices runs before Altinn applies the platform connection string.
        AssertAllSignalsExportTo(services, capture, configureAfter || postConfigure ? ownerEndpoint : Endpoint);
    }

    private static void AssertAllSignalsExportTo(ServiceProvider services, CaptureTransport capture, string endpoint)
    {
        var traces = services.GetRequiredService<TracerProvider>();
        var metrics = services.GetRequiredService<MeterProvider>();
        using var source = new ActivitySource(Source);
        using (source.StartActivity("contract-request", ActivityKind.Server)) { }
        using var meter = new Meter(Source);
        meter.CreateCounter<int>("contract-counter").Add(1);
        services.GetRequiredService<ILoggerFactory>().CreateLogger(Source).LogError("contract-error");

        Assert.True(traces.ForceFlush());
        Assert.True(metrics.ForceFlush());
        Assert.True(services.GetRequiredService<LoggerProvider>().ForceFlush());
        Assert.Contains(capture.Data("RequestData"), d => d.GetProperty("name").GetString() == "contract-request");
        Assert.Contains(
            capture.Data("MetricData"),
            d =>
                d.GetProperty("metrics")
                    .EnumerateArray()
                    .Any(m => m.GetProperty("name").GetString() == "contract-counter")
        );
        Assert.Contains(capture.Data("MessageData"), d => d.GetProperty("message").GetString() == "contract-error");
        Assert.All(capture.Requests, uri => Assert.Equal(new Uri(endpoint).Host, uri.Host));
    }

    private sealed class OwnerEnrichmentProcessor : OpenTelemetry.BaseProcessor<Activity>
    {
        public bool SawAzureMetricExtraction { get; private set; }

        public override void OnEnd(Activity activity)
        {
            SawAzureMetricExtraction = activity.GetTagItem("_MS.ProcessedByMetricExtractors") is not null;
            activity.SetTag("http.response.status_code", 500);
            activity.SetStatus(ActivityStatusCode.Error);
            activity.SetTag("owner-property", "owner-value");
        }
    }

    private sealed class OwnerSampler : Sampler
    {
        public int Calls { get; private set; }

        public override SamplingResult ShouldSample(in SamplingParameters samplingParameters)
        {
            Calls++;
            return new SamplingResult(SamplingDecision.Drop);
        }
    }

    private ServiceProvider BuildServices(
        CaptureTransport capture,
        Action<IServiceCollection>? before = null,
        Action<IServiceCollection>? after = null
    )
    {
        var builder = WebApplication.CreateBuilder();
        builder.Environment.EnvironmentName = "Production";
        SetEnvironment(
            "ApplicationInsights__ConnectionString",
            $"InstrumentationKey={Guid.NewGuid()};IngestionEndpoint={Endpoint}"
        );
        builder.Logging.ClearProviders();
        builder.Configuration.AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                ["AppSettings:UseOpenTelemetry"] = "true",
                ["GeneralSettings:IsTest"] = "false",
            }
        );
        builder.Services.Configure<AzureMonitorExporterOptions>(options =>
        {
            options.Transport = new HttpClientTransport(capture.Client);
            options.DisableOfflineStorage = true;
        });
        builder.Services.ConfigureOpenTelemetryTracerProvider(b => b.AddSource(Source));
        builder.Services.ConfigureOpenTelemetryMeterProvider(b => b.AddMeter(Source));
        before?.Invoke(builder.Services);
        Altinn.App.Api.Extensions.ServiceCollectionExtensions.AddAltinnAppServices(
            builder.Services,
            builder.Configuration,
            builder.Environment
        );
        after?.Invoke(builder.Services);
        return builder.Services.BuildServiceProvider();
    }

    private void SetEnvironment(string name, string? value)
    {
        _environment.TryAdd(name, Environment.GetEnvironmentVariable(name));
        Environment.SetEnvironmentVariable(name, value);
    }

    public void Dispose()
    {
        foreach (var (name, value) in _environment)
            Environment.SetEnvironmentVariable(name, value);
    }

    private sealed class CaptureTransport : HttpMessageHandler
    {
        public HttpClient Client { get; }
        public ConcurrentQueue<Uri> Requests { get; } = new();
        private readonly ConcurrentQueue<JsonElement> _envelopes = new();

        public CaptureTransport() => Client = new HttpClient(this, disposeHandler: false);

        public IEnumerable<JsonElement> Data(string type) =>
            _envelopes
                .Select(e => e.GetProperty("data"))
                .Where(d => d.GetProperty("baseType").GetString() == type)
                .Select(d => d.GetProperty("baseData"));

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            Requests.Enqueue(request.RequestUri!);
            await using var body = await request.Content!.ReadAsStreamAsync(cancellationToken);
            await using var decoded = request.Content.Headers.ContentEncoding.Contains("gzip")
                ? (Stream)new GZipStream(body, CompressionMode.Decompress)
                : body;
            using var reader = new StreamReader(decoded);
            var count = 0;
            while (await reader.ReadLineAsync(cancellationToken) is { } line)
            {
                if (string.IsNullOrWhiteSpace(line))
                    continue;
                using var document = JsonDocument.Parse(line);
                _envelopes.Enqueue(document.RootElement.Clone());
                count++;
            }
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent($"{{\"itemsReceived\":{count},\"itemsAccepted\":{count},\"errors\":[]}}"),
            };
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
                Client.Dispose();
            base.Dispose(disposing);
        }
    }
}
