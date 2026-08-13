using System;
using Altinn.Studio.Designer.Hosting;
using Microsoft.Net.Http.Headers;
using Xunit;

namespace Designer.Tests.Hosting;

public class StaticFileCachePolicyTests
{
    [Fact]
    public void CreateForHtmlFileRequiresRevalidation()
    {
        CacheControlHeaderValue result = StaticFileCachePolicy.Create("index.html");

        Assert.True(result.NoCache);
        Assert.False(result.Public);
        Assert.Null(result.MaxAge);
    }

    [Fact]
    public void CreateForJavaScriptAssetPreservesDefaultCacheDuration()
    {
        CacheControlHeaderValue result = StaticFileCachePolicy.Create("Overview-CUBLCBy3.js");

        Assert.True(result.Public);
        Assert.Equal(TimeSpan.FromHours(1), result.MaxAge);
        Assert.Empty(result.Extensions);
    }
}
