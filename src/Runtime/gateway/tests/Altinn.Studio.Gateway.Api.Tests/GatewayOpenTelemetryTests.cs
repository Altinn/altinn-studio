using System.Diagnostics;
using Altinn.Studio.Common.Telemetry;
using Altinn.Studio.Gateway.Api.Endpoints.Public;
using Altinn.Studio.Gateway.Api.Hosting;
using Altinn.Studio.Gateway.Api.Telemetry;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Metadata;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OpenTelemetry;
using OpenTelemetry.Instrumentation.AspNetCore;
using OpenTelemetry.Logs;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace Altinn.Studio.Gateway.Api.Tests;

/// <summary>
/// The gateway's telemetry setup, on the shared Altinn Studio one.
/// </summary>
public sealed class GatewayOpenTelemetryTests : IDisposable
{
    private readonly WebApplication _app;

    public GatewayOpenTelemetryTests()
    {
        var builder = WebApplication.CreateSlimBuilder();
        // Nothing listens here, so the exporters give up at once.
        builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"] = "http://127.0.0.1:1";
        builder.AddOpenTelemetry();
        _app = builder.Build();
        _app.MapGroup(Registration.BasePath).MapHealthEndpoints();
    }

    public void Dispose() => ((IDisposable)_app).Dispose();

    [Theory]
    [InlineData("/health/live", false)]
    [InlineData("/health/ready", false)]
    [InlineData("/runtime/gateway/api/v1/health", false)]
    [InlineData("/runtime/gateway/api/v1/deploy/apps/my-app/staging", true)]
    [InlineData("/api/v1/flux/webhook", true)]
    public void Traces_LeaveOutHealthChecks(string path, bool traced)
    {
        var filter = _app
            .Services.GetRequiredService<IOptionsMonitor<AspNetCoreTraceInstrumentationOptions>>()
            .Get(Options.DefaultName)
            .Filter;
        var context = new DefaultHttpContext();
        context.Request.Path = path;

        Assert.NotNull(filter);
        Assert.Equal(traced, filter(context));
    }

    [Fact]
    public void PublicHealthCheck_IsLeftOutOfRequestMetrics()
    {
        var endpoint = ((IEndpointRouteBuilder)_app)
            .DataSources.SelectMany(source => source.Endpoints)
            .Single(endpoint =>
                endpoint.Metadata.GetMetadata<IEndpointNameMetadata>()?.EndpointName == "RuntimeHealth"
            );

        Assert.NotNull(endpoint.Metadata.GetMetadata<IDisableHttpMetricsMetadata>());
    }

    [Fact]
    public void Resource_HasTheProcessAndTheBuild()
    {
        var resource = _app.Services.GetRequiredService<TracerProvider>().GetResource();
        var attributes = resource.Attributes.ToDictionary(attribute => attribute.Key, attribute => attribute.Value);

        Assert.Equal(Workload.InstanceId, attributes["service.instance.id"]);
        // The project's InformationalVersion, which the image build replaces with BUILD_VERSION.
        Assert.Equal("dev", attributes["service.version"]);
    }

    [Fact]
    public void GatewaySpans_AreAlwaysKept()
    {
        _ = _app.Services.GetRequiredService<TracerProvider>();

        using var span = ServiceTelemetry.Source.StartActivity("test");

        Assert.NotNull(span);
        Assert.Equal("always", span.GetTagItem(AltinnAttributes.Sampling));
    }

    [Fact]
    public void Logs_AreExportedAtWarningAndAbove()
    {
        var rules = _app.Services.GetRequiredService<IOptions<LoggerFilterOptions>>().Value.Rules;

        Assert.Contains(
            rules,
            rule =>
                rule.ProviderName == typeof(OpenTelemetryLoggerProvider).FullName
                && rule.CategoryName is null
                && rule.LogLevel == LogLevel.Warning
        );
    }

    [Fact]
    public void RequestAttributes_ComeFromTheRouteAndTheQueryWhenTheSpanEnds()
    {
        var enrich = _app
            .Services.GetRequiredService<IOptionsMonitor<AspNetCoreTraceInstrumentationOptions>>()
            .Get(Options.DefaultName)
            .EnrichWithHttpResponse;
        using var span = new Activity("request");
        span.Start();
        var context = new DefaultHttpContext();
        context.Request.RouteValues["app"] = "My-App";
        context.Request.QueryString = new QueryString("?originEnvironment=Staging");
        // As for a request that authentication rejected: the span ends with a 401, and the endpoint never ran.
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;

        Assert.NotNull(enrich);
        enrich(span, context.Response);

        Assert.Equal("my-app", span.GetTagItem(AltinnAttributes.App));
        Assert.Equal("staging", span.GetTagItem(ServiceTelemetry.Attributes.OriginEnvironment));
    }
}
