using System.Diagnostics;
using System.Net;
using Microsoft.Extensions.Caching.Distributed;

namespace Altinn.Studio.Preview.Tests;

public sealed class HealthTests
{
    [Fact]
    public async Task Ready_IsUnavailable_WhenTheSessionStoreIsDown()
    {
        using var factory = new PreviewApplicationFactory(new UnavailableCache());

        using HttpResponseMessage response = await GetHealth(factory, "/health/ready");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    // A check that waits on its store would otherwise hang the test run.
    [Fact(Timeout = 10_000)]
    public async Task Ready_AnswersBeforeTheProbeTimesOut_WhenTheSessionStoreHangs()
    {
        using var factory = new PreviewApplicationFactory(new HangingCache());
        var stopwatch = Stopwatch.StartNew();

        using HttpResponseMessage response = await GetHealth(factory, "/health/ready");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        // The readiness probe's timeout in infra/kustomize/base/deployment.yaml.
        Assert.InRange(stopwatch.Elapsed, TimeSpan.Zero, TimeSpan.FromSeconds(3));
    }

    [Fact]
    public async Task Live_IsOk_WhenTheSessionStoreIsDown()
    {
        using var factory = new PreviewApplicationFactory(new UnavailableCache());

        using HttpResponseMessage response = await GetHealth(factory, "/health/live");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private static Task<HttpResponseMessage> GetHealth(PreviewApplicationFactory factory, string path) =>
        factory.CreatePublicClient().GetAsync(new Uri(path, UriKind.Relative), TestContext.Current.CancellationToken);

    /// <summary>
    /// A session store that never answers, as Redis's client does while it connects to a Redis that is gone.
    /// </summary>
    private sealed class HangingCache : IDistributedCache
    {
        public byte[]? Get(string key) => throw new NotSupportedException();

        public Task<byte[]?> GetAsync(string key, CancellationToken token = default) =>
            new TaskCompletionSource<byte[]?>().Task;

        public void Refresh(string key) => throw new NotSupportedException();

        public Task RefreshAsync(string key, CancellationToken token = default) => throw new NotSupportedException();

        public void Remove(string key) => throw new NotSupportedException();

        public Task RemoveAsync(string key, CancellationToken token = default) => throw new NotSupportedException();

        public void Set(string key, byte[] value, DistributedCacheEntryOptions options) =>
            throw new NotSupportedException();

        public Task SetAsync(
            string key,
            byte[] value,
            DistributedCacheEntryOptions options,
            CancellationToken token = default
        ) => throw new NotSupportedException();
    }
}
