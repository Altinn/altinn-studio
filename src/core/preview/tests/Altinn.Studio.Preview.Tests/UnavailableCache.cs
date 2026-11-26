using Microsoft.Extensions.Caching.Distributed;

namespace Altinn.Studio.Preview.Tests;

/// <summary>A session store that is down.</summary>
internal sealed class UnavailableCache : IDistributedCache
{
    public byte[]? Get(string key) => throw new InvalidOperationException("Redis is down.");

    public Task<byte[]?> GetAsync(string key, CancellationToken token = default) =>
        throw new InvalidOperationException("Redis is down.");

    public void Refresh(string key) => throw new InvalidOperationException("Redis is down.");

    public Task RefreshAsync(string key, CancellationToken token = default) =>
        throw new InvalidOperationException("Redis is down.");

    public void Remove(string key) => throw new InvalidOperationException("Redis is down.");

    public Task RemoveAsync(string key, CancellationToken token = default) =>
        throw new InvalidOperationException("Redis is down.");

    public void Set(string key, byte[] value, DistributedCacheEntryOptions options) =>
        throw new InvalidOperationException("Redis is down.");

    public Task SetAsync(
        string key,
        byte[] value,
        DistributedCacheEntryOptions options,
        CancellationToken token = default
    ) => throw new InvalidOperationException("Redis is down.");
}
