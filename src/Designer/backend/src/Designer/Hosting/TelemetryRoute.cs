using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Metadata;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Routing.Patterns;

namespace Altinn.Studio.Designer.Hosting;

/// <summary>
/// ASP.NET Core names request spans and sets http.route on spans and request metrics from the raw route template,
/// constraints included: designer/api/{org}/{app:regex(^(?!datamodels$)...)}/validation. This names them after the
/// template without constraints, defaults or the like instead: /designer/api/{org}/{app}/validation.
/// </summary>
internal static class TelemetryRoute
{
    /// <summary>
    /// The response header that carries the route a request matched, so that the load balancer, whose span is the
    /// root of the trace, can be named after it too. The load balancer removes it from the response.
    /// </summary>
    public const string ResponseHeader = "X-Altinn-Route";

    public static TBuilder WithTelemetryRoute<TBuilder>(this TBuilder builder)
        where TBuilder : IEndpointConventionBuilder
    {
        builder.Add(endpoint =>
        {
            if (endpoint is RouteEndpointBuilder routeEndpoint)
            {
                endpoint.Metadata.Add(new RouteDiagnosticsMetadata(Template(routeEndpoint.RoutePattern)));
            }
        });
        return builder;
    }

    /// <summary>
    /// Adds the route a request matched to its response as <see cref="ResponseHeader"/>, for endpoints that have one.
    /// </summary>
    public static IApplicationBuilder UseTelemetryRouteHeader(this IApplicationBuilder app) =>
        app.Use(
            (context, next) =>
            {
                context.Response.OnStarting(AddRouteHeader, context);
                return next(context);
            }
        );

    public static string Template(RoutePattern pattern) =>
        "/" + string.Join('/', pattern.PathSegments.Select(segment => string.Concat(segment.Parts.Select(Part))));

    private static Task AddRouteHeader(object state)
    {
        var context = (HttpContext)state;
        // The exception handler clears the endpoint before it handles a failed request, and keeps it here.
        Endpoint? endpoint = context.Features.Get<IExceptionHandlerFeature>()?.Endpoint ?? context.GetEndpoint();
        if (endpoint?.Metadata.GetMetadata<IRouteDiagnosticsMetadata>() is { } metadata)
        {
            context.Response.Headers[ResponseHeader] = metadata.Route;
        }
        return Task.CompletedTask;
    }

    private static string Part(RoutePatternPart part) =>
        part switch
        {
            RoutePatternParameterPart parameter =>
                $"{{{(parameter.IsCatchAll ? "*" : "")}{parameter.Name}{(parameter.IsOptional ? "?" : "")}}}",
            RoutePatternLiteralPart literal => literal.Content,
            RoutePatternSeparatorPart separator => separator.Content,
            _ => string.Empty,
        };

    private sealed record RouteDiagnosticsMetadata(string Route) : IRouteDiagnosticsMetadata;
}
