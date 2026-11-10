using System.Net;
using Altinn.Studio.Observability.Proxy.Configuration;
using Microsoft.AspNetCore.Server.Kestrel.Core;

namespace Altinn.Studio.Observability.Proxy.Hosting;

/// <summary>
/// The proxy's two listeners: <see cref="ObservabilityProxyOptions.Port"/> for traffic and
/// <see cref="ObservabilityProxyOptions.MetricsPort"/> for <c>/metrics</c> only.
///
/// Both are set up here rather than from <c>ASPNETCORE_URLS</c>, so the port the proxy serves its
/// metrics on is always one it listens on, and only there: a URL list that left the metrics port out,
/// or a metrics port that matched the traffic one, would otherwise lose the metrics or serve traffic
/// as metrics without a word. A port of 0 lets the system pick one, which tests use; the port in use
/// is known once the server has started.
/// </summary>
internal sealed class ProxyListeners
{
    private ListenOptions? _traffic;
    private ListenOptions? _metrics;

    /// <summary>The port traffic is served on.</summary>
    public int TrafficPort => BoundPort(_traffic);

    /// <summary>The port metrics are served on.</summary>
    public int MetricsPort => BoundPort(_metrics);

    public static ProxyListeners Configure(WebApplicationBuilder builder, ObservabilityProxyOptions options)
    {
        ArgumentNullException.ThrowIfNull(builder);
        ArgumentNullException.ThrowIfNull(options);

        if (builder.WebHost.GetSetting(WebHostDefaults.ServerUrlsKey) is { Length: > 0 } urls)
        {
            throw new InvalidOperationException(
                $"The proxy listens on ObservabilityProxy:Port and ObservabilityProxy:MetricsPort, not on URLs, "
                    + $"but URLs are set ({urls}). Remove ASPNETCORE_URLS."
            );
        }

        if (options.Port != 0 && options.Port == options.MetricsPort)
        {
            throw new InvalidOperationException(
                $"ObservabilityProxy:Port and ObservabilityProxy:MetricsPort are both {options.Port}; "
                    + "metrics are served on a port of their own."
            );
        }

        // The container image's default port, which would only make Kestrel warn that it is ignored.
        builder.WebHost.UseSetting(WebHostDefaults.HttpPortsKey, string.Empty);

        var listeners = new ProxyListeners();
        builder.WebHost.ConfigureKestrel(kestrel =>
        {
            kestrel.ListenAnyIP(options.Port, traffic => listeners._traffic = traffic);
            kestrel.ListenAnyIP(options.MetricsPort, metrics => listeners._metrics = metrics);
        });
        builder.Services.AddSingleton(listeners);
        return listeners;
    }

    private static int BoundPort(ListenOptions? listener) =>
        listener?.EndPoint is IPEndPoint endPoint
            ? endPoint.Port
            : throw new InvalidOperationException("The proxy's listeners are not configured yet.");
}
