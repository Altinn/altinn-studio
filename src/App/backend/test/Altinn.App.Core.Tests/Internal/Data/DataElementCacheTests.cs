using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Tests.Internal.Data;

public sealed class DataElementCacheTests
{
    [Fact]
    public async Task Remove_WhenEntryTaskIsIncomplete_RemovesEntryAndKey()
    {
        var cache = new DataElementCache<string>();
        var identifier = new DataElementIdentifier(Guid.NewGuid());
        var pendingValue = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);
        Task<string> pendingGet = cache.GetOrCreate(identifier, () => pendingValue.Task);

        cache.Remove(identifier);
        Task<string> refreshedGet = cache.GetOrCreate(identifier, () => Task.FromResult("refreshed"));
        Assert.True(refreshedGet.IsCompletedSuccessfully);
        pendingValue.SetResult("stale");

        Assert.Equal("stale", await pendingGet);
        Assert.Equal("refreshed", await refreshedGet);
        Assert.Equal((identifier, "refreshed"), Assert.Single(cache.GetCachedEntries()));
    }

    [Fact]
    public void Remove_WhenEntryIsAbsent_IsNoOp()
    {
        var cache = new DataElementCache<string>();
        var existingIdentifier = new DataElementIdentifier(Guid.NewGuid());
        cache.Set(existingIdentifier, "existing");

        cache.Remove(new DataElementIdentifier(Guid.NewGuid()));

        Assert.Equal((existingIdentifier, "existing"), Assert.Single(cache.GetCachedEntries()));
    }
}
