using Altinn.App.Core.Internal.InstanceLocking;

namespace Altinn.App.Api.Tests.Mocks;

internal sealed class InstanceLockerMock : IInstanceLocker
{
    public ValueTask LockAsync() => ValueTask.CompletedTask;

    public ValueTask LockAsync(TimeSpan ttl) => ValueTask.CompletedTask;

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;
}
