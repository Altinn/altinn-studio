namespace StudioGateway.Api.Hosting;

internal static class PortFilteringExtensions
{
    /// <summary>
    /// Adds an endpoint filter that restricts the endpoint to only accept requests on the internal port.
    /// Returns 404 if accessed via the public port to avoid leaking endpoint existence.
    /// </summary>
    public static RouteHandlerBuilder RequireInternalPort(this RouteHandlerBuilder builder)
    {
        return builder.AddEndpointFilter<InternalPortFilter>();
    }

    /// <summary>
    /// Adds an endpoint filter that restricts the endpoint to only accept requests on the public port.
    /// Returns 404 if accessed via the internal port.
    /// </summary>
    public static RouteHandlerBuilder RequirePublicPort(this RouteHandlerBuilder builder)
    {
        return builder.AddEndpointFilter<PublicPortFilter>();
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
