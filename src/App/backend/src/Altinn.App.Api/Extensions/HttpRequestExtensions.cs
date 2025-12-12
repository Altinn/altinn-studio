using System.Text;

namespace Altinn.App.Api.Extensions;

/// <summary>
/// Extension methods for HttpRequest.
/// </summary>
internal static class HttpRequestExtensions
{
    /// <summary>
    /// Gets the display URL for the request, respecting RFC 7239 Forwarded headers,
    /// with fallback to X-Forwarded-* headers and then the direct request values.
    /// </summary>
    /// <param name="request">The HTTP request.</param>
    /// <returns>The full display URL including scheme, host, path, and query string.</returns>
    internal static string GetDisplayUrl(this HttpRequest request)
    {
        var scheme = GetScheme(request);
        var host = GetHost(request);
        var pathBase = request.PathBase.ToUriComponent();
        var path = request.Path.ToUriComponent();
        var queryString = request.QueryString.ToUriComponent();

        return new StringBuilder()
            .Append(scheme)
            .Append("://")
            .Append(host)
            .Append(pathBase)
            .Append(path)
            .Append(queryString)
            .ToString();
    }

    private static string GetScheme(HttpRequest request)
    {
        // Try RFC 7239 Forwarded header first
        if (request.Headers.TryGetValue("Forwarded", out var forwardedValues))
        {
            var proto = ParseForwardedHeader(forwardedValues.ToString(), "proto");
            if (!string.IsNullOrEmpty(proto))
            {
                return proto;
            }
        }

        // Fall back to X-Forwarded-Proto
        if (request.Headers.TryGetValue("X-Forwarded-Proto", out var xForwardedProto))
        {
            var proto = xForwardedProto.ToString().Split(',')[0].Trim();
            if (!string.IsNullOrEmpty(proto))
            {
                return proto;
            }
        }

        // Fall back to request scheme
        return request.Scheme;
    }

    private static string GetHost(HttpRequest request)
    {
        // Try RFC 7239 Forwarded header first
        if (request.Headers.TryGetValue("Forwarded", out var forwardedValues))
        {
            var host = ParseForwardedHeader(forwardedValues.ToString(), "host");
            if (!string.IsNullOrEmpty(host))
            {
                return host;
            }
        }

        // Fall back to X-Forwarded-Host
        if (request.Headers.TryGetValue("X-Forwarded-Host", out var xForwardedHost))
        {
            var host = xForwardedHost.ToString().Split(',')[0].Trim();
            if (!string.IsNullOrEmpty(host))
            {
                return host;
            }
        }

        // Fall back to Host header
        return request.Host.ToUriComponent();
    }

    /// <summary>
    /// Parses RFC 7239 Forwarded header to extract a specific parameter value.
    /// </summary>
    /// <param name="forwardedHeader">The Forwarded header value.</param>
    /// <param name="parameter">The parameter to extract (e.g., "host", "proto", "for").</param>
    /// <returns>The parameter value, or null if not found.</returns>
    private static string? ParseForwardedHeader(string forwardedHeader, string parameter)
    {
        if (string.IsNullOrEmpty(forwardedHeader))
        {
            return null;
        }

        // The Forwarded header can contain multiple proxy hops separated by commas
        // We want the first (most recent) proxy's information
        var parts = forwardedHeader.Split(',');
        var firstProxy = parts[0].Trim();

        // Parse key=value pairs separated by semicolons
        var pairs = firstProxy.Split(';');
        foreach (var pair in pairs)
        {
            var trimmedPair = pair.Trim();
            var equalsIndex = trimmedPair.IndexOf('=');
            if (equalsIndex <= 0)
            {
                continue;
            }

            var key = trimmedPair.Substring(0, equalsIndex).Trim();
            if (!key.Equals(parameter, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var value = trimmedPair.Substring(equalsIndex + 1).Trim();

            // Remove quotes if present
            if (value.StartsWith('"') && value.EndsWith('"') && value.Length >= 2)
            {
                value = value.Substring(1, value.Length - 2);
            }

            return value;
        }

        return null;
    }
}
