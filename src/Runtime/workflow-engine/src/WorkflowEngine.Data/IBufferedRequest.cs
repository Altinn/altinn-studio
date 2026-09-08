namespace WorkflowEngine.Data;

/// <summary>
/// One caller's request waiting in a batch buffer, in the two respects a buffer handles generically.
/// </summary>
internal interface IBufferedRequest<TResult>
{
    /// <summary>
    /// Completed by the flush's fan-out with the result at this request's position. Must be created with
    /// <see cref="TaskCreationOptions.RunContinuationsAsynchronously"/>, or a waiting caller's continuation can
    /// run on — and stall — the flush loop.
    /// </summary>
    TaskCompletionSource<TResult> Completion { get; }

    /// <summary>
    /// The enqueuing activity's id, linked from the flush's own activity so a request keeps its trace across the
    /// hand-off.
    /// </summary>
    string? TraceContext { get; }
}
