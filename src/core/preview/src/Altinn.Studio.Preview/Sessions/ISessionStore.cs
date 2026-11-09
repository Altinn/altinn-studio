using Altinn.Studio.Preview.Files;

namespace Altinn.Studio.Preview.Sessions;

/// <summary>
/// Keeps the sessions and what the app does in each of them, such as the instances it creates and their form data.
/// A session and its state are one entry, so they end together.
/// </summary>
internal interface ISessionStore
{
    /// <summary>Starts a session for a working copy, with no state.</summary>
    Task<SessionId> Start(WorkingCopy workingCopy, CancellationToken cancellationToken);

    /// <summary>
    /// The session, or <c>null</c> when it has ended. Restarts the session's idle time, so every request to preview
    /// keeps its session going.
    /// </summary>
    Task<PreviewSession?> FindAndRenew(SessionId sessionId, CancellationToken cancellationToken);

    /// <summary>The session's state, or <c>null</c> when the session has ended.</summary>
    Task<MockState?> ReadState(SessionId sessionId, CancellationToken cancellationToken);

    /// <summary>
    /// Changes the session's state. <paramref name="change"/> gets the current state, changes it and returns what the
    /// caller needs from it. When another request changed the state in the meantime, the store calls it again with the
    /// newer state, so a change must not do anything but change the state it gets. Returns <c>null</c> when the
    /// session has ended.
    /// </summary>
    Task<StateChange<T>?> Update<T>(
        SessionId sessionId,
        Func<MockState, T> change,
        CancellationToken cancellationToken
    );

    /// <summary>Fails when the store can't be reached.</summary>
    Task CheckReachable(CancellationToken cancellationToken);
}

/// <summary>What a change of a session's state returned.</summary>
internal sealed record StateChange<T>(T Result);
