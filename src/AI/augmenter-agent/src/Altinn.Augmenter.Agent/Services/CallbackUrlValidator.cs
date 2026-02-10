using System.Text.RegularExpressions;
using Altinn.Augmenter.Agent.Configuration;
using Microsoft.Extensions.Options;

namespace Altinn.Augmenter.Agent.Services;

public sealed class CallbackUrlValidator : ICallbackUrlValidator
{
    private readonly List<Regex> _patterns;

    public CallbackUrlValidator(IOptions<CallbackOptions> options)
    {
        _patterns = options.Value.AllowedPatterns
            .Select(CompilePattern)
            .ToList();
    }

    public string? Validate(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
        {
            return "callback-url must be a valid absolute URL.";
        }

        if (uri.Scheme is not ("http" or "https"))
        {
            return "callback-url must use http or https scheme.";
        }

        if (_patterns.Count == 0)
        {
            return "No callback URL patterns are configured. All callbacks are rejected.";
        }

        // Reconstruct the URL without query/fragment for matching
        var urlToMatch = $"{uri.Scheme}://{uri.Authority}{uri.AbsolutePath}";

        foreach (var pattern in _patterns)
        {
            if (pattern.IsMatch(urlToMatch))
            {
                return null;
            }
        }

        return "callback-url does not match any allowed pattern.";
    }

    /// <summary>
    /// Compiles a pattern like "https://*.altinn.no/instances/*" into a Regex.
    /// - * in host matches a single DNS label (no dots)
    /// - :* in port matches any port
    /// - * in path matches a single segment (no slashes)
    /// - Trailing /* matches everything under that path
    /// </summary>
    internal static Regex CompilePattern(string pattern)
    {
        // Replace :* (port wildcard) with :0 and remaining * with "placeholder" for URI validation
        var testUrl = pattern.Replace(":*", ":0").Replace("*", "placeholder");
        if (!Uri.TryCreate(testUrl, UriKind.Absolute, out _))
        {
            throw new ArgumentException($"Invalid callback URL pattern: {pattern}");
        }

        // Split pattern into scheme+host and path parts
        var schemeEnd = pattern.IndexOf("://", StringComparison.Ordinal);
        if (schemeEnd < 0)
        {
            throw new ArgumentException($"Pattern must include scheme: {pattern}");
        }

        var scheme = pattern[..schemeEnd];
        var rest = pattern[(schemeEnd + 3)..];

        // Separate authority (host:port) from path
        var pathStart = rest.IndexOf('/');
        string authority;
        string path;
        if (pathStart < 0)
        {
            authority = rest;
            path = "/";
        }
        else
        {
            authority = rest[..pathStart];
            path = rest[pathStart..];
        }

        // Build regex for scheme
        var regexParts = new List<string> { "^", Regex.Escape(scheme), "://" };

        // Build regex for authority (host:port)
        // Handle :* for port
        var portSep = authority.LastIndexOf(':');
        string host;
        string? port = null;
        if (portSep > 0)
        {
            host = authority[..portSep];
            port = authority[(portSep + 1)..];
        }
        else
        {
            host = authority;
        }

        // Convert host wildcards: * matches single DNS label ([^.]+)
        var hostPattern = string.Join("\\.", host.Split('.').Select(segment =>
            segment == "*" ? "[^.]+" : Regex.Escape(segment)));
        regexParts.Add(hostPattern);

        if (port != null)
        {
            regexParts.Add(":");
            regexParts.Add(port == "*" ? "[0-9]+" : Regex.Escape(port));
        }

        // Build regex for path
        if (path.EndsWith("/*"))
        {
            // Trailing /* matches everything under that path
            var basePath = path[..^2];
            var pathSegments = basePath.Split('/').Select(seg =>
                seg == "*" ? "[^/]+" : Regex.Escape(seg));
            regexParts.Add(string.Join("/", pathSegments));
            regexParts.Add("/.*");
        }
        else
        {
            var pathSegments = path.Split('/').Select(seg =>
                seg == "*" ? "[^/]+" : Regex.Escape(seg));
            regexParts.Add(string.Join("/", pathSegments));
        }

        regexParts.Add("$");

        return new Regex(string.Concat(regexParts), RegexOptions.Compiled | RegexOptions.CultureInvariant);
    }
}
