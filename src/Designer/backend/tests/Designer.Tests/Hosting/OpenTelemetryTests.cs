#nullable enable
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Filters.IO;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Telemetry;
using Altinn.Studio.Designer.ViewModels.Request;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Rest.TransientFaultHandling;
using Moq;
using OpenTelemetry;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Xunit;

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
            if (_environmentsException is not null)
            {
                var environmentsService = new Mock<IEnvironmentsService>();
                environmentsService.Setup(service => service.GetEnvironments()).ThrowsAsync(_environmentsException);
                services.AddSingleton(environmentsService.Object);
            }
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
