using System.Net;
using Altinn.Studio.StudioctlServer.Platform.PortListeners;

namespace Altinn.Studio.StudioctlServer.Discovery;

internal readonly record struct AppEndpointUri
{
    private const string CanonicalLoopbackHost = "127.0.0.1";
    private readonly string? _key;

    private AppEndpointUri(Uri uri)
    {
        Value = CanonicalizeUri(uri);
        _key = EndpointKey(Value);
    }

    public Uri Value { get; }

    public int Port => Value.Port;

    public static AppEndpointUri From(Uri uri) => new(uri);

    public bool Equals(AppEndpointUri other) => string.Equals(_key, other._key, StringComparison.OrdinalIgnoreCase);

    public override int GetHashCode() => StringComparer.OrdinalIgnoreCase.GetHashCode(_key ?? "");

    public override string ToString() => Value.ToString();

    public static Uri Canonicalize(Uri uri) => CanonicalizeUri(uri);

    private static Uri CanonicalizeUri(Uri uri)
    {
        if (!IsLoopbackHost(uri.Host))
            return uri;

        return new UriBuilder(uri) { Host = CanonicalLoopbackHost }.Uri;
    }

    private static string EndpointKey(Uri uri) => uri.GetComponents(UriComponents.AbsoluteUri, UriFormat.SafeUnescaped);

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
