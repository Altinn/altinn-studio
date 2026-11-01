using Altinn.Studio.Observability.Proxy.Telemetry;
using Microsoft.AspNetCore.Http.Features;
using Yarp.ReverseProxy.Forwarder;
using Yarp.ReverseProxy.Model;

namespace Altinn.Studio.Observability.Proxy.Routing;

/// <summary>
/// Sends a read that could not reach its storage copy to the other copy, once.
///
/// <see cref="StickyFailover"/> moves reads only once the active health checks take a copy out,
/// which takes two failed probes: with the default interval, 10 to 25 seconds after the copy went
/// away. A node restart takes a copy away for about as long, so without this every read in that
/// window fails, and Grafana's alert rules, which read through the proxy, report a monitoring
/// failure.
///
/// The retry does not move reads. One failed request is weaker evidence than the health checks,
/// and a copy reads move to is where they stay, so moving is left to them: a copy that is gone for
/// longer is taken out as before, and one that is back before then keeps its reads.
///
/// Only a request that never got a response is retried, which is what an unreachable copy gives.
/// Every read is a query, so sending it twice is safe. A read body is buffered so it can be sent
/// again, in memory only, since the root filesystem is read-only; a read with a larger body or one
/// of unknown length is not retried.
/// </summary>
internal sealed class ReadRetry(ILogger<ReadRetry> logger, ObservabilityProxyMetrics metrics)
{
    /// <summary>The largest read body buffered for a retry. Grafana's query forms are a few KiB.</summary>
    public const int MaxBufferedBodyBytes = 1024 * 1024;

    /// <param name="destination">The copy <see cref="StickyFailover"/> chose for this read.</param>
    /// <param name="availableDestinations">The cluster's healthy copies, before the choice.</param>
    public async Task ForwardAsync(
        HttpContext context,
        RequestDelegate next,
        DestinationState destination,
        IReadOnlyList<DestinationState> availableDestinations
    )
    {
        var standby = StickyFailover.Standby(availableDestinations, destination);
        if (standby is null || !TryBufferBody(context.Request))
        {
            await next(context);
            return;
        }

        await next(context);

        if (
            context.GetForwarderErrorFeature() is not { Error: ForwarderError.Request } forwarderError
            || context.Response.HasStarted
        )
        {
            return;
        }

        var proxyFeature = context.GetReverseProxyFeature();

        // The failed attempt is a forwarding error even when the retry succeeds, so the dashboards
        // still show the copy failing. If the retry fails as well, the outermost step records that.
        metrics.RecordForwardingError(proxyFeature.Route.Config, destination.DestinationId, forwarderError.Error);
        logger.LogWarning(
            forwarderError.Exception,
            "A read for {Cluster} could not reach {From}, and is sent to {To} once",
            proxyFeature.Cluster.Config.ClusterId,
            destination.DestinationId,
            standby.DestinationId
        );

        context.Features.Set<IForwarderErrorFeature>(null);
        context.Response.Clear();
        if (context.Request.Body.CanSeek)
        {
            context.Request.Body.Position = 0;
        }

        proxyFeature.AvailableDestinations = standby;

        await next(context);
    }

    private static bool TryBufferBody(HttpRequest request)
    {
        if (request.HttpContext.Features.Get<IHttpRequestBodyDetectionFeature>()?.CanHaveBody != true)
        {
            return true;
        }

        if (request.ContentLength is not { } length || length > MaxBufferedBodyBytes)
        {
            return false;
        }

        request.EnableBuffering(bufferThreshold: MaxBufferedBodyBytes, bufferLimit: MaxBufferedBodyBytes);
        return true;
    }
}
