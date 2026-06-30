namespace Altinn.App.Core.Internal.InstanceLocking;

internal interface IInstanceLocker
{
    IInstanceLock InitLock();

    IInstanceLock InitLock(int instanceOwnerPartyId, Guid instanceGuid);

    Task<IInstanceLock> Lock();

    Task<IInstanceLock> Lock(TimeSpan ttl);

    string? CurrentLockToken { get; }

    void UseExternalLockToken(string lockToken);
}
