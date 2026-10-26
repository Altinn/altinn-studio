#nullable enable
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Filters.IO;
using Altinn.Studio.Designer.Hosting;
using Altinn.Studio.Designer.Models.ContactPoints;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Telemetry;
using Altinn.Studio.Designer.ViewModels.Request;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Rest.TransientFaultHandling;
using Moq;
using OpenTelemetry;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;
using Xunit;
using AltinnEnvironment = Altinn.Studio.Designer.Models.AltinnEnvironment;
using NotificationKind = Altinn.Studio.Designer.Models.NotificationKind;

namespace Designer.Tests.Hosting;

public class OpenTelemetryTests
    : DesignerEndpointsTestsBase<OpenTelemetryTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string ServiceVersion = "0123456789";

    private readonly List<Activity> _spans = [];
    private readonly List<Metric> _metrics = [];
    private readonly List<LogRecord> _logs = [];
    private IServiceProvider? _services;
    private Exception? _environmentsException;
    private Exception? _releasesException;

    protected override bool EnableOpenTelemetry => true;

    public OpenTelemetryTests(WebApplicationFactory<Program> factory)
        : base(factory)
    {
        JsonConfigOverrides.Add($$"""{ "DESIGNER_VERSION": "{{ServiceVersion}}" }""");
        ConfigureTestServicesForSpecificTest = services =>
        {
            services.ConfigureOpenTelemetryTracerProvider(tracing => tracing.AddInMemoryExporter(_spans));
            services.ConfigureOpenTelemetryMeterProvider(metrics => metrics.AddInMemoryExporter(_metrics));
            services.ConfigureOpenTelemetryLoggerProvider(logging => logging.AddInMemoryExporter(_logs));
            services.AddSingleton<IStartupFilter>(new ServicesCapture(services => _services = services));
            var environmentsService = new Mock<IEnvironmentsService>();
            if (_environmentsException is null)
            {
                environmentsService.Setup(service => service.GetEnvironments()).ReturnsAsync([]);
            }
            else
            {
                environmentsService.Setup(service => service.GetEnvironments()).ThrowsAsync(_environmentsException);
            }
            services.AddSingleton(environmentsService.Object);
            if (_releasesException is not null)
            {
                var releaseService = new Mock<IReleaseService>();
                releaseService
                    .Setup(service =>
                        service.GetAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DocumentQueryModel>())
                    )
                    .ThrowsAsync(_releasesException);
                services.AddSingleton(releaseService.Object);
            }
        };
    }

    [Fact]
    public async Task Resource_HasServiceVersionFromBuild()
    {
        await StartAsync();

        Resource resource = Services.GetRequiredService<TracerProvider>().GetResource();

        Assert.Contains(
            resource.Attributes,
            attribute => attribute is { Key: "service.version", Value: ServiceVersion }
        );
    }

    [Fact]
    public async Task Resource_HasSameProcessInstanceIdForAllSignals()
    {
        await StartAsync();

        Resource traces = Services.GetRequiredService<TracerProvider>().GetResource();
        Resource metrics = Services.GetRequiredService<MeterProvider>().GetResource();
        Resource logs = Assert
            .Single(Services.GetServices<ILoggerProvider>().OfType<OpenTelemetryLoggerProvider>())
            .GetResource();
        foreach (Resource resource in new[] { traces, metrics, logs })
        {
            Assert.Contains(
                resource.Attributes,
                attribute =>
                    attribute is { Key: "service.instance.id" }
                    && Equals(attribute.Value, InstanceTelemetry.ServiceInstanceId)
            );
        }
        Assert.True(Guid.TryParse(InstanceTelemetry.ServiceInstanceId, out _));
    }

    [Fact]
    public async Task Resource_AllowsConfiguredInstanceId()
    {
        JsonConfigOverrides.Add(
            """{ "OTEL_RESOURCE_ATTRIBUTES": "service.instance.id=configured-instance,service.version=overridden" }"""
        );
        await StartAsync();

        Resource resource = Services.GetRequiredService<MeterProvider>().GetResource();

        Assert.Contains(
            resource.Attributes,
            attribute => attribute is { Key: "service.instance.id", Value: "configured-instance" }
        );
        Assert.Contains(
            resource.Attributes,
            attribute => attribute is { Key: "service.version", Value: ServiceVersion }
        );
    }

    [Fact]
    public async Task InstanceStartTime_ExportsOneGaugePerCollectionWithTheProcessStartTime()
    {
        await StartAsync();
        using Process process = Process.GetCurrentProcess();
        double expectedStartTime =
            new DateTimeOffset(process.StartTime.ToUniversalTime()).ToUnixTimeMilliseconds() / 1000d;
        MeterProvider provider = Services.GetRequiredService<MeterProvider>();

        for (int collection = 0; collection < 2; collection++)
        {
            _metrics.Clear();
            provider.ForceFlush();

            Metric metric = Assert.Single(_metrics, metric => metric.Name == "altinn.workload.start_time");
            Assert.Equal("s", metric.Unit);
            Assert.Equal(MetricType.DoubleGauge, metric.MetricType);
            MetricPoint point = Assert.Single(MetricPoints("altinn.workload.start_time"));
            Assert.Equal(expectedStartTime, point.GetGaugeLastValueDouble());
            Assert.Equal(0, point.Tags.Count);
        }
    }

    [Fact]
    public async Task InstanceStartTime_KeepsItsNameInTheOtlpPayload()
    {
        using WireMockServer collector = WireMockServer.Start();
        collector
            .Given(Request.Create().WithPath("/v1/metrics").UsingPost())
            .RespondWith(Response.Create().WithStatusCode(200));
        JsonConfigOverrides.Add(
            $$"""
            {
                "OTEL_EXPORTER_OTLP_ENDPOINT": "{{collector.Url}}",
                "OTEL_EXPORTER_OTLP_PROTOCOL": "http/protobuf"
            }
            """
        );
        await StartAsync();

        Assert.True(Services.GetRequiredService<MeterProvider>().ForceFlush());

        var request = Assert
            .Single(collector.LogEntries, entry => entry.RequestMessage?.Path == "/v1/metrics")
            .RequestMessage!;
        Assert.Equal("application/x-protobuf", Assert.Single(request.Headers!["Content-Type"]));
        Assert.Contains("altinn.workload.start_time", Encoding.UTF8.GetString(request.BodyData!.BodyAsBytes!));
    }

    [Fact]
    public async Task NotificationMetrics_AreExportedAsCumulativeCounters()
    {
        await StartAsync();
        NotificationMetrics notificationMetrics = Services.GetRequiredService<NotificationMetrics>();
        notificationMetrics.RecordPeriodicReport(ReportFrequency.Weekly, "ttd", "tt02", error: null);
        notificationMetrics.RecordInternalDelivery(
            NotificationKind.Alert,
            "ttd",
            AltinnEnvironment.FromName("tt02"),
            error: null
        );

        _metrics.Clear();
        Services.GetRequiredService<MeterProvider>().ForceFlush();

        foreach (
            string name in new[]
            {
                NotificationMetrics.PeriodicReportsMetricName,
                NotificationMetrics.DeliveriesMetricName,
            }
        )
        {
            Metric metric = Assert.Single(_metrics, metric => metric.Name == name);
            Assert.Equal(MetricType.LongSum, metric.MetricType);
            Assert.Equal(AggregationTemporality.Cumulative, metric.Temporality);
            Assert.Equal(1, Assert.Single(MetricPoints(name)).GetSumLong());
        }
    }

    [Fact]
    public async Task Logs_ExportOnlyWarningAndAbove()
    {
        await StartAsync();
        ILogger logger = Services.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(OpenTelemetryTests));

        logger.LogInformation("Information record");
        logger.LogWarning("Warning record");
        logger.LogError("Error record");

        Assert.DoesNotContain(_logs, record => record.LogLevel < LogLevel.Warning);
        Assert.Contains(_logs, record => record.Body == "Warning record");
        Assert.Contains(_logs, record => record.Body == "Error record");
    }

    [Fact]
    public async Task HealthChecks_AreLeftOutOfTracesAndRequestMetrics()
    {
        await StartAsync();

        using HttpResponseMessage healthResponse = await HttpClient.GetAsync("/health");
        healthResponse.EnsureSuccessStatusCode();
        using HttpResponseMessage otherResponse = await HttpClient.GetAsync("/designer/api/does-not-exist");
        Services.GetRequiredService<MeterProvider>().ForceFlush();

        List<MetricPoint> requestPoints = MetricPoints("http.server.request.duration");
        Assert.NotEmpty(requestPoints);
        Assert.DoesNotContain(requestPoints, point => Tag(point, "http.route") == "/health");
        Assert.DoesNotContain(_spans, span => span.GetTagItem("url.path") as string == "/health");
    }

    [Fact]
    public async Task ExceptionHandledByFilter_IsRecordedOnRootSpanWithoutErrorLog()
    {
        _environmentsException = new FileNotFoundException("missing.json");

        using HttpResponseMessage response = await HttpClient.GetAsync(EnvironmentsPath);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Activity rootSpan = RootSpan(EnvironmentsPath);
        Assert.Equal(
            typeof(FileNotFoundException).FullName,
            rootSpan.GetTagItem(ServiceTelemetry.Attributes.Error.ExceptionType)
        );
        Assert.Equal(IoErrorCodes.ResourceNotFound, rootSpan.GetTagItem(ServiceTelemetry.Attributes.Error.Code));
        Assert.DoesNotContain(_logs, record => record.LogLevel >= LogLevel.Error);
    }

    [Fact]
    public async Task ExceptionHandledAsClientError_IsRecordedOnRootSpanWithoutErrorLog()
    {
        _environmentsException = new HttpRequestWithStatusException("Not Found")
        {
            StatusCode = HttpStatusCode.NotFound,
        };

        using HttpResponseMessage response = await HttpClient.GetAsync(EnvironmentsPath);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Activity rootSpan = RootSpan(EnvironmentsPath);
        Assert.Equal(
            typeof(HttpRequestWithStatusException).FullName,
            rootSpan.GetTagItem(ServiceTelemetry.Attributes.Error.ExceptionType)
        );
        Assert.DoesNotContain(_logs, record => record.LogLevel >= LogLevel.Error);
    }

    [Fact]
    public async Task UnhandledException_IsLoggedAsError()
    {
        _environmentsException = new InvalidOperationException("Unexpected failure");

        using HttpResponseMessage response = await HttpClient.GetAsync(EnvironmentsPath);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        LogRecord record = Assert.Single(_logs, record => record.LogLevel == LogLevel.Error);
        Assert.IsType<InvalidOperationException>(record.Exception);
        Assert.Null(RootSpan(EnvironmentsPath).GetTagItem(ServiceTelemetry.Attributes.Error.ExceptionType));
    }

    [Fact]
    public async Task UnhandledException_KeepsDomainAttributesOnRootSpan()
    {
        _releasesException = new InvalidOperationException("Unexpected failure");
        const string ReleasesPath = "/designer/api/ttd/my-app/releases";

        using HttpResponseMessage response = await HttpClient.GetAsync(ReleasesPath);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Activity rootSpan = RootSpan(ReleasesPath);
        Assert.Equal("ttd", rootSpan.GetTagItem(ServiceTelemetry.Attributes.ServiceOwner));
        Assert.Equal("my-app", rootSpan.GetTagItem(ServiceTelemetry.Attributes.App));
    }

    [Fact]
    public async Task RequestSpansAndMetrics_UseRouteWithoutConstraints()
    {
        await StartAsync();

        using HttpResponseMessage response = await HttpClient.GetAsync("/designer/api/ttd/my-app/validation");
        Services.GetRequiredService<MeterProvider>().ForceFlush();

        const string Route = "/designer/api/{org}/{app}/validation";
        Activity rootSpan = RootSpan("/designer/api/ttd/my-app/validation");
        Assert.Equal($"GET {Route}", rootSpan.DisplayName);
        Assert.Equal(Route, rootSpan.GetTagItem("http.route"));
        Assert.Contains(MetricPoints("http.server.request.duration"), point => Tag(point, "http.route") == Route);
    }

    [Fact]
    public async Task RouteHeader_IsRoute()
    {
        using HttpResponseMessage response = await HttpClient.GetAsync(EnvironmentsPath);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(EnvironmentsPath, RouteHeader(response));
    }

    [Fact]
    public async Task RouteHeader_IsRouteWithoutConstraints()
    {
        using HttpResponseMessage response = await HttpClient.GetAsync("/designer/api/ttd/hvem-er-hvem/validation");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("/designer/api/{org}/{app}/validation", RouteHeader(response));
    }

    [Fact]
    public async Task RouteHeader_IsKeptOnExceptionHandledByFilter()
    {
        _environmentsException = new FileNotFoundException("missing.json");

        using HttpResponseMessage response = await HttpClient.GetAsync(EnvironmentsPath);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(EnvironmentsPath, RouteHeader(response));
    }

    [Fact]
    public async Task RouteHeader_IsKeptOnUnhandledException()
    {
        _releasesException = new InvalidOperationException("Unexpected failure");

        using HttpResponseMessage response = await HttpClient.GetAsync("/designer/api/ttd/my-app/releases");

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("/designer/api/{org}/{app}/releases", RouteHeader(response));
    }

    [Fact]
    public async Task RouteHeader_IsLeftOutWithoutRoute()
    {
        using HttpResponseMessage response = await HttpClient.GetAsync("/designer/api/does-not-exist");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.False(response.Headers.Contains(TelemetryRoute.ResponseHeader));
    }

    [Fact]
    public async Task HubConnections_AreLeftOutOfTracesAndRequestMetrics()
    {
        await StartAsync();
        using HttpResponseMessage failedAttempt = await HttpClient.GetAsync("/hubs/preview?id=unknown");

        // The SignalR client disposes the test server's handler when it stops, so this comes last.
        await using HubConnection connection = new HubConnectionBuilder()
            .WithUrl("ws://localhost/hubs/preview", options => options.HttpMessageHandlerFactory = _ => Handler())
            .Build();
        await connection.StartAsync();
        string? connectionId = connection.ConnectionId;
        await connection.InvokeAsync("SendMessage", "reload-layouts");
        await connection.StopAsync();
        Services.GetRequiredService<MeterProvider>().ForceFlush();

        foreach (string method in new[] { "OnConnectedAsync", "SendMessage", "OnDisconnectedAsync" })
        {
            Activity span = await SingleSpanAsync($"Altinn.Studio.Designer.Hubs.Preview.PreviewHub/{method}");
            Assert.Equal(default, span.ParentSpanId);
            Assert.Equal("testUser", span.GetTagItem(ServiceTelemetry.Attributes.EndUserId));
            Assert.Equal(connectionId, span.GetTagItem(ServiceTelemetry.Attributes.SignalR.ConnectionId));
        }
        Assert.Contains(_spans, span => span.GetTagItem("url.path") as string == "/hubs/preview/negotiate");
        Assert.DoesNotContain(_spans, span => span.GetTagItem("url.path") as string == "/hubs/preview");

        List<MetricPoint> requestPoints = MetricPoints("http.server.request.duration");
        Assert.Contains(requestPoints, point => Tag(point, "http.route") == "/hubs/preview/negotiate");
        Assert.DoesNotContain(
            requestPoints,
            point => Tag(point, "http.route") == "/hubs/preview" && Tag(point, "http.response.status_code") != "404"
        );
        Assert.Contains(
            requestPoints,
            point => Tag(point, "http.route") == "/hubs/preview" && Tag(point, "http.response.status_code") == "404"
        );
    }

    // A span is exported when it ends, which can be just after the hub call's response.
    private async Task<Activity> SingleSpanAsync(string displayName)
    {
        for (int attempt = 0; attempt < 50 && !_spans.Exists(span => span.DisplayName == displayName); attempt++)
        {
            await Task.Delay(100);
        }
        return Assert.Single(_spans, span => span.DisplayName == displayName);
    }

    // The test server's handler, which the SignalR client needs to reach the in-memory server.
    private HttpMessageHandler Handler() =>
        (HttpMessageHandler)
            typeof(HttpMessageInvoker)
                .GetField("_handler", BindingFlags.NonPublic | BindingFlags.Instance)!
                .GetValue(HttpClient)!;

    private const string EnvironmentsPath = "/designer/api/environments";

    private Activity RootSpan(string path) =>
        Assert.Single(
            _spans,
            span => span.Kind == ActivityKind.Server && span.GetTagItem("url.path") as string == path
        );

    private IServiceProvider Services =>
        _services ?? throw new InvalidOperationException("The test server has not started.");

    // The first request starts the test server.
    private async Task StartAsync()
    {
        using HttpResponseMessage _ = await HttpClient.GetAsync("/designer/api/start");
    }

    private static string? RouteHeader(HttpResponseMessage response) =>
        response.Headers.TryGetValues(TelemetryRoute.ResponseHeader, out IEnumerable<string>? values)
            ? Assert.Single(values)
            : null;

    private List<MetricPoint> MetricPoints(string name)
    {
        var points = new List<MetricPoint>();
        foreach (Metric metric in _metrics.Where(metric => metric.Name == name))
        {
            foreach (ref readonly MetricPoint point in metric.GetMetricPoints())
            {
                points.Add(point);
            }
        }
        return points;
    }

    private static string? Tag(MetricPoint point, string key)
    {
        foreach (KeyValuePair<string, object?> tag in point.Tags)
        {
            if (tag.Key == key)
            {
                return tag.Value?.ToString();
            }
        }
        return null;
    }

    private sealed class ServicesCapture(Action<IServiceProvider> capture) : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) =>
            app =>
            {
                capture(app.ApplicationServices);
                next(app);
            };
    }
}
