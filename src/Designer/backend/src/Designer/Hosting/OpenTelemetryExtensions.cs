using Altinn.Studio.Common.Telemetry;
using Altinn.Studio.Designer.Hubs;
using Altinn.Studio.Designer.Telemetry;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using OpenTelemetry.Instrumentation.AspNetCore;
using OpenTelemetry.Instrumentation.Http;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;

namespace Altinn.Studio.Designer.Hosting;

internal static class TelemetryExtensions
{
    public static WebApplicationBuilder AddOpenTelemetry(this WebApplicationBuilder builder)
    {
        // TODO: record failures as error.type on the span and an ERROR log instead of exception
        // span events, and turn off RecordException (https://github.com/Altinn/altinn-studio/issues/21073).
        builder.Services.Configure<AspNetCoreTraceInstrumentationOptions>(options =>
        {
            options.RecordException = true;
            options.Filter = static ctx => !HubsEndpointExtensions.IsHubConnection(ctx.Request);
            options.EnrichWithHttpResponse = RootSpan.Enrich;
        });
        builder.Services.Configure<HttpClientTraceInstrumentationOptions>(ConfigureHttpClientTracing);
        builder.Services.Configure<OpenTelemetryLoggerOptions>(options => options.IncludeScopes = true);

        builder
            .Services.AddAltinnStudioOpenTelemetry(builder.Configuration, typeof(TelemetryExtensions).Assembly)
            .WithTracing(tracing =>
                tracing
                    .AddSource(ServiceTelemetry.Source.Name)
                    .AddEntityFrameworkCoreInstrumentation()
                    .AddQuartzInstrumentation(options =>
                    {
                        options.RecordException = true;
                        options.Enrich = RootSpan.EnrichJobRun;
                    })
            )
            .WithMetrics(metrics => metrics.AddMeter(ServiceTelemetry.MeterName));

        return builder;
    }

    internal static void ConfigureHttpClientTracing(HttpClientTraceInstrumentationOptions options)
    {
        options.RecordException = true;
        options.EnrichWithHttpRequestMessage = SecretUrlPath.Redact;
    }
}
