using System.Text.Json;
using Altinn.Studio.Preview.Files;
using Altinn.Studio.Preview.Sessions;

namespace Altinn.Studio.Preview.Tests;

/// <summary>
/// Sessions in memory, for tests of what the service does with them. Sessions don't end. The state is kept serialized,
/// as Redis keeps it, so a change can't reach the state outside <see cref="Update{T}"/>.
/// </summary>
internal sealed class InMemorySessionStore : ISessionStore
{
    private readonly Lock _lock = new();
    private readonly Dictionary<SessionId, (PreviewSession Session, byte[] State)> _sessions = [];

    public Task<SessionId> Start(WorkingCopy workingCopy, CancellationToken cancellationToken)
    {
        var sessionId = SessionId.New();
        lock (_lock)
        {
            _sessions[sessionId] = (new PreviewSession(workingCopy, DateTimeOffset.UtcNow), Serialize(new MockState()));
        }

        return Task.FromResult(sessionId);
    }

    public Task<PreviewSession?> FindAndRenew(SessionId sessionId, CancellationToken cancellationToken)
    {
        lock (_lock)
        {
            return Task.FromResult(_sessions.TryGetValue(sessionId, out var entry) ? entry.Session : null);
        }
    }

    public Task<MockState?> ReadState(SessionId sessionId, CancellationToken cancellationToken)
    {
        lock (_lock)
        {
            return Task.FromResult(_sessions.TryGetValue(sessionId, out var entry) ? Deserialize(entry.State) : null);
        }
    }

    public Task<StateChange<T>?> Update<T>(
        SessionId sessionId,
        Func<MockState, T> change,
        CancellationToken cancellationToken
    )
    {
        lock (_lock)
        {
            if (!_sessions.TryGetValue(sessionId, out var entry))
            {
                return Task.FromResult<StateChange<T>?>(null);
            }

            MockState state = Deserialize(entry.State);
            T result = change(state);
            _sessions[sessionId] = (entry.Session, Serialize(state));
            return Task.FromResult<StateChange<T>?>(new StateChange<T>(result));
        }
    }

    public Task CheckReachable(CancellationToken cancellationToken) => Task.CompletedTask;

    private static byte[] Serialize(MockState state) =>
        JsonSerializer.SerializeToUtf8Bytes(state, SessionStore.SessionStoreJsonContext.Default.MockState);

    private static MockState Deserialize(byte[] state) =>
        JsonSerializer.Deserialize(state, SessionStore.SessionStoreJsonContext.Default.MockState) ?? new MockState();
}
