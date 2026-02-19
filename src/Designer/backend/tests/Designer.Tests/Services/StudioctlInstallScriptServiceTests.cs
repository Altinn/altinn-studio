#nullable enable
using System;
using System.Net;
using System.Net.Http;
using System.Text;
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
        byte[] payload = Encoding.UTF8.GetBytes("echo ok");
        var handler = new TestHttpMessageHandler(request =>
        {
            if (IsReleaseLookupRequest(request))
            {
                return CreateReleaseLookupResponse(
                    """
                    [{ "tag_name": "studioctl/v1.2.3", "draft": false, "prerelease": false }]
                    """);
            }

            Assert.Equal(
                "/Altinn/altinn-studio/releases/download/studioctl/v1.2.3/install.sh",
                request.RequestUri?.AbsolutePath);

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new ByteArrayContent(payload)
            };
        });

        var service = CreateService(handler);

        StudioctlInstallScriptResult first =
            await service.GetInstallScriptAsync(StudioctlInstallScriptType.Bash, CancellationToken.None);
        StudioctlInstallScriptResult second =
            await service.GetInstallScriptAsync(StudioctlInstallScriptType.Bash, CancellationToken.None);

        Assert.Equal(StudioctlInstallScriptStatus.Ok, first.Status);
        Assert.Equal("install.sh", first.FileName);
        Assert.Equal(payload, first.Content);
        Assert.Equal(2, handler.CallCount);
        Assert.Equal(StudioctlInstallScriptStatus.Ok, second.Status);
    }

    [Fact]
    public async Task GetInstallScriptAsync_NoCache_NotFound()
    {
        var handler = new TestHttpMessageHandler(request =>
        {
            if (IsReleaseLookupRequest(request))
            {
                return CreateReleaseLookupResponse(
                    """
                    [
                      { "tag_name": "v2026.1", "draft": false, "prerelease": false },
                      { "tag_name": "studioctl/v1.2.3-preview.1", "draft": false, "prerelease": true }
                    ]
                    """);
            }

            throw new InvalidOperationException("Asset download should not be attempted when no stable studioctl release exists.");
        });

        var service = CreateService(handler);

        StudioctlInstallScriptResult result =
            await service.GetInstallScriptAsync(StudioctlInstallScriptType.Bash, CancellationToken.None);

        Assert.Equal(StudioctlInstallScriptStatus.NotFound, result.Status);
    }

    [Fact]
    public async Task GetInstallScriptAsync_NoCache_Unavailable()
    {
        var handler = new TestHttpMessageHandler(request =>
        {
            if (IsReleaseLookupRequest(request))
            {
                return CreateReleaseLookupResponse(
                    """
                    [{ "tag_name": "studioctl/v1.2.3", "draft": false, "prerelease": false }]
                    """);
            }

            return new HttpResponseMessage(HttpStatusCode.ServiceUnavailable);
        });

        var service = CreateService(handler);

        StudioctlInstallScriptResult result =
            await service.GetInstallScriptAsync(StudioctlInstallScriptType.PowerShell, CancellationToken.None);

        Assert.Equal(StudioctlInstallScriptStatus.Unavailable, result.Status);
    }

    [Fact]
    public async Task GetInstallScriptAsync_NoCache_TransportException_ReturnsUnavailable()
    {
        var handler = new TestHttpMessageHandler(request =>
        {
            if (IsReleaseLookupRequest(request))
            {
                return CreateReleaseLookupResponse(
                    """
                    [{ "tag_name": "studioctl/v1.2.3", "draft": false, "prerelease": false }]
                    """);
            }

            throw new HttpRequestException("DNS failure");
        });

        var service = CreateService(handler);

        StudioctlInstallScriptResult result =
            await service.GetInstallScriptAsync(StudioctlInstallScriptType.PowerShell, CancellationToken.None);

        Assert.Equal(StudioctlInstallScriptStatus.Unavailable, result.Status);
    }

    [Fact]
    public async Task GetInstallScriptAsync_NoCache_Timeout_ReturnsUnavailable()
    {
        var handler = new TestHttpMessageHandler(request =>
        {
            if (IsReleaseLookupRequest(request))
            {
                return CreateReleaseLookupResponse(
                    """
                    [{ "tag_name": "studioctl/v1.2.3", "draft": false, "prerelease": false }]
                    """);
            }

            throw new TaskCanceledException("timeout");
        });

        var service = CreateService(handler);

        StudioctlInstallScriptResult result =
            await service.GetInstallScriptAsync(StudioctlInstallScriptType.Bash, CancellationToken.None);

        Assert.Equal(StudioctlInstallScriptStatus.Unavailable, result.Status);
    }

    [Fact]
    public async Task GetInstallScriptAsync_NoCache_ResponseTooLarge_ReturnsUnavailable()
    {
        byte[] payload = new byte[16 * 1024 * 1024];
        var handler = new TestHttpMessageHandler(request =>
        {
            if (IsReleaseLookupRequest(request))
            {
                return CreateReleaseLookupResponse(
                    """
                    [{ "tag_name": "studioctl/v1.2.3", "draft": false, "prerelease": false }]
                    """);
            }

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new ByteArrayContent(payload)
            };
        });

        var service = CreateService(handler);

        StudioctlInstallScriptResult result =
            await service.GetInstallScriptAsync(StudioctlInstallScriptType.Bash, CancellationToken.None);

        Assert.Equal(StudioctlInstallScriptStatus.Unavailable, result.Status);
    }

    [Fact]
    public async Task GetInstallScriptAsync_StaleCache_ReturnsCached()
    {
        byte[] payload = Encoding.UTF8.GetBytes("cached");
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

    [Fact]
    public async Task GetInstallScriptAsync_NoCache_UsesLatestStableStudioctlReleaseTag()
    {
        byte[] payload = Encoding.UTF8.GetBytes("echo selected tag");
        var handler = new TestHttpMessageHandler(request =>
        {
            if (IsReleaseLookupRequest(request))
            {
                return CreateReleaseLookupResponse(
                    """
                    [
                      { "tag_name": "studioctl/v2.0.0-preview.1", "draft": false, "prerelease": true },
                      { "tag_name": "v2026.4", "draft": false, "prerelease": false },
                      { "tag_name": "studioctl/v1.5.0", "draft": false, "prerelease": false }
                    ]
                    """);
            }

            Assert.Equal(
                "/Altinn/altinn-studio/releases/download/studioctl/v1.5.0/install.sh",
                request.RequestUri?.AbsolutePath);
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new ByteArrayContent(payload)
            };
        });

        var service = CreateService(handler);

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

    private static bool IsReleaseLookupRequest(HttpRequestMessage request)
        => request.RequestUri is not null
            && request.RequestUri.Host == "api.github.com"
            && request.RequestUri.AbsolutePath == "/repos/Altinn/altinn-studio/releases";

    private static HttpResponseMessage CreateReleaseLookupResponse(string json)
        => new(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };

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
