using System;
using Microsoft.AspNetCore.Http;
using Microsoft.Net.Http.Headers;

namespace Altinn.Studio.Designer.Hosting;

internal static class StaticFileCachePolicy
{
    private static readonly TimeSpan DefaultMaxAge = TimeSpan.FromHours(1);
    private static readonly TimeSpan ImmutableAssetMaxAge = TimeSpan.FromDays(365);

    internal static CacheControlHeaderValue Create(PathString requestPath, string fileName)
    {
        if (fileName.EndsWith(".html", StringComparison.OrdinalIgnoreCase))
        {
            return new CacheControlHeaderValue { NoCache = true };
        }

        if (requestPath.Value?.Contains("/assets/", StringComparison.Ordinal) is true)
        {
            CacheControlHeaderValue cacheControl = new() { Public = true, MaxAge = ImmutableAssetMaxAge };
            cacheControl.Extensions.Add(new NameValueHeaderValue("immutable"));
            return cacheControl;
        }

        return new CacheControlHeaderValue { Public = true, MaxAge = DefaultMaxAge };
    }
}
