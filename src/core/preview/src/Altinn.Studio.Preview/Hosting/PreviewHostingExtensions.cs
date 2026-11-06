using Altinn.Studio.Common;
using Altinn.Studio.Common.Telemetry;
using Altinn.Studio.Preview.Apps;
using Altinn.Studio.Preview.Configuration;
using Altinn.Studio.Preview.Sessions;
using Microsoft.Extensions.DependencyInjection.Extensions;
using OpenTelemetry.Instrumentation.AspNetCore;

namespace Altinn.Studio.Preview.Hosting;

internal static class PreviewHostingExtensions
{
    private const string ServiceName = "preview";

    /// <summary>The <c>url.path</c> attribute of the ASP.NET Core instrumentation's spans.</summary>
    private const string UrlPathAttribute = "url.path";

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
            .ValidateOnStart();

        builder.Services.TryAddSingleton(TimeProvider.System);
        builder.Services.AddStackExchangeRedisCache(redis =>
        {
            redis.Configuration = builder.Configuration[
                $"{PreviewOptions.SectionName}:{nameof(PreviewOptions.RedisConnectionString)}"
            ];
            redis.InstanceName = SessionStore.KeyPrefix;
        });
        builder.Services.AddSingleton<SessionStore>();

        builder.Services.AddProblemDetails();
        builder.Services.AddHealthChecks();
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
        app.MapHealthChecks("/health/live").DisableHttpMetrics();
        app.MapHealthChecks("/health/ready").DisableHttpMetrics();

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
