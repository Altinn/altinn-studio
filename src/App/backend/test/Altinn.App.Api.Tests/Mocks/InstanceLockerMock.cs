using Altinn.App.Core.Internal.InstanceLocking;

namespace Altinn.App.Api.Tests.Mocks;

internal sealed class InstanceLockerMock : IInstanceLocker
{
    public IInstanceLock InitLock() => NoOpLock.Instance;

    public Task<IInstanceLock> Lock() => Task.FromResult<IInstanceLock>(NoOpLock.Instance);

    public Task<IInstanceLock> Lock(TimeSpan ttl) => Task.FromResult<IInstanceLock>(NoOpLock.Instance);

    public string? CurrentLockToken => null;

    private sealed class NoOpLock : IInstanceLock
    {
        public static readonly NoOpLock Instance = new();

        public Task Lock(TimeSpan? ttl = null) => Task.CompletedTask;

        public Task UpdateTtl(TimeSpan ttl) => Task.CompletedTask;

        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }
}
