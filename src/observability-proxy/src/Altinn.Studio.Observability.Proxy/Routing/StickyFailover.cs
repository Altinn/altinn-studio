using System.Collections.Concurrent;
using Yarp.ReverseProxy.Model;

namespace Altinn.Studio.Observability.Proxy.Routing;

/// <summary>
/// Failover between a storage pair that never fails back on its own. Reads go to the first
/// healthy destination in key order, and stay on whichever destination they go to for as long as
/// it is healthy, even once an earlier one is healthy again.
///
/// A copy that comes back after an outage passes its health check before its agent has replayed
/// what it queued meanwhile, and after a queue overflow it never gets that data at all, so moving
/// reads back to it as soon as it answers could return incomplete results indefinitely. Returning
/// to the first copy is therefore a deliberate step: restarting the proxy starts every cluster on
/// its first healthy destination again.
///
/// It runs as a step of the proxy pipeline before load balancing rather than as a load balancing
/// policy, because YARP consults a policy only when more than one destination is available, and a
/// failover is exactly when only one is.
///
/// The choice lives in each proxy replica's memory. Replicas see the same health checks, so they
/// normally agree, but a failure only one of them observed moves only that replica.
/// </summary>
internal sealed class StickyFailover(ILogger<StickyFailover> logger)
{
    private readonly ConcurrentDictionary<string, string> _current = new(StringComparer.Ordinal);

    /// <summary>The destination of <paramref name="clusterId"/> to read from, or <c>null</c> when none is healthy.</summary>
    public DestinationState? Choose(string clusterId, IReadOnlyList<DestinationState> availableDestinations)
    {
        ArgumentNullException.ThrowIfNull(availableDestinations);

        if (availableDestinations.Count == 0)
        {
            return null;
        }

        var currentId = _current.GetValueOrDefault(clusterId);
        if (currentId is not null)
        {
            foreach (var destination in availableDestinations)
            {
                if (string.Equals(destination.DestinationId, currentId, StringComparison.Ordinal))
                {
                    return destination;
                }
            }
        }

        var next = availableDestinations[0];
        foreach (var destination in availableDestinations)
        {
            if (string.CompareOrdinal(destination.DestinationId, next.DestinationId) < 0)
            {
                next = destination;
            }
        }

        if (currentId is null)
        {
            _current.TryAdd(clusterId, next.DestinationId);
        }
        else if (_current.TryUpdate(clusterId, next.DestinationId, currentId))
        {
            logger.LogWarning(
                "Reads for {Cluster} moved from {From} to {To}, and stay there until the proxy restarts",
                clusterId,
                currentId,
                next.DestinationId
            );
        }

        return next;
    }
}
