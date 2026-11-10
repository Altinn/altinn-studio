using Altinn.Studio.EnvTopology;

namespace LocalTest.Configuration;

internal static class BoundTopologyComponentRouteExtensions
{
    /// <summary>
    /// The URL a browser opens the component on: localtest's base URL with the component's public host and path.
    /// </summary>
    public static string PublicUrl(this BoundTopologyComponentRoute route, string localtestBaseUrl)
    {
        var uri = new Uri(localtestBaseUrl);
        return new UriBuilder(uri)
        {
            Host = route.PublicHost,
            Path = string.IsNullOrEmpty(route.PublicPathPrefix) ? string.Empty : route.PublicPathPrefix,
            Query = string.Empty,
        }.Uri.ToString();
    }
}
