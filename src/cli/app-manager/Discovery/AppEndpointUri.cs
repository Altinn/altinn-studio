using System.Net;
using Altinn.Studio.AppManager.Platform.PortListeners;

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

    public static bool TryLoopbackHttp(int port, out Uri? uri)
    {
        if (port is <= 0 or > 65535)
        {
            uri = default;
            return false;
        }

        uri = new UriBuilder(Uri.UriSchemeHttp, CanonicalLoopbackHost, port).Uri;
        return true;
    }

    public static bool TryFromListener(PortListener listener, out Uri? uri)
    {
        switch (listener.BindScope)
        {
            case ListenerBindScope.Loopback:
            case ListenerBindScope.Any:
                return TryLoopbackHttp(listener.Port, out uri);
            default:
                uri = default;
                return false;
        }
    }

    private static bool IsLoopbackHost(string host)
    {
        if (string.Equals(host, "localhost", StringComparison.OrdinalIgnoreCase))
            return true;

        return IPAddress.TryParse(host, out var address) && IPAddress.IsLoopback(address);
    }
}
