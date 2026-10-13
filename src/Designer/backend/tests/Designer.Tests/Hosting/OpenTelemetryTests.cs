#nullable enable
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
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
