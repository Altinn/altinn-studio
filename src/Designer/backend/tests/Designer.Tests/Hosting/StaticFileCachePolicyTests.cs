using System;
using Altinn.Studio.Designer.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Net.Http.Headers;
using Xunit;

namespace Designer.Tests.Hosting;

public class StaticFileCachePolicyTests
{
    [Fact]
    public void CreateForHtmlFileRequiresRevalidation()
    {
        CacheControlHeaderValue result = StaticFileCachePolicy.Create(
            new PathString("/editor/index.html"),
            "index.html"
        );

        Assert.True(result.NoCache);
        Assert.False(result.Public);
        Assert.Null(result.MaxAge);
    }

    [Fact]
    public void CreateForHashedAssetCachesImmutably()
    {
        CacheControlHeaderValue result = StaticFileCachePolicy.Create(
            new PathString("/editor/assets/Overview-CUBLCBy3.js"),
            "Overview-CUBLCBy3.js"
        );

        Assert.True(result.Public);
        Assert.Equal(TimeSpan.FromDays(365), result.MaxAge);
        Assert.Contains(result.Extensions, extension => extension.Name.Equals("immutable", StringComparison.Ordinal));
    }

    [Fact]
    public void CreateForOtherStaticFilePreservesDefaultCacheDuration()
    {
        CacheControlHeaderValue result = StaticFileCachePolicy.Create(
            new PathString("/img/Altinn-studio-3.svg"),
            "Altinn-studio-3.svg"
        );

        Assert.True(result.Public);
        Assert.Equal(TimeSpan.FromHours(1), result.MaxAge);
        Assert.Empty(result.Extensions);
    }
}
