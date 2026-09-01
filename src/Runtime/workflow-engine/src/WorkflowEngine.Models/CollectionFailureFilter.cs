namespace WorkflowEngine.Models;

/// <summary>
/// Discovery filter for the collection list endpoint (<c>?failures=</c>): restricts the result to
/// collections containing at least one unsuccessfully terminal workflow
/// (<see cref="PersistentItemStatus.Failed"/>, <see cref="PersistentItemStatus.Canceled"/>,
/// <see cref="PersistentItemStatus.DependencyFailed"/>).
/// <see cref="PersistentItemStatus.Abandoned"/> never matches — it is the engine's adjudication
/// marker for a written-off failure.
/// </summary>
public enum CollectionFailureFilter
{
    /// <summary>
    /// Collections with at least one failed workflow, regardless of head visibility.
    /// </summary>
    Any = 0,

    /// <summary>
    /// Collections with at least one failed workflow visible to the head frontier
    /// (<c>isHead</c> directive not <c>false</c>).
    /// </summary>
    Visible = 1,

    /// <summary>
    /// Collections with at least one failed workflow enqueued with <c>isHead = false</c> —
    /// failures the head frontier deliberately hides.
    /// </summary>
    Invisible = 2,
}
