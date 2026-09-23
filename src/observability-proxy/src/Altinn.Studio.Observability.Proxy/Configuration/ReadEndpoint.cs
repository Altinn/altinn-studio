namespace Altinn.Studio.Observability.Proxy.Configuration;

/// <summary>
/// One backend read endpoint the query token may reach, as a path below the signal's public read
/// prefix. A <c>*</c> segment stands for exactly one path segment, such as a label name or a trace
/// ID. GET is always allowed; POST only where Grafana sends a query as a form body.
/// </summary>
internal sealed class ReadEndpoint
{
    private const string AnySegment = "*";

    private readonly string[] _segments;

    public ReadEndpoint(string pathTemplate, bool allowsPost = false)
    {
        PathTemplate = pathTemplate;
        AllowsPost = allowsPost;
        _segments = pathTemplate.Split('/');
    }

    public string PathTemplate { get; }

    public bool AllowsPost { get; }

    /// <summary>
    /// Whether <paramref name="method"/> on <paramref name="path"/> is one of <paramref name="endpoints"/>.
    ///
    /// The path is compared segment by segment and case-sensitively, as the backends route. A path
    /// with an empty, <c>.</c> or <c>..</c> segment, or with a <c>%</c> left in it, is refused before
    /// any comparison: Kestrel decodes every escape except <c>%2F</c>, and the Go backends decode that
    /// one too, so a backend could see a different path from the one checked here.
    /// </summary>
    public static bool Allows(IReadOnlyList<ReadEndpoint> endpoints, string method, string path)
    {
        ArgumentNullException.ThrowIfNull(endpoints);

        if (!HttpMethods.IsGet(method) && !HttpMethods.IsPost(method))
        {
            return false;
        }

        if (path.Length < 2 || path[0] != '/' || path.Contains('%', StringComparison.Ordinal))
        {
            return false;
        }

        var segments = path.Split('/');
        for (var index = 1; index < segments.Length; index++)
        {
            if (segments[index] is "" or "." or "..")
            {
                return false;
            }
        }

        return endpoints.Any(endpoint =>
            endpoint.Matches(segments) && (HttpMethods.IsGet(method) || endpoint.AllowsPost)
        );
    }

    private bool Matches(string[] segments)
    {
        if (segments.Length != _segments.Length)
        {
            return false;
        }

        for (var index = 0; index < segments.Length; index++)
        {
            if (
                !string.Equals(_segments[index], AnySegment, StringComparison.Ordinal)
                && !string.Equals(_segments[index], segments[index], StringComparison.Ordinal)
            )
            {
                return false;
            }
        }

        return true;
    }
}
