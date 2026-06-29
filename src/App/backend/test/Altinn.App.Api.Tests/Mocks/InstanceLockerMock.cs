using Altinn.App.Core.Internal.InstanceLocking;

namespace Altinn.App.Api.Tests.Mocks;

internal sealed class InstanceLockerMock : IInstanceLocker
{
    private string? _externalLockToken;
    private string? _currentLockToken;

    public IInstanceLock InitLock()
    {
        _currentLockToken ??= "mock-lock-token";
        return NoOpLock.Instance;
    }

    public IInstanceLock InitLock(int instanceOwnerPartyId, Guid instanceGuid)
    {
        _currentLockToken ??= "mock-lock-token";
        return NoOpLock.Instance;
    }

    public Task<IInstanceLock> Lock()
    {
        _currentLockToken ??= "mock-lock-token";
        return Task.FromResult<IInstanceLock>(NoOpLock.Instance);
    }

    public Task<IInstanceLock> Lock(TimeSpan ttl)
    {
        _currentLockToken ??= "mock-lock-token";
        return Task.FromResult<IInstanceLock>(NoOpLock.Instance);
    }

    public string? CurrentLockToken => _externalLockToken ?? _currentLockToken;

    public void UseExternalLockToken(string lockToken) => _externalLockToken = lockToken;

    private sealed class NoOpLock : IInstanceLock
    {
        public static readonly NoOpLock Instance = new();

        public Task Lock(TimeSpan? ttl = null) => Task.CompletedTask;

        public Task UpdateTtl(TimeSpan ttl) => Task.CompletedTask;

        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }
}
