using Altinn.Studio.Observability.Proxy.Configuration;
using Altinn.Studio.Observability.Proxy.Routing;
using Microsoft.Extensions.Options;
using Yarp.ReverseProxy.Model;

namespace Altinn.Studio.Observability.Proxy.Auth;

/// <summary>
/// Authenticates observability requests and authorizes them against the route they matched.
///
/// Runs after routing, so the decision comes from the matched route's metadata rather than from
/// reading the path a second time: a path that matches no route, or a route that names no route
/// group, reaches nothing. Any proxy route is authenticated whatever its path, and so is anything
/// else under the prefix. The order of the answers is 401 for a missing or unknown token, 404 for
/// no route, 403 for a route group the token was not granted, and 404 for a read path outside the
/// signal's allowlist, so only an authenticated caller learns which paths exist.
/// </summary>
internal sealed class StaticBearerTokenMiddleware
{
    private readonly RequestDelegate _next;
    private readonly StaticBearerTokenAuthenticator _authenticator;
    private readonly IOptionsMonitor<ObservabilityProxyOptions> _options;
    private readonly ILogger<StaticBearerTokenMiddleware> _logger;

    public StaticBearerTokenMiddleware(
        RequestDelegate next,
        StaticBearerTokenAuthenticator authenticator,
        IOptionsMonitor<ObservabilityProxyOptions> options,
        ILogger<StaticBearerTokenMiddleware> logger
    )
    {
        _next = next;
        _authenticator = authenticator;
        _options = options;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var route = context.GetEndpoint()?.Metadata.GetMetadata<RouteModel>();
        var pathPrefix = ObservabilityPaths.NormalizePrefix(_options.CurrentValue.PathPrefix);
        if (route is null && !context.Request.Path.StartsWithSegments(pathPrefix))
        {
            await _next(context);
            return;
        }

        if (!_authenticator.TryAuthenticate(context.Request.Headers.Authorization, out var source))
        {
            _logger.LogWarning(
                "Rejected unauthenticated observability request. Method={Method} Path={Path}",
                context.Request.Method,
                context.Request.Path
            );
            context.Response.Headers.WWWAuthenticate = "Bearer";
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        var routeGroup = ObservabilityReverseProxyConfig.RouteGroupOf(route?.Config);
        if (routeGroup is null)
        {
            Reject(context, source, "unknown", "no route", StatusCodes.Status404NotFound);
            return;
        }

        if (!source.AllowsRouteGroup(routeGroup))
        {
            Reject(context, source, routeGroup, "route group not granted", StatusCodes.Status403Forbidden);
            return;
        }

        if (
            ObservabilitySignal.ForReadRouteGroup(routeGroup) is { } signal
            && !signal.AllowsRead(context.Request.Method, ReadPath(context))
        )
        {
            Reject(context, source, routeGroup, "read path not allowed", StatusCodes.Status404NotFound);
            return;
        }

        context.Features.Set(new ObservabilitySourceFeature(source));
        _logger.LogInformation(
            "Accepted observability request from {SourceIdentity}. TokenTag={TokenTag} RouteGroup={RouteGroup} Method={Method} Path={Path}",
            source.SourceIdentity,
            source.TokenTag,
            routeGroup,
            context.Request.Method,
            context.Request.Path
        );

        await _next(context);
    }

    /// <summary>The path below the signal's public read prefix, as the read route captured it.</summary>
    private static string ReadPath(HttpContext context)
    {
        return "/" + context.Request.RouteValues[ObservabilityPaths.ReadPathRouteValue];
    }

    private void Reject(
        HttpContext context,
        ObservabilitySource source,
        string routeGroup,
        string reason,
        int statusCode
    )
    {
        _logger.LogWarning(
            "Rejected observability request from {SourceIdentity}: {Reason}. TokenTag={TokenTag} RouteGroup={RouteGroup} Method={Method} Path={Path}",
            source.SourceIdentity,
            reason,
            source.TokenTag,
            routeGroup,
            context.Request.Method,
            context.Request.Path
        );
        context.Response.StatusCode = statusCode;
    }
}
