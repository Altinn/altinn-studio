#nullable enable

using System.Collections.Frozen;
using Microsoft.Net.Http.Headers;

namespace Altinn.Studio.HostBridge;

public static class HostBridgeHttpHeaders
{
    private static readonly FrozenSet<string> HeadersToExclude = new HashSet<string>(
        17,
        StringComparer.OrdinalIgnoreCase
    )
    {
        HeaderNames.Connection,
        HeaderNames.TransferEncoding,
        HeaderNames.KeepAlive,
        HeaderNames.Upgrade,
        "Proxy-Connection",
        HeaderNames.ProxyAuthenticate,
        "Proxy-Authentication-Info",
        HeaderNames.ProxyAuthorization,
        "Proxy-Features",
        "Proxy-Instruction",
        "Security-Scheme",
        "ALPN",
        "Close",
        "HTTP2-Settings",
        HeaderNames.UpgradeInsecureRequests,
        HeaderNames.TE,
        HeaderNames.AltSvc,
    }.ToFrozenSet(StringComparer.OrdinalIgnoreCase);

    private static readonly FrozenSet<string> ContentHeaders = new HashSet<string>(
        11,
        StringComparer.OrdinalIgnoreCase
    )
    {
        HeaderNames.Allow,
        HeaderNames.ContentDisposition,
        HeaderNames.ContentEncoding,
        HeaderNames.ContentLanguage,
        HeaderNames.ContentLength,
        HeaderNames.ContentLocation,
        HeaderNames.ContentMD5,
        HeaderNames.ContentRange,
        HeaderNames.ContentType,
        HeaderNames.Expires,
        HeaderNames.LastModified,
    }.ToFrozenSet(StringComparer.OrdinalIgnoreCase);

    public static bool ShouldSkipRequestHeader(string headerName)
    {
        if (HeadersToExclude.Contains(headerName))
            return true;

        return headerName.StartsWith(':');
    }

    public static bool ShouldSkipResponseHeader(string headerName) => HeadersToExclude.Contains(headerName);

    public static bool IsContentHeader(string headerName) => ContentHeaders.Contains(headerName);

    public static bool IsBodylessStatusCode(int statusCode) =>
        statusCode is >= 100 and < 200 or 204 or 205;
}
