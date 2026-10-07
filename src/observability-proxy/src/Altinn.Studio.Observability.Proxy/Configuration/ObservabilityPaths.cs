namespace Altinn.Studio.Observability.Proxy.Configuration;

internal static class ObservabilityPaths
{
    public const string DefaultPathPrefix = "/internal/observability";

    public const string OtlpRouteGroup = "otlp";

    public const string TracesRouteGroup = "traces";

    public const string MetricsRouteGroup = "metrics";

    public const string LogsRouteGroup = "logs";

    /// <summary>
    /// The route metadata entry naming the route group a request needs. Authorization reads it
    /// from the route the request matched, so a path that matches no route reaches nothing.
    /// </summary>
    public const string RouteGroupMetadataKey = "ObservabilityRouteGroup";

    /// <summary>The route value holding a read request's path below its signal's public prefix.</summary>
    public const string ReadPathRouteValue = "readPath";

    public static readonly IReadOnlyList<string> ReadRouteGroups =
    [
        TracesRouteGroup,
        MetricsRouteGroup,
        LogsRouteGroup,
    ];

    public static string NormalizePrefix(string? pathPrefix)
    {
        if (string.IsNullOrWhiteSpace(pathPrefix))
        {
            return DefaultPathPrefix;
        }

        var prefixed = pathPrefix[0] == '/' ? pathPrefix : $"/{pathPrefix}";
        return prefixed.TrimEnd('/');
    }
}
