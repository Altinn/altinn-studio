using Altinn.Studio.Preview.Files;
using Altinn.Studio.Preview.Sessions;

namespace Altinn.Studio.Preview.Tests;

/// <summary>A session store that is down.</summary>
internal sealed class UnavailableSessionStore : ISessionStore
{
    public Task<SessionId> Start(WorkingCopy workingCopy, CancellationToken cancellationToken) =>
        throw new InvalidOperationException("Redis is down.");

    public Task<PreviewSession?> FindAndRenew(SessionId sessionId, CancellationToken cancellationToken) =>
        throw new InvalidOperationException("Redis is down.");

    public Task<MockState?> ReadState(SessionId sessionId, CancellationToken cancellationToken) =>
        throw new InvalidOperationException("Redis is down.");

    public Task<StateChange<T>?> Update<T>(
        SessionId sessionId,
        Func<MockState, T> change,
        CancellationToken cancellationToken
    ) => throw new InvalidOperationException("Redis is down.");

    public Task CheckReachable(CancellationToken cancellationToken) =>
        throw new InvalidOperationException("Redis is down.");
}
