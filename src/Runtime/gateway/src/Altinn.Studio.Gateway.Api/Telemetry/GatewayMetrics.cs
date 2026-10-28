using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace Altinn.Studio.Gateway.Api.Telemetry;

/// <summary>
/// Counts the gateway's units of work that the HTTP metrics don't show: the Flux webhook and the metrics endpoints
/// answer 200 even when the work behind them failed. Spans record the same outcomes, but counts come from metrics.
/// A failure carries <c>error.type</c>.
/// </summary>
internal sealed class GatewayMetrics
{
    public const string DeployEventsMetricName = "altinn.gateway.deploy_events";
    public const string AzureMonitorQueryDurationMetricName = "altinn.gateway.azure_monitor.query.duration";

    private readonly Counter<long> _deployEvents;
    private readonly Histogram<double> _azureMonitorQueryDuration;

    public GatewayMetrics(IMeterFactory meterFactory)
    {
#pragma warning disable CA2000 // The meter factory owns the meter and disposes it.
        Meter meter = meterFactory.Create(ServiceTelemetry.Name);
#pragma warning restore CA2000
        _deployEvents = meter.CreateCounter<long>(
            DeployEventsMetricName,
            unit: "{event}",
            description: "Flux install, upgrade and uninstall events for an app, passed on to Designer."
        );
        _azureMonitorQueryDuration = meter.CreateHistogram(
            AzureMonitorQueryDurationMetricName,
            unit: "s",
            description: "Duration of Azure Monitor queries for the metrics Designer shows.",
            tags: null,
            advice: new InstrumentAdvice<double>
            {
                // Log Analytics queries take from a fraction of a second to minutes.
                HistogramBucketBoundaries = [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 120],
            }
        );
    }

    /// <param name="fluxReason">The Flux event's reason, one of the install, upgrade and uninstall outcomes.</param>
    /// <param name="originEnvironment">The Studio environment the app was deployed from, when the event names it.</param>
    /// <param name="errorType">Why the event wasn't passed on, or null when Designer got it.</param>
    public void RecordDeployEvent(string fluxReason, string? originEnvironment, string? errorType)
    {
        TagList tags = new() { { ServiceTelemetry.Attributes.FluxReason, fluxReason } };
        if (originEnvironment is not null)
        {
            tags.Add(ServiceTelemetry.Attributes.OriginEnvironment, originEnvironment);
        }
        if (errorType is not null)
        {
            tags.Add(ServiceTelemetry.Attributes.ErrorType, errorType);
        }
        _deployEvents.Add(1, tags);
    }

    /// <param name="query">The kind of query, from a fixed set.</param>
    /// <param name="duration">How long the query took.</param>
    /// <param name="errorType">Why the query failed, or null when it succeeded.</param>
    public void RecordAzureMonitorQuery(string query, TimeSpan duration, string? errorType)
    {
        TagList tags = new() { { ServiceTelemetry.Attributes.AzureMonitorQuery, query } };
        if (errorType is not null)
        {
            tags.Add(ServiceTelemetry.Attributes.ErrorType, errorType);
        }
        _azureMonitorQueryDuration.Record(duration.TotalSeconds, tags);
    }
}
