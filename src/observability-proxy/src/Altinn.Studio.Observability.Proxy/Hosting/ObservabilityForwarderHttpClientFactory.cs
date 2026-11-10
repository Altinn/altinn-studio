using System.Diagnostics.Metrics;
using Yarp.ReverseProxy.Forwarder;

namespace Altinn.Studio.Observability.Proxy.Hosting;

/// <summary>
/// The forwarder's HTTP clients, which also send the storage health probes. Their request metrics
/// (<c>http.client.*</c>) come from this app's meter factory rather than from the process-wide meter
/// every <see cref="HttpClient"/> shares, so only the forwarder's requests are counted, and only by
/// this app.
/// </summary>
internal sealed class ObservabilityForwarderHttpClientFactory(
    ILogger<ForwarderHttpClientFactory> logger,
    IMeterFactory meterFactory
) : ForwarderHttpClientFactory(logger)
{
    protected override void ConfigureHandler(ForwarderHttpClientContext context, SocketsHttpHandler handler)
    {
        base.ConfigureHandler(context, handler);
        ObservabilityProxyExtensions.ConfigureForwarderHandler(handler);
        handler.MeterFactory = meterFactory;
    }
}
