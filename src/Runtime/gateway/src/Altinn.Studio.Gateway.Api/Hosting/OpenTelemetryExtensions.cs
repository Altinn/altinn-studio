using System.Diagnostics;
using Altinn.Studio.Common.Telemetry;
using Altinn.Studio.Gateway.Api.Endpoints.Public;
using Altinn.Studio.Gateway.Api.Telemetry;
using OpenTelemetry;
using OpenTelemetry.Instrumentation.AspNetCore;
using OpenTelemetry.Logs;
using OpenTelemetry.Trace;

namespace Altinn.Studio.Gateway.Api.Hosting;

internal static class OpenTelemetryExtensions
{
    public static WebApplicationBuilder AddOpenTelemetry(this WebApplicationBuilder builder)
    {
        builder.Services.Configure<AspNetCoreTraceInstrumentationOptions>(options =>
        {
            options.Filter = static context => !HealthEndpoints.IsHealthCheck(context.Request);
            options.EnrichWithHttpResponse = RequestTelemetry.EnrichWithHttpResponse;
        });
        builder.Services.Configure<OpenTelemetryLoggerOptions>(options => options.IncludeScopes = true);

        builder
            .Services.AddAltinnStudioOpenTelemetry(builder.Configuration, typeof(OpenTelemetryExtensions).Assembly)
            .WithTracing(tracing =>
                tracing.AddSource(ServiceTelemetry.Source.Name).AddProcessor(new AlwaysSampleProcessor())
            )
            .WithMetrics(metrics => metrics.AddMeter(ServiceTelemetry.Name));

        return builder;
    }

    /// <summary>
    /// Keeps every trace the gateway takes part in. Its callers are Designer, Flux and Grafana, at a low rate, and a
    /// trace often continues one of Designer's, such as a deploy, which this cluster's sampler can't see.
    /// </summary>
    private sealed class AlwaysSampleProcessor : BaseProcessor<Activity>
    {
        public override void OnStart(Activity data) => data.SetAlwaysSample();
    }
}
