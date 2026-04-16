using System.Net;

namespace Altinn.Studio.AppManager.Discovery;

internal static class AppEndpointUri
{
    private const string CanonicalLoopbackHost = "127.0.0.1";

    public static Uri Canonicalize(Uri uri)
    {
        if (!IsLoopbackHost(uri.Host))
            return uri;

        return new UriBuilder(uri) { Host = CanonicalLoopbackHost }.Uri;
    }

    public static bool Same(Uri left, Uri right) =>
        Uri.Compare(
            Canonicalize(left),
            Canonicalize(right),
            UriComponents.AbsoluteUri,
            UriFormat.SafeUnescaped,
            StringComparison.OrdinalIgnoreCase
        ) == 0;

    private static bool IsLoopbackHost(string host)
    {
        if (string.Equals(host, "localhost", StringComparison.OrdinalIgnoreCase))
            return true;

        return IPAddress.TryParse(host, out var address) && IPAddress.IsLoopback(address);
    }
}
