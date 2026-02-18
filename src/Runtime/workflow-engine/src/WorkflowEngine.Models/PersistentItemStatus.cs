namespace WorkflowEngine.Models;

public enum PersistentItemStatus
{
    /// <summary>
    /// The item is waiting to be processed.
    /// </summary>
    Enqueued = 0,

    /// <summary>
    ///  The item is currently being processed.
    /// </summary>
    Processing = 1,

    /// <summary>
    /// The item has been requeued after a failure.
    /// </summary>
    Requeued = 2,

    /// <summary>
    /// The item has completed successfully.
    /// </summary>
    Completed = 3,

    /// <summary>
    /// The item has completed with a failure.
    /// </summary>
    Failed = 4,

    /// <summary>
    /// The item has been canceled.
    /// </summary>
    Canceled = 5,
}
