#nullable enable

using Altinn.Studio.EnvTopology;

namespace LocalTest.Filters;

public class ProxyMiddleware
{
    private const string DestinationKindHttp = "http";
    private const string DestinationLocationEnv = "env";
    private const string DestinationLocationHost = "host";

    private readonly RequestDelegate _nextMiddleware;
    private readonly EnvRouteProxy _envProxy;
    private readonly HostRouteProxy _hostProxy;
    private readonly ILogger<ProxyMiddleware> _logger;
    private readonly BoundTopologyIndexAccessor _boundTopologyIndex;

    public ProxyMiddleware(
        RequestDelegate nextMiddleware,
        BoundTopologyIndexAccessor boundTopologyIndex,
        EnvRouteProxy envProxy,
        HostRouteProxy hostProxy,
        ILogger<ProxyMiddleware> logger
    )
    {
        _nextMiddleware = nextMiddleware;
        _envProxy = envProxy;
        _hostProxy = hostProxy;
        _logger = logger;
        _boundTopologyIndex = boundTopologyIndex;
    }

    public async Task Invoke(HttpContext context)
    {
        var path = context.Request.Path.Value;
        if (path == null)
        {
            await _nextMiddleware(context);
            return;
        }

        if (await TryProxyResolvedRoute(context, path))
        {
            return;
        }

        await _nextMiddleware(context);
    }

    private async Task<bool> TryProxyResolvedRoute(HttpContext context, string path)
    {
        var match = _boundTopologyIndex.Current.MatchRequest(context.Request.Host.Host, path);
        if (match == null)
        {
            return false;
        }

        var route = match.Route;
        if (!route.Enabled)
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return true;
        }

        if (!string.Equals(route.Destination.Kind, DestinationKindHttp, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (string.Equals(route.Destination.Location, DestinationLocationEnv, StringComparison.OrdinalIgnoreCase))
        {
            return await TryProxyToEnv(context, route.Destination.Url);
        }

        if (string.Equals(route.Destination.Location, DestinationLocationHost, StringComparison.OrdinalIgnoreCase))
        {
            return await TryProxyToHost(context, match);
        }

        return false;
    }

    private async Task<bool> TryProxyToEnv(HttpContext context, string? targetUrl)
    {
        if (string.IsNullOrEmpty(targetUrl))
        {
            return false;
        }

        await _envProxy.Proxy(context, targetUrl);
        return true;
    }

    private async Task<bool> TryProxyToHost(HttpContext context, BoundTopologyRequestMatch match)
    {
        var route = match.Route;
        if (
            match.HttpDestinationUri is not { } uri
            || !string.Equals(uri.Scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
        )
        {
            _logger.LogWarning(
                "Bound topology route {Component} has unsupported host destination URL {Url}",
                route.Component,
                route.Destination.Url
            );
            return false;
        }

        await _hostProxy.Proxy(context, uri.Host, uri.Port, route.Component);
        return true;
    }
}
