#nullable enable
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.AppDist;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Infrastructure.AppDist;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Moq;
using Xunit;

namespace Designer.Tests.Infrastructure.AppDist;

public class CachedAppDistProviderTests
{
    private const string PublishedVersion = "9.0.0";
    private const string CachedVersion = "8.5.0";
    private const string UnknownVersion = "1.2.3";
    private static readonly TimeSpan s_cacheDuration = TimeSpan.FromMinutes(1);

    private readonly Mock<IAppDistProvider> _inner = new();
    private readonly Mock<IAppDistContent> _content = new();
    private readonly FakeTimeProvider _time = new(new DateTimeOffset(2026, 9, 24, 12, 0, 0, TimeSpan.Zero));
    private readonly CachedAppDistProvider _provider;

    public CachedAppDistProviderTests()
    {
        var settings = new Mock<IOptionsMonitor<AppDistSettings>>();
        settings.Setup(s => s.CurrentValue).Returns(new AppDistSettings { VersionListCacheDuration = s_cacheDuration });
        _provider = new CachedAppDistProvider(_inner.Object, settings.Object, _time);

        _inner
            .Setup(p => p.ListCachedVersions(It.IsAny<AppDistLayer>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([CachedVersion]);
        _inner.Setup(p => p.ListVersions(It.IsAny<CancellationToken>())).ReturnsAsync([PublishedVersion]);
        _inner
            .Setup(p => p.GetLayer(It.IsAny<string>(), It.IsAny<AppDistLayer>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(_content.Object);
    }

    [Fact]
    public async Task GetLayer_VersionInLocalCache_DoesNotContactRegistry()
    {
        IAppDistContent? result = await _provider.GetLayer(CachedVersion, AppDistLayer.Content);

        Assert.Same(_content.Object, result);
        _inner.Verify(p => p.ListVersions(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetLayer_PublishedVersion_FetchesLayer()
    {
        IAppDistContent? result = await _provider.GetLayer(PublishedVersion, AppDistLayer.Schemas);

        Assert.Same(_content.Object, result);
        _inner.Verify(p => p.GetLayer(PublishedVersion, AppDistLayer.Schemas, It.IsAny<CancellationToken>()));
    }

    [Fact]
    public async Task GetLayer_UnknownVersion_ReturnsNullWithoutFetchingAndListsVersionsOnce()
    {
        IAppDistContent? first = await _provider.GetLayer(UnknownVersion, AppDistLayer.Content);
        IAppDistContent? second = await _provider.GetLayer("4.5.6", AppDistLayer.Schemas);

        Assert.Null(first);
        Assert.Null(second);
        _inner.Verify(
            p => p.GetLayer(It.IsAny<string>(), It.IsAny<AppDistLayer>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
        _inner.Verify(p => p.ListVersions(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetLayer_UnknownVersion_ListsVersionsAgainAfterCacheDuration()
    {
        await _provider.GetLayer(UnknownVersion, AppDistLayer.Content);
        _time.Advance(s_cacheDuration);
        _inner.Setup(p => p.ListVersions(It.IsAny<CancellationToken>())).ReturnsAsync([UnknownVersion]);

        IAppDistContent? result = await _provider.GetLayer(UnknownVersion, AppDistLayer.Content);

        Assert.Same(_content.Object, result);
        _inner.Verify(p => p.ListVersions(It.IsAny<CancellationToken>()), Times.Exactly(2));
    }

    [Fact]
    public async Task ListVersions_ReusesResultWithinCacheDuration()
    {
        IReadOnlyList<string> first = await _provider.ListVersions();
        _time.Advance(s_cacheDuration - TimeSpan.FromSeconds(1));
        IReadOnlyList<string> second = await _provider.ListVersions();

        Assert.Equal([PublishedVersion], first);
        Assert.Same(first, second);
        _inner.Verify(p => p.ListVersions(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ListVersions_RegistryFailure_IsReusedWithinCacheDuration()
    {
        _inner
            .Setup(p => p.ListVersions(It.IsAny<CancellationToken>()))
            .ThrowsAsync(new AppDistSourceUnavailableException("rate limited"));

        var first = await Assert.ThrowsAsync<AppDistSourceUnavailableException>(() => _provider.ListVersions());
        var second = await Assert.ThrowsAsync<AppDistSourceUnavailableException>(() =>
            _provider.GetLayer(UnknownVersion, AppDistLayer.Content)
        );

        Assert.Same(first, second);
        _inner.Verify(p => p.ListVersions(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ListVersions_RegistryFailure_IsRetriedAfterCacheDuration()
    {
        _inner
            .Setup(p => p.ListVersions(It.IsAny<CancellationToken>()))
            .ThrowsAsync(new AppDistSourceUnavailableException("rate limited"));
        await Assert.ThrowsAsync<AppDistSourceUnavailableException>(() => _provider.ListVersions());
        _time.Advance(s_cacheDuration);
        _inner.Setup(p => p.ListVersions(It.IsAny<CancellationToken>())).ReturnsAsync([PublishedVersion]);

        IReadOnlyList<string> versions = await _provider.ListVersions();

        Assert.Equal([PublishedVersion], versions);
    }

    [Fact]
    public async Task ListVersions_ConcurrentCallers_ListVersionsOnce()
    {
        var registryCall = new TaskCompletionSource<IReadOnlyList<string>>();
        _inner.Setup(p => p.ListVersions(It.IsAny<CancellationToken>())).Returns(registryCall.Task);

        Task<IReadOnlyList<string>> first = _provider.ListVersions();
        Task<IReadOnlyList<string>> second = _provider.ListVersions();
        registryCall.SetResult([PublishedVersion]);

        Assert.Equal([PublishedVersion], await first);
        Assert.Equal([PublishedVersion], await second);
        _inner.Verify(p => p.ListVersions(It.IsAny<CancellationToken>()), Times.Once);
    }
}
