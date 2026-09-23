using Altinn.Studio.Observability.Proxy.Configuration;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Observability.Proxy.Auth;

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
        var pathPrefix = ObservabilityPaths.NormalizePrefix(_options.CurrentValue.PathPrefix);
        if (!context.Request.Path.StartsWithSegments(pathPrefix))
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

        var routeGroup = ObservabilityPaths.ResolveRouteGroup(context.Request.Path, pathPrefix);
        if (routeGroup is not null && !source.AllowsRouteGroup(routeGroup))
        {
            _logger.LogWarning(
                "Rejected observability request from {SourceIdentity}. TokenTag={TokenTag} RouteGroup={RouteGroup} Method={Method} Path={Path}",
                source.SourceIdentity,
                source.TokenTag,
                routeGroup,
                context.Request.Method,
                context.Request.Path
            );
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return;
        }

        context.Features.Set(new ObservabilitySourceFeature(source));
        _logger.LogInformation(
            "Accepted observability request from {SourceIdentity}. TokenTag={TokenTag} RouteGroup={RouteGroup} Method={Method} Path={Path}",
            source.SourceIdentity,
            source.TokenTag,
            routeGroup ?? "unknown",
            context.Request.Method,
            context.Request.Path
        );

        await _next(context);
    }
}
