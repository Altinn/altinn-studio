#nullable enable
using System;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Models;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Designer.Tests.Services;

public class StudioctlInstallScriptServiceTests
{
    [Fact]
    public async Task GetInstallScriptAsync_CachesSuccessfulFetch()
    {
        byte[] payload = System.Text.Encoding.UTF8.GetBytes("echo ok");
        var handler = new TestHttpMessageHandler(_ =>
            new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new ByteArrayContent(payload)
            });

        var service = CreateService(handler);

        StudioctlInstallScriptResult first =
            await service.GetInstallScriptAsync(StudioctlInstallScriptType.Bash, CancellationToken.None);
        StudioctlInstallScriptResult second =
            await service.GetInstallScriptAsync(StudioctlInstallScriptType.Bash, CancellationToken.None);

        Assert.Equal(StudioctlInstallScriptStatus.Ok, first.Status);
        Assert.Equal("install.sh", first.FileName);
        Assert.Equal(payload, first.Content);
        Assert.Equal(1, handler.CallCount);
        Assert.Equal(StudioctlInstallScriptStatus.Ok, second.Status);
    }

    [Fact]
    public async Task GetInstallScriptAsync_NoCache_NotFound()
    {
        var handler = new TestHttpMessageHandler(_ =>
            new HttpResponseMessage(HttpStatusCode.NotFound));

        var service = CreateService(handler);

        StudioctlInstallScriptResult result =
            await service.GetInstallScriptAsync(StudioctlInstallScriptType.Bash, CancellationToken.None);

        Assert.Equal(StudioctlInstallScriptStatus.NotFound, result.Status);
    }

    [Fact]
    public async Task GetInstallScriptAsync_NoCache_Unavailable()
    {
        var handler = new TestHttpMessageHandler(_ =>
            new HttpResponseMessage(HttpStatusCode.ServiceUnavailable));

        var service = CreateService(handler);

        StudioctlInstallScriptResult result =
            await service.GetInstallScriptAsync(StudioctlInstallScriptType.PowerShell, CancellationToken.None);

        Assert.Equal(StudioctlInstallScriptStatus.Unavailable, result.Status);
    }

    [Fact]
    public async Task GetInstallScriptAsync_NoCache_TransportException_ReturnsUnavailable()
    {
        var handler = new TestHttpMessageHandler(_ => throw new HttpRequestException("DNS failure"));

        var service = CreateService(handler);

        StudioctlInstallScriptResult result =
            await service.GetInstallScriptAsync(StudioctlInstallScriptType.PowerShell, CancellationToken.None);

        Assert.Equal(StudioctlInstallScriptStatus.Unavailable, result.Status);
    }

    [Fact]
    public async Task GetInstallScriptAsync_NoCache_Timeout_ReturnsUnavailable()
    {
        var handler = new TestHttpMessageHandler(_ => throw new TaskCanceledException("timeout"));

        var service = CreateService(handler);

        StudioctlInstallScriptResult result =
            await service.GetInstallScriptAsync(StudioctlInstallScriptType.Bash, CancellationToken.None);

        Assert.Equal(StudioctlInstallScriptStatus.Unavailable, result.Status);
    }

    [Fact]
    public async Task GetInstallScriptAsync_StaleCache_ReturnsCached()
    {
        byte[] payload = System.Text.Encoding.UTF8.GetBytes("cached");
        var handler = new TestHttpMessageHandler(_ =>
            new HttpResponseMessage(HttpStatusCode.ServiceUnavailable));

        var cache = new MemoryCache(new MemoryCacheOptions());
        cache.Set(
            "studioctl-install-script:" + StudioctlInstallScriptType.Bash,
            new StudioctlInstallScriptService.StudioctlInstallScriptCacheEntry(
                payload,
                DateTimeOffset.UtcNow.AddHours(-2)));

        var service = new StudioctlInstallScriptService(
            new TestHttpClientFactory(handler),
            cache,
            NullLogger<StudioctlInstallScriptService>.Instance);

        StudioctlInstallScriptResult result =
            await service.GetInstallScriptAsync(StudioctlInstallScriptType.Bash, CancellationToken.None);

        Assert.Equal(StudioctlInstallScriptStatus.Ok, result.Status);
        Assert.Equal(payload, result.Content);
    }

    private static StudioctlInstallScriptService CreateService(TestHttpMessageHandler handler)
        => new(
            new TestHttpClientFactory(handler),
            new MemoryCache(new MemoryCacheOptions()),
            NullLogger<StudioctlInstallScriptService>.Instance);

    private sealed class TestHttpClientFactory : IHttpClientFactory
    {
        private readonly HttpMessageHandler _handler;

        public TestHttpClientFactory(HttpMessageHandler handler)
        {
            _handler = handler;
        }

        public HttpClient CreateClient(string name) => new(_handler, disposeHandler: false);
    }

    private sealed class TestHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _handler;

        public TestHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> handler)
        {
            _handler = handler;
        }

        public int CallCount { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            CallCount++;
            return Task.FromResult(_handler(request));
        }
    }
}
