using Altinn.Studio.Common;
using Altinn.Studio.Common.Telemetry;
using Altinn.Studio.Preview.Apps;
using Altinn.Studio.Preview.Configuration;
using Altinn.Studio.Preview.Files;
using Altinn.Studio.Preview.Sessions;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using OpenTelemetry.Instrumentation.AspNetCore;
using StackExchange.Redis;

namespace Altinn.Studio.Preview.Hosting;

internal static class PreviewHostingExtensions
{
    private const string ServiceName = "preview";

    /// <summary>The <c>url.path</c> attribute of the ASP.NET Core instrumentation's spans.</summary>
    private const string UrlPathAttribute = "url.path";

    /// <summary>The tag of the health checks that decide whether a pod gets requests.</summary>
    private const string ReadyTag = "ready";

    public static WebApplicationBuilder AddPreview(this WebApplicationBuilder builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ConfigureKestrelPorts(publicPort: PreviewPorts.Public, internalPort: PreviewPorts.Internal);
        // The container image's default port, which would only make Kestrel warn that it is ignored.
        builder.WebHost.UseSetting(WebHostDefaults.HttpPortsKey, string.Empty);
        builder.Services.AddGracefulShutdown(
            builder.Environment,
            endpointDrainDelay: TimeSpan.FromSeconds(5),
            applicationShutdownTimeout: TimeSpan.FromSeconds(20)
        );

        builder
            .Services.AddOptions<PreviewOptions>()
            .BindConfiguration(PreviewOptions.SectionName)
            .ValidateDataAnnotations()
            .Validate(
                options =>
                    !string.IsNullOrEmpty(options.RepositoryRoot)
                    && AppFolder.CanOpenRepositoryRoot(options.RepositoryRoot),
                $"{PreviewOptions.SectionName}:{nameof(PreviewOptions.RepositoryRoot)} must be a directory the service can open."
            )
            .ValidateOnStart();

        builder.Services.TryAddSingleton(TimeProvider.System);
        builder.Services.AddSingleton<IConnectionMultiplexer>(services =>
        {
            var redis = ConfigurationOptions.Parse(
                services.GetRequiredService<IOptions<PreviewOptions>>().Value.RedisConnectionString
            );
            // The service starts without its Redis and connects once Redis answers. Until then its pods aren't ready.
            redis.AbortOnConnectFail = false;
            return ConnectionMultiplexer.Connect(redis);
        });
        builder.Services.AddSingleton<ISessionStore, SessionStore>();

        builder.Services.AddProblemDetails();
        builder
            .Services.AddHealthChecks()
            .AddCheck<SessionStoreHealthCheck>(
                "session-store",
                tags: [ReadyTag],
                // Below the readiness probe's timeout, so the probe gets an answer.
                timeout: TimeSpan.FromSeconds(2)
            );
        builder.AddPreviewTelemetry();

        return builder;
    }

    public static WebApplication UsePreview(this WebApplication app)
    {
        ArgumentNullException.ThrowIfNull(app);

        app.UseWhen(
            context => context.Connection.LocalPort == PreviewPorts.Public,
            publicPort => publicPort.UseMiddleware<PreviewResponseHeaders>()
        );
        app.UseExceptionHandler();

        // Probes aren't traffic: the shared telemetry setup keeps them out of traces, and these out of request metrics.
        // Liveness runs no checks, since restarting the service doesn't bring its Redis back. Readiness takes a pod out of
        // the Services while it can't reach its sessions.
        app.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false }).DisableHttpMetrics();
        app.MapHealthChecks(
                "/health/ready",
                new HealthCheckOptions { Predicate = check => check.Tags.Contains(ReadyTag) }
            )
            .DisableHttpMetrics();

        app.MapSessionEndpoints();
        app.MapPreviewEndpoints();

        return app;
    }

    private static void AddPreviewTelemetry(this WebApplicationBuilder builder)
    {
        builder.Services.AddAltinnStudioOpenTelemetry(
            builder.Configuration,
            typeof(PreviewHostingExtensions).Assembly,
            ServiceName
        );
        builder.Services.Configure<AspNetCoreTraceInstrumentationOptions>(options =>
            options.EnrichWithHttpRequest = (activity, request) =>
            {
                if (PreviewUrls.WithoutSessionId(request.Path.Value) is { } path)
                {
                    activity.SetTag(UrlPathAttribute, path);
                }
            }
        );
    }
}
