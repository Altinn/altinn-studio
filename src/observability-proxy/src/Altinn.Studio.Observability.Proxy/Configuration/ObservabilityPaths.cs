using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Observability.Proxy.Configuration;

internal static class ObservabilityPaths
{
    public const string DefaultPathPrefix = "/internal/observability";

    public const string OtlpRouteGroup = "otlp";

    public const string TracesRouteGroup = "traces";

    public const string MetricsRouteGroup = "metrics";

    public static string NormalizePrefix(string? pathPrefix)
    {
        if (string.IsNullOrWhiteSpace(pathPrefix))
        {
            return DefaultPathPrefix;
        }

        var prefixed = pathPrefix[0] == '/' ? pathPrefix : $"/{pathPrefix}";
        return prefixed.TrimEnd('/');
    }

    public static string? ResolveRouteGroup(PathString requestPath, string? configuredPrefix)
    {
        var pathPrefix = NormalizePrefix(configuredPrefix);
        if (!requestPath.StartsWithSegments(pathPrefix, out var remainingPath))
        {
            return null;
        }

        if (remainingPath.StartsWithSegments($"/{OtlpRouteGroup}"))
        {
            return OtlpRouteGroup;
        }

        if (remainingPath.StartsWithSegments($"/{TracesRouteGroup}"))
        {
            return TracesRouteGroup;
        }

        if (remainingPath.StartsWithSegments($"/{MetricsRouteGroup}"))
        {
            return MetricsRouteGroup;
        }

        return null;
    }
}
