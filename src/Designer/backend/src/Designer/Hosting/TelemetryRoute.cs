using System.Linq;
using Microsoft.AspNetCore.Builder;
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

    public static string Template(RoutePattern pattern) =>
        "/" + string.Join('/', pattern.PathSegments.Select(segment => string.Concat(segment.Parts.Select(Part))));

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
