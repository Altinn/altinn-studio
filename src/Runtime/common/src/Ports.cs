using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Runtime.Common;

public static class Ports
{
    private static int? _publicPort;
    private static int? _internalPort;

    private static int PublicPort =>
        _publicPort ?? throw new InvalidOperationException("Public port not configured.");

    private static int InternalPort =>
        _internalPort ?? throw new InvalidOperationException("Internal port not configured.");

    extension(WebApplicationBuilder builder)
    {
        /// <summary>
        /// Configures Kestrel to listen on the specified ports for public and internal traffic, respectively.
        /// <para>
        /// To be used in conjunction with the <see cref="RequireInternalPort"/> and <see cref="RequirePublicPort"/> endpoint filters.
        /// </para>
        /// </summary>
        public WebApplicationBuilder ConfigureKestrelPorts(int publicPort, int internalPort)
        {
            _publicPort = publicPort;
            _internalPort = internalPort;

            builder.WebHost.ConfigureKestrel(options =>
            {
                options.ListenAnyIP(publicPort);
                options.ListenAnyIP(internalPort);
            });

            return builder;
        }
    }

    extension(RouteHandlerBuilder builder)
    {
        /// <summary>
        /// Adds an endpoint filter that restricts the endpoint to only accept requests on the internal port.
        /// Returns 404 if accessed via the public port to avoid leaking endpoint existence.
        /// </summary>
        /// <remarks>
        /// Requires a call to <see cref="ConfigureKestrelPorts"/> to configure Kestrel to listen on the internal port.
        /// </remarks>
        public RouteHandlerBuilder RequireInternalPort() =>
            builder.RequirePort(InternalPort, PortScope.Internal);

        /// <summary>
        /// Adds an endpoint filter that restricts the endpoint to only accept requests on the public port.
        /// Returns 404 if accessed via the internal port.
        /// </summary>
        /// <remarks>
        /// Requires a call to <see cref="ConfigureKestrelPorts"/> to configure Kestrel to listen on the public port.
        /// </remarks>
        public RouteHandlerBuilder RequirePublicPort() =>
            builder.RequirePort(PublicPort, PortScope.Public);

        /// <summary>
        /// Adds an endpoint filter that restricts the endpoint to only accept requests on the specified port.
        /// </summary>
        /// <remarks>
        /// See also the convenience methods <see cref="RequireInternalPort"/> and <see cref="RequirePublicPort"/>
        /// </remarks>
        /// <param name="port">The port to restrict the endpoint to.</param>
        /// <param name="scope">The port scope (used for OpenAPI filtering).</param>
        public RouteHandlerBuilder RequirePort(int port, PortScope scope) =>
            builder
                .AddEndpointFilter(
                    async (context, next) =>
                    {
                        if (context.HttpContext.Connection.LocalPort != port)
                            return Results.NotFound();

                        return await next(context);
                    }
                )
                .WithMetadata(new PortScopeMetadata(scope));
    }
}

/// <summary>
/// Port scope for OpenAPI document filtering.
/// </summary>
public enum PortScope
{
    Public,
    Internal,
}

/// <summary>
/// Marker metadata for OpenAPI document filtering.
/// </summary>
public sealed record PortScopeMetadata(PortScope Scope);
