#nullable enable

using Microsoft.Net.Http.Headers;

namespace LocalTest.Filters;

internal static class CookieDomainRewriter
{
    private const string OldCookieDomain = "altinn3local.no";
    private const string NewCookieDomain = "local.altinn.cloud";

    public static void Rewrite(IHeaderDictionary headers)
    {
        if (!headers.TryGetValue(HeaderNames.SetCookie, out var cookies))
        {
            return;
        }

        headers[HeaderNames.SetCookie] = cookies
            .Select(cookie =>
                cookie?.Replace(
                    $"domain={OldCookieDomain}",
                    $"domain={NewCookieDomain}",
                    StringComparison.OrdinalIgnoreCase
                ) ?? string.Empty
            )
            .ToArray();
    }
}
