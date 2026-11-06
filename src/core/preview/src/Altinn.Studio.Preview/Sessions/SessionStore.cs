using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Studio.Preview.Files;
using Microsoft.Extensions.Caching.Distributed;

namespace Altinn.Studio.Preview.Sessions;

/// <summary>
/// Keeps the sessions in the service's own Redis, so that every replica knows them and they outlast a restart.
/// </summary>
internal sealed partial class SessionStore(IDistributedCache cache, TimeProvider timeProvider)
{
    /// <summary>What the keys of the sessions start with in Redis.</summary>
    public const string KeyPrefix = "session:";

    public async Task<SessionId> Start(WorkingCopy workingCopy, CancellationToken cancellationToken)
    {
        var sessionId = SessionId.New();
        var session = new PreviewSession(workingCopy, timeProvider.GetUtcNow());
        await cache.SetAsync(
            sessionId.StorageKey,
            JsonSerializer.SerializeToUtf8Bytes(
                StoredSession.From(session),
                StoredSessionJsonContext.Default.StoredSession
            ),
            SessionLifetime.EntryFor(session.StartedAt),
            cancellationToken
        );
        return sessionId;
    }

    /// <summary>
    /// The session, or <c>null</c> when it has ended. Reading the entry restarts the session's idle time, so every
    /// request to preview keeps its session going.
    /// </summary>
    public async Task<PreviewSession?> FindAndRenew(SessionId sessionId, CancellationToken cancellationToken)
    {
        byte[]? entry = await cache.GetAsync(sessionId.StorageKey, cancellationToken);
        return entry is null
            ? null
            : JsonSerializer.Deserialize(entry, StoredSessionJsonContext.Default.StoredSession)?.ToSession();
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
    [JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
    internal sealed partial class StoredSessionJsonContext : JsonSerializerContext;
}
