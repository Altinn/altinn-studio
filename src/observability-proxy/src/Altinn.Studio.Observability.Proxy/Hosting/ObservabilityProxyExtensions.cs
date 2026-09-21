using System.Threading.RateLimiting;
using Altinn.Studio.Observability.Proxy.Auth;
using Altinn.Studio.Observability.Proxy.Configuration;
using Altinn.Studio.Observability.Proxy.Health;
using Altinn.Studio.Observability.Proxy.Routing;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Yarp.ReverseProxy.Transforms;

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
            var pathPrefix = ObservabilityPaths.NormalizePrefix(proxyOptions.PathPrefix);

            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
            {
                if (!context.Request.Path.StartsWithSegments(pathPrefix))
                {
                    return RateLimitPartition.GetNoLimiter("non-observability");
                }

                var sourceIdentity =
                    context.Features.Get<ObservabilitySourceFeature>()?.Source.SourceIdentity ?? "anonymous";

                return RateLimitPartition.GetFixedWindowLimiter(
                    sourceIdentity,
                    _ => new FixedWindowRateLimiterOptions
                    {
                        AutoReplenishment = true,
                        PermitLimit = Math.Max(1, rateLimitingOptions.PermitLimit),
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
            .AddTransforms(transformContext =>
            {
                transformContext.AddRequestTransform(requestContext =>
                {
                    requestContext.ProxyRequest.Headers.Remove("Authorization");

                    var sourceIdentity = requestContext
                        .HttpContext.Features.Get<ObservabilitySourceFeature>()
                        ?.Source.SourceIdentity;
                    if (!string.IsNullOrWhiteSpace(sourceIdentity))
                    {
                        requestContext.ProxyRequest.Headers.Remove("X-Observability-Source");
                        requestContext.ProxyRequest.Headers.TryAddWithoutValidation(
                            "X-Observability-Source",
                            sourceIdentity
                        );
                    }

                    return ValueTask.CompletedTask;
                });
            });

        return builder;
    }

    public static WebApplication UseObservabilityProxy(this WebApplication app)
    {
        ArgumentNullException.ThrowIfNull(app);

        // Plain text, not JSON: the image is published ahead of time, where serializing an
        // anonymous type throws and the liveness probe then fails the container.
        app.MapGet("/health/live", () => Results.Text("Healthy"));
        app.MapHealthChecks("/health/ready", new HealthCheckOptions());

        app.UseMiddleware<StaticBearerTokenMiddleware>();
        app.UseRateLimiter();

        app.MapReverseProxy();

        return app;
    }
}
