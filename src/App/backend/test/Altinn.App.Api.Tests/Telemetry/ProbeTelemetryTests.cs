using System.Diagnostics;
using System.Globalization;
using Microsoft.Extensions.DependencyInjection;
using OpenTelemetry;
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests;

// The SDK listens to every ActivitySource and Meter in the process, so this runs alone to see only its own requests.
[CollectionDefinition(nameof(ProbeTelemetryTests), DisableParallelization = true)]
public sealed class ProbeTelemetryCollection;

[Collection(nameof(ProbeTelemetryTests))]
public class ProbeTelemetryTests : ApiTestBase
{
    public ProbeTelemetryTests(ITestOutputHelper outputHelper)
        : base(outputHelper) { }

    [Fact]
    public async Task Probes_Stay_Out_Of_Traces_And_Request_Metrics()
    {
        List<Activity> spans = [];
        List<Metric> metrics = [];
        OverrideServicesForThisTest = services =>
        {
            services.ConfigureOpenTelemetryTracerProvider(builder => builder.AddInMemoryExporter(spans));
            services.ConfigureOpenTelemetryMeterProvider(builder => builder.AddInMemoryExporter(metrics));
        };
        using var client = GetRootedClient("tdd", "contributer-restriction");

        using var probe = await client.GetAsync("/health");
        Assert.True(probe.IsSuccessStatusCode);
        using var request = await client.GetAsync("/tdd/contributer-restriction/api/v1/applicationmetadata");
        Assert.True(request.IsSuccessStatusCode);

        // The server's span and measurement end just after the client has the response.
        var deadline = DateTime.UtcNow.AddSeconds(10);
        do
        {
            await Task.Delay(50);
            Services.GetRequiredService<TracerProvider>().ForceFlush();
        } while (!spans.Exists(span => span.Kind == ActivityKind.Server) && DateTime.UtcNow < deadline);
        Services.GetRequiredService<MeterProvider>().ForceFlush();

        var server = Assert.Single(spans, span => span.Kind == ActivityKind.Server);
        Assert.Contains("applicationmetadata", server.DisplayName, StringComparison.Ordinal);

        // Every request the metric counted, by route. A probe would show up without one.
        var counted = new Dictionary<string, long>();
        foreach (var metric in metrics.Where(metric => metric.Name == "http.server.request.duration"))
        {
            foreach (var point in metric.GetMetricPoints())
            {
                string route = "(none)";
                foreach (var tag in point.Tags)
                {
                    if (tag.Key == "http.route")
                        route = Convert.ToString(tag.Value, CultureInfo.InvariantCulture) ?? route;
                }
                counted[route] = counted.GetValueOrDefault(route) + point.GetHistogramCount();
            }
        }
        var only = Assert.Single(counted);
        Assert.Contains("applicationmetadata", only.Key, StringComparison.Ordinal);
        Assert.Equal(1, only.Value);
    }
}
