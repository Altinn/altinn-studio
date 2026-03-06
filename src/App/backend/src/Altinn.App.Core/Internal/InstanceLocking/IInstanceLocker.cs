namespace Altinn.App.Core.Internal.InstanceLocking;

internal interface IInstanceLocker : IAsyncDisposable
{
    ValueTask LockAsync();

    ValueTask LockAsync(TimeSpan ttl);
}
