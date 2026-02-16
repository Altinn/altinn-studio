namespace Altinn.Studio.Gateway.Api.Hosting;

internal enum PortScope
{
    Public,
    Internal,
}

/// <summary>
/// Marker metadata for OpenAPI document filtering.
/// </summary>
internal sealed record PortScopeMetadata(PortScope Scope);

internal static class PortFilteringExtensions
{
    /// <summary>
    /// Adds an endpoint filter that restricts the endpoint to only accept requests on the internal port.
    /// Returns 404 if accessed via the public port to avoid leaking endpoint existence.
    /// </summary>
    public static RouteHandlerBuilder RequireInternalPort(this RouteHandlerBuilder builder)
    {
        return builder.AddEndpointFilter<InternalPortFilter>().WithMetadata(new PortScopeMetadata(PortScope.Internal));
    }

    /// <summary>
    /// Adds an endpoint filter that restricts the endpoint to only accept requests on the public port.
    /// Returns 404 if accessed via the internal port.
    /// </summary>
    public static RouteHandlerBuilder RequirePublicPort(this RouteHandlerBuilder builder)
    {
        return builder.AddEndpointFilter<PublicPortFilter>().WithMetadata(new PortScopeMetadata(PortScope.Public));
    }

    private sealed class InternalPortFilter : IEndpointFilter
    {
        public ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
        {
            if (context.HttpContext.Connection.LocalPort != PortConfiguration.InternalPort)
                return ValueTask.FromResult<object?>(Results.NotFound());

            return next(context);
        }
    }

    private sealed class PublicPortFilter : IEndpointFilter
    {
        public ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
        {
            if (context.HttpContext.Connection.LocalPort != PortConfiguration.PublicPort)
                return ValueTask.FromResult<object?>(Results.NotFound());

            return next(context);
        }
    }
}
