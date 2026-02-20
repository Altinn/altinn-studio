using Altinn.Studio.Designer.Telemetry;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;

namespace Altinn.Studio.Designer.Hosting;

internal static class TelemetryExtensions
{
    public static WebApplicationBuilder AddOpenTelemetry(this WebApplicationBuilder builder)
    {
        builder
            .Services.AddOpenTelemetry()
            .WithTracing(tracing =>
            {
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
                    .AddHttpClientInstrumentation(options => options.RecordException = true)
                    .AddEntityFrameworkCoreInstrumentation()
                    .AddQuartzInstrumentation(options => options.RecordException = true)
                    .AddRedisInstrumentation()
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

        return builder;
    }

    private static bool TryResolveRouteValue(RouteValueDictionary routeValues, string key, out string value)
    {
        value = string.Empty;
        return routeValues.TryGetValue(key, out var rawValue)
            && rawValue?.ToString() is { Length: > 0 } parsedValue
            && (value = parsedValue) != null;
    }
}
