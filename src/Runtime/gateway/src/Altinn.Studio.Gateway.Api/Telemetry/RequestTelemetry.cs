using System.Diagnostics;

namespace Altinn.Studio.Gateway.Api.Telemetry;

internal static class RequestTelemetry
{
    /// <summary>
    /// Puts the app and the Studio environment a request is about on its server span, from the route or the query.
    /// Runs when the span ends, so a request that authentication rejected has them too.
    /// </summary>
    public static void EnrichWithHttpResponse(Activity span, HttpResponse response) =>
        SetRequestAttributes(span, response.HttpContext.Request);

    internal static void SetRequestAttributes(Activity span, HttpRequest request)
    {
        if (RequestValue(request, "app") is { } app)
        {
            span.SetApp(app);
        }
        if (RequestValue(request, "originEnvironment") is { } originEnvironment)
        {
            span.SetOriginEnvironment(originEnvironment);
        }
    }

    private static string? RequestValue(HttpRequest request, string name)
    {
        if (request.RouteValues.TryGetValue(name, out var routeValue) && routeValue is string { Length: > 0 } value)
        {
            return value;
        }
        return request.Query[name] is [{ Length: > 0 } queryValue] ? queryValue : null;
    }
}
