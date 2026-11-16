namespace WorkflowEngine.Models;

/// <summary>
/// When the engine ends a collection's event stream on its own (<c>?until=</c>). Without it, only the client, the
/// collection's deletion or the instance's shutdown ends the stream.
/// </summary>
public enum CollectionEventsUntil
{
    /// <summary>
    /// After the first snapshot in which the collection has a head and every head is terminal. A
    /// <see cref="PersistentItemStatus.Waiting"/> or <see cref="PersistentItemStatus.Held"/> head is not terminal.
    /// </summary>
    Settled = 0,
}
