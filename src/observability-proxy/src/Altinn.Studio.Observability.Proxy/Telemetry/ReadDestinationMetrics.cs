using System.Diagnostics.Metrics;
using Altinn.Studio.Observability.Proxy.Routing;
using Yarp.ReverseProxy;
using Yarp.ReverseProxy.Health;
using Yarp.ReverseProxy.Model;

namespace Altinn.Studio.Observability.Proxy.Telemetry;

/// <summary>
/// Where each signal's reads go, and which copies the proxy considers healthy, observed when the
/// metrics are collected. Together they show reads running on the standby copy, and when the first
/// copy is healthy again, so that a restart would move reads back.
///
/// The active copy is the one <see cref="StickyFailover"/> would send a read to now, which is the
/// one the last read went to unless that copy has since failed its health checks. Observing it does
/// not move reads; only a read does. With no healthy copy, no copy is active.
/// </summary>
internal sealed class ReadDestinationMetrics
{
    private readonly IProxyStateLookup _proxyState;
    private readonly StickyFailover _failover;

    public ReadDestinationMetrics(
        ObservabilityProxyMetrics metrics,
        IProxyStateLookup proxyState,
        StickyFailover failover
    )
    {
        ArgumentNullException.ThrowIfNull(metrics);

        _proxyState = proxyState;
        _failover = failover;
        metrics.Meter.CreateObservableGauge(
            "altinn.observability_proxy.read.destination.active",
            () => Observe(static (destination, active) => ReferenceEquals(destination, active) ? 1 : 0),
            unit: null,
            description: "1 for the storage copy a signal's reads go to, 0 for the other."
        );
        metrics.Meter.CreateObservableGauge(
            "altinn.observability_proxy.read.destination.healthy",
            () => Observe(static (destination, _) => destination.Health.Active == DestinationHealth.Unhealthy ? 0 : 1),
            unit: null,
            description: "1 while a storage copy passes the proxy's health checks or has not been probed yet, 0 once it fails them."
        );
    }

    private List<Measurement<int>> Observe(Func<DestinationState, DestinationState?, int> value)
    {
        var measurements = new List<Measurement<int>>();
        foreach (var cluster in _proxyState.GetClusters())
        {
            if (!ObservabilityReverseProxyConfig.IsStoragePair(cluster.Model.Config))
            {
                continue;
            }

            var destinations = cluster.DestinationsState;
            var active = _failover.Peek(cluster.ClusterId, destinations.AvailableDestinations);
            foreach (var destination in destinations.AllDestinations)
            {
                measurements.Add(
                    new(
                        value(destination, active),
                        new KeyValuePair<string, object?>(
                            ObservabilityProxyMetrics.Attributes.Signal,
                            cluster.ClusterId
                        ),
                        new KeyValuePair<string, object?>(
                            ObservabilityProxyMetrics.Attributes.Destination,
                            destination.DestinationId
                        )
                    )
                );
            }
        }

        return measurements;
    }
}
