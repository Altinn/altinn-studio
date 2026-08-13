using System;
using Microsoft.Net.Http.Headers;

namespace Altinn.Studio.Designer.Hosting;

internal static class StaticFileCachePolicy
{
    private static readonly TimeSpan DefaultMaxAge = TimeSpan.FromHours(1);

    internal static CacheControlHeaderValue Create(string fileName)
    {
        if (fileName.EndsWith(".html", StringComparison.OrdinalIgnoreCase))
        {
            return new CacheControlHeaderValue { NoCache = true };
        }

        return new CacheControlHeaderValue { Public = true, MaxAge = DefaultMaxAge };
    }
}
