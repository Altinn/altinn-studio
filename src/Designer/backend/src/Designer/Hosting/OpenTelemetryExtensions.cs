using System.Collections.Generic;
using Altinn.Studio.Designer.Telemetry;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using OpenTelemetry.Instrumentation.Http;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace Altinn.Studio.Designer.Hosting;

internal static class TelemetryExtensions
{
    // The image's build, the commit the deploy workflow builds from. Local builds have none.
    private const string ServiceVersionSetting = "DESIGNER_VERSION";
    private const string LocalServiceVersion = "dev";

    public static WebApplicationBuilder AddOpenTelemetry(this WebApplicationBuilder builder)
    {
        string serviceVersion = builder.Configuration[ServiceVersionSetting] is { Length: > 0 } version
            ? version
            : LocalServiceVersion;

        builder
            .Services.AddOpenTelemetry()
            .ConfigureResource(resource =>
                resource.AddAttributes([
                    new KeyValuePair<string, object>(ServiceTelemetry.Attributes.ServiceVersion, serviceVersion),
                ])
            )
            .WithTracing(tracing =>
            {
                // TODO: record failures as error.type on the span and an ERROR log instead of exception
                // span events, and turn off RecordException (https://github.com/Altinn/altinn-studio/issues/21073).
                tracing
                    .AddSource(ServiceTelemetry.Source.Name)
                    .AddAspNetCoreInstrumentation(options =>
                    {
                        options.RecordException = true;
                        options.Filter = ctx => !ctx.Request.Path.StartsWithSegments("/health");
                        options.EnrichWithHttpResponse = static (activity, response) =>
                        {
                            var routeValues = response.HttpContext.Request.RouteValues;
                            if (
                                TryResolveRouteValue(routeValues, "org", out var org)
                                || TryResolveRouteValue(routeValues, "orgName", out org)
                            )
                            {
                                activity.SetTag("org", org);
                            }

                            if (
                                TryResolveRouteValue(routeValues, "app", out var app)
                                || TryResolveRouteValue(routeValues, "repo", out app)
                                || TryResolveRouteValue(routeValues, "repository", out app)
                            )
                            {
                                activity.SetTag("app", app);
                            }
                        };
                    })
                    .AddHttpClientInstrumentation(ConfigureHttpClientTracing)
                    .AddEntityFrameworkCoreInstrumentation()
                    .AddQuartzInstrumentation(options => options.RecordException = true)
                    .AddOtlpExporter();
            })
            .WithMetrics(metrics =>
            {
                metrics
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation()
                    .AddRuntimeInstrumentation()
                    .AddOtlpExporter();
            })
            .WithLogging(
                logging => logging.AddOtlpExporter(),
                options =>
                {
                    options.IncludeFormattedMessage = true;
                    options.IncludeScopes = true;
                }
            );

        // The pipeline drops log records below WARN, so they aren't exported. The console still gets them.
        builder.Logging.AddFilter<OpenTelemetryLoggerProvider>(category: null, LogLevel.Warning);

        return builder;
    }

    internal static void ConfigureHttpClientTracing(HttpClientTraceInstrumentationOptions options)
    {
        options.RecordException = true;
        options.EnrichWithHttpRequestMessage = SecretUrlPath.Redact;
    }

    private static bool TryResolveRouteValue(RouteValueDictionary routeValues, string key, out string value)
    {
        value = string.Empty;
        return routeValues.TryGetValue(key, out var rawValue)
            && rawValue?.ToString() is { Length: > 0 } parsedValue
            && (value = parsedValue) != null;
    }
}
