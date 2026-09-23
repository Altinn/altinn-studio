using System.Threading.RateLimiting;
using Altinn.Studio.Observability.Proxy.Auth;
using Altinn.Studio.Observability.Proxy.Configuration;
using Altinn.Studio.Observability.Proxy.Health;
using Altinn.Studio.Observability.Proxy.Routing;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Altinn.Studio.Observability.Proxy.Hosting;

internal static class ObservabilityProxyExtensions
{
    public static WebApplicationBuilder AddObservabilityProxy(this WebApplicationBuilder builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.Services.Configure<ObservabilityProxyOptions>(
            builder.Configuration.GetSection(ObservabilityProxyOptions.SectionName)
        );

        var proxyOptions =
            builder.Configuration.GetSection(ObservabilityProxyOptions.SectionName).Get<ObservabilityProxyOptions>()
            ?? new ObservabilityProxyOptions();

        builder.Services.TryAddSingleton(TimeProvider.System);
        builder.Services.AddSingleton<AuthTokenFile>();
        builder.Services.AddSingleton<StaticBearerTokenAuthenticator>();
        builder.Services.AddHealthChecks().AddCheck<ObservabilityReadinessHealthCheck>("observability-proxy-config");

        builder.Services.AddRateLimiter(options =>
        {
            var rateLimitingOptions = proxyOptions.RateLimiting;

            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
            {
                // Only authenticated observability traffic is limited, and per source identity.
                // StaticBearerTokenMiddleware runs before the limiter and sets the source on every
                // request it lets through to a proxy route, and a proxy route forwards nothing without
                // one, so there is no unauthenticated partition.
                if (context.Features.Get<ObservabilitySourceFeature>() is not { } observabilitySource)
                {
                    return RateLimitPartition.GetNoLimiter("non-observability");
                }

                var sourceIdentity = observabilitySource.Source.SourceIdentity;

                return RateLimitPartition.GetFixedWindowLimiter(
                    sourceIdentity,
                    _ => new FixedWindowRateLimiterOptions
                    {
                        AutoReplenishment = true,
                        PermitLimit = Math.Max(1, rateLimitingOptions.PermitLimitFor(sourceIdentity)),
                        QueueLimit = Math.Max(0, rateLimitingOptions.QueueLimit),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        Window = TimeSpan.FromSeconds(Math.Max(1, rateLimitingOptions.WindowSeconds)),
                    }
                );
            });
        });

        builder
            .Services.AddReverseProxy()
            .LoadFromMemory(
                ObservabilityReverseProxyConfig.CreateRoutes(proxyOptions),
                ObservabilityReverseProxyConfig.CreateClusters(proxyOptions)
            )
            .AddTransforms(ObservabilityRequestTransforms.Apply)
            // The forwarding handler would otherwise add a traceparent after the transforms have
            // run. Nothing behind the proxy records traces, and nothing here exports them.
            .ConfigureHttpClient((_, handler) => handler.ActivityHeadersPropagator = null);

        return builder;
    }

    public static WebApplication UseObservabilityProxy(this WebApplication app)
    {
        ArgumentNullException.ThrowIfNull(app);

        // Plain text, not JSON: the image is published ahead of time, where serializing an
        // anonymous type throws and the liveness probe then fails the container.
        app.MapGet("/health/live", () => Results.Text("Healthy"));
        app.MapHealthChecks("/health/ready", new HealthCheckOptions());

        // Routing first, so authorization can read the matched route; authentication before the
        // limiter, so the limiter can partition by the identity it established.
        app.UseRouting();
        app.UseMiddleware<StaticBearerTokenMiddleware>();
        app.UseRateLimiter();

        app.MapReverseProxy(proxyPipeline =>
        {
            // StaticBearerTokenMiddleware is the authority. This only makes sure nothing is ever
            // forwarded without it, whatever the order above becomes.
            proxyPipeline.Use(
                (context, next) =>
                {
                    if (context.Features.Get<ObservabilitySourceFeature>() is not null)
                    {
                        return next(context);
                    }

                    context
                        .RequestServices.GetRequiredService<ILoggerFactory>()
                        .CreateLogger(typeof(ObservabilityProxyExtensions))
                        .LogError(
                            "Refused to forward an observability request that was not authorized. Method={Method} Path={Path}",
                            context.Request.Method,
                            context.Request.Path
                        );
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    return Task.CompletedTask;
                }
            );
            proxyPipeline.UseSessionAffinity();
            proxyPipeline.UseLoadBalancing();
            proxyPipeline.UsePassiveHealthChecks();
        });

        return app;
    }
}
