using Altinn.Studio.Observability.Proxy.Telemetry;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.Diagnostics.Metrics;
using Microsoft.Extensions.Options;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;

namespace Altinn.Studio.Observability.Proxy.Hosting;

/// <summary>
/// The proxy's metrics, served for scraping on their own port.
///
/// They are scraped rather than pushed over OTLP because the proxy is the way into the stack: OTLP
/// from the proxy would come back in through the proxy, so a broken proxy would hide its own
/// metrics. The scraper, vmagent-self, writes to the metrics storage directly
/// (infra/observability/studio/victoria/self-monitoring.yaml).
/// </summary>
internal static class ObservabilityProxyMetricsExtensions
{
    public const string ScrapePath = "/metrics";

    private const string ServiceName = "observability-proxy";

    private const string ServiceInstanceIdAttribute = "service.instance.id";

    public static WebApplicationBuilder AddObservabilityProxyMetrics(this WebApplicationBuilder builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.Services.AddSingleton<ObservabilityProxyMetrics>();
        builder.Services.AddSingleton<ReadDestinationMetrics>();

        // Enabled through the metrics builder rather than the SDK's AddMeter, which listens to every
        // meter of that name in the process. The builder takes a meter created by a service
        // provider's meter factory only from its own, so one app's requests never count in another's.
        builder.Services.AddMetrics(metrics =>
        {
            metrics.EnableMetrics(ObservabilityProxyMetrics.MeterName);
            foreach (var meterName in ObservabilityProxyMetrics.LibraryMeterNames)
            {
                metrics.EnableMetrics(meterName);
            }

            // The forwarder's own, not the process-wide one other HTTP clients share
            // (ObservabilityForwarderHttpClientFactory).
            metrics.EnableMetrics(ObservabilityProxyMetrics.HttpClientMeterName, scopes: MeterScope.Local);
        });
        builder
            .Services.AddOpenTelemetry()
            // service.instance.id is the pod's name, from OTEL_RESOURCE_ATTRIBUTES in the Deployment, so
            // a replica's series say which pod they are; a generated one would say nothing.
            .ConfigureResource(resource => resource.AddService(ServiceName, autoGenerateServiceInstanceId: false))
            .WithMetrics(metrics =>
                metrics
                    // A histogram per backend address of how long a request waited for a connection,
                    // which the connection pool makes near zero: on kind, 225 of a replica's 565 series.
                    .AddView("http.client.request.time_in_queue", MetricStreamConfiguration.Drop)
                    // Every series would name its meter in otel_scope_name otherwise. No two meters
                    // here share an instrument name, and the OTLP path drops the scope too.
                    .AddPrometheusExporter(exporter =>
                    {
                        exporter.ScopeInfoEnabled = false;
                        // On every series, not only target_info, so a replica reading from the standby
                        // copy is named by its pod. It is one value per pod, as instance is.
                        exporter.ResourceConstantLabels = attribute => attribute == ServiceInstanceIdAttribute;
                    })
            );

        return builder;
    }

    /// <summary>
    /// Serves <see cref="ScrapePath"/> on <see cref="ProxyListeners.MetricsPort"/> and
    /// nothing else there: no proxy route, no health endpoint. Call it before anything else that
    /// handles requests, and before the reverse proxy is mapped.
    /// </summary>
    public static WebApplication UseObservabilityProxyMetrics(this WebApplication app)
    {
        ArgumentNullException.ThrowIfNull(app);

        // Metrics are collected from host start, when options are validated, but the reverse proxy
        // sends its first health probes as its routes are mapped, before that. A probe that finishes
        // around the time collection starts can then be counted as finished but not as started,
        // which leaves the backend's http.client.active_requests below zero for good. Validating now
        // starts collection first; the host does not validate twice. Covered by
        // StartupMetricsTests.HealthProbesUnderWayAtStartup_LeaveNoActiveRequestsBehind.
        app.Services.GetService<IStartupValidator>()?.Validate();

        // The observable instruments exist once this is created, and nothing else asks for it.
        app.Services.GetRequiredService<ReadDestinationMetrics>();

        var listeners = app.Services.GetRequiredService<ProxyListeners>();
        app.MapWhen(
            context => context.Connection.LocalPort == listeners.MetricsPort,
            metricsApp =>
            {
                // A scrape is not traffic, so it is left out of the request metrics.
                metricsApp.Use(
                    (context, next) =>
                    {
                        if (context.Features.Get<IHttpMetricsTagsFeature>() is { } metricsTags)
                        {
                            metricsTags.MetricsDisabled = true;
                        }

                        return next(context);
                    }
                );
                metricsApp.UseOpenTelemetryPrometheusScrapingEndpoint(
                    meterProvider: null,
                    predicate: null,
                    path: ScrapePath,
                    configureBranchedPipeline: null,
                    optionsName: null
                );
                metricsApp.Run(context =>
                {
                    context.Response.StatusCode = StatusCodes.Status404NotFound;
                    return Task.CompletedTask;
                });
            }
        );

        return app;
    }
}
