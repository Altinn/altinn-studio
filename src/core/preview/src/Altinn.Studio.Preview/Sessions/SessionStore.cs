using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Studio.Preview.Files;
using StackExchange.Redis;

namespace Altinn.Studio.Preview.Sessions;

/// <summary>
/// Keeps each session in the service's own Redis as one hash, so that every replica knows it and it outlasts a
/// restart. The session and its state are fields of the same key, so they expire together.
/// </summary>
/// <remarks>
/// A change of the state reads it with its revision, and writes it in a transaction that commits only while the
/// revision is the same, so two requests that change the state at once, such as two uploads, don't lose either change.
/// </remarks>
internal sealed partial class SessionStore(IConnectionMultiplexer redis, TimeProvider timeProvider) : ISessionStore
{
    /// <summary>What the keys of the sessions start with in Redis.</summary>
    public const string KeyPrefix = "session:";

    private const string SessionField = "session";
    private const string StateField = "state";
    private const string RevisionField = "revision";

    /// <summary>
    /// How often a change is tried before the store gives up, when other requests keep changing the state.
    /// </summary>
    private const int MaxAttempts = 10;

    private IDatabase Database => redis.GetDatabase();

    public async Task<SessionId> Start(WorkingCopy workingCopy, CancellationToken cancellationToken)
    {
        var sessionId = SessionId.New();
        var session = new PreviewSession(workingCopy, timeProvider.GetUtcNow());
        RedisKey key = Key(sessionId);

        ITransaction transaction = Database.CreateTransaction();
        _ = transaction.HashSetAsync(
            key,
            [
                new HashEntry(
                    SessionField,
                    JsonSerializer.SerializeToUtf8Bytes(
                        StoredSession.From(session),
                        SessionStoreJsonContext.Default.StoredSession
                    )
                ),
                new HashEntry(RevisionField, 0),
            ]
        );
        _ = transaction.KeyExpireAsync(key, SessionLifetime.TimeToLive(session.StartedAt, session.StartedAt));
        await transaction.ExecuteAsync().WaitAsync(cancellationToken);
        return sessionId;
    }

    public async Task<PreviewSession?> FindAndRenew(SessionId sessionId, CancellationToken cancellationToken)
    {
        RedisKey key = Key(sessionId);
        RedisValue stored = await Database.HashGetAsync(key, SessionField).WaitAsync(cancellationToken);
        PreviewSession? session = stored.IsNull
            ? null
            : JsonSerializer
                .Deserialize(((ReadOnlyMemory<byte>)stored).Span, SessionStoreJsonContext.Default.StoredSession)
                ?.ToSession();
        if (session is null)
        {
            return null;
        }

        TimeSpan? timeToLive = SessionLifetime.TimeToLive(session.StartedAt, timeProvider.GetUtcNow());
        if (timeToLive is null)
        {
            await Database.KeyDeleteAsync(key).WaitAsync(cancellationToken);
            return null;
        }

        await Database.KeyExpireAsync(key, timeToLive).WaitAsync(cancellationToken);
        return session;
    }

    public async Task<MockState?> ReadState(SessionId sessionId, CancellationToken cancellationToken)
    {
        (MockState State, long Revision)? current = await Read(Key(sessionId), cancellationToken);
        return current?.State;
    }

    public async Task<StateChange<T>?> Update<T>(
        SessionId sessionId,
        Func<MockState, T> change,
        CancellationToken cancellationToken
    )
    {
        RedisKey key = Key(sessionId);
        for (int attempt = 0; attempt < MaxAttempts; attempt++)
        {
            if (await Read(key, cancellationToken) is not var (state, revision))
            {
                return null;
            }

            T result = change(state);

            ITransaction transaction = Database.CreateTransaction();
            transaction.AddCondition(Condition.HashEqual(key, RevisionField, revision));
            _ = transaction.HashSetAsync(
                key,
                [
                    new HashEntry(
                        StateField,
                        JsonSerializer.SerializeToUtf8Bytes(state, SessionStoreJsonContext.Default.MockState)
                    ),
                    new HashEntry(RevisionField, revision + 1),
                ]
            );
            if (await transaction.ExecuteAsync().WaitAsync(cancellationToken))
            {
                return new StateChange<T>(result);
            }
        }

        throw new InvalidOperationException(
            $"The session's state changed {MaxAttempts} times while a request tried to change it."
        );
    }

    public Task CheckReachable(CancellationToken cancellationToken) =>
        Database.PingAsync().WaitAsync(cancellationToken);

    /// <summary>
    /// The key a session is kept under: a hash of its ID, so a copy of Redis holds no ID that opens a session.
    /// </summary>
    private static RedisKey Key(SessionId sessionId) => KeyPrefix + sessionId.StorageKey;

    private async Task<(MockState State, long Revision)?> Read(RedisKey key, CancellationToken cancellationToken)
    {
        RedisValue[] values = await Database
            .HashGetAsync(key, [StateField, RevisionField])
            .WaitAsync(cancellationToken);
        if (values[1].IsNull)
        {
            return null;
        }

        MockState state = values[0].IsNull
            ? new MockState()
            : JsonSerializer.Deserialize(
                ((ReadOnlyMemory<byte>)values[0]).Span,
                SessionStoreJsonContext.Default.MockState
            ) ?? new MockState();
        return (state, (long)values[1]);
    }

    internal sealed record StoredSession(string Developer, string Org, string App, DateTimeOffset StartedAt)
    {
        public static StoredSession From(PreviewSession session) =>
            new(session.WorkingCopy.Developer, session.WorkingCopy.Org, session.WorkingCopy.App, session.StartedAt);

        /// <summary>The session, or <c>null</c> when the entry names no valid working copy.</summary>
        public PreviewSession? ToSession() =>
            WorkingCopy.TryCreate(Developer, Org, App, out WorkingCopy? workingCopy)
                ? new PreviewSession(workingCopy, StartedAt)
                : null;
    }

    [JsonSerializable(typeof(StoredSession))]
    [JsonSerializable(typeof(MockState))]
    [JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
    internal sealed partial class SessionStoreJsonContext : JsonSerializerContext;
}
