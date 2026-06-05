namespace Altinn.App.Core.Internal.InstanceLocking;

internal interface IInstanceLock : IAsyncDisposable
{
    Task Lock(TimeSpan? ttl = null);

    Task UpdateTtl(TimeSpan ttl);
}
