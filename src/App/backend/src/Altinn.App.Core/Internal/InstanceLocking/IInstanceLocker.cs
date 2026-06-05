namespace Altinn.App.Core.Internal.InstanceLocking;

internal interface IInstanceLocker
{
    IInstanceLock InitLock();

    Task<IInstanceLock> Lock();

    Task<IInstanceLock> Lock(TimeSpan ttl);

    string? CurrentLockToken { get; }
}
