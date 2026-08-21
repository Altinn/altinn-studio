namespace WorkflowEngine.Data;

/// <summary>
/// One caller's request waiting in a batch buffer, in the two respects a buffer handles generically: the
/// completion it answers the caller through, and the trace context of the call that joined the batch. Everything
/// else about a request is the batch repository method's business, not the buffer's.
/// </summary>
/// <typeparam name="TResult">The verdict this request is answered with.</typeparam>
internal interface IBufferedRequest<TResult>
{
    /// <summary>
    /// Completed by the flush's fan-out with the result at this request's position. Created with
    /// <see cref="TaskCreationOptions.RunContinuationsAsynchronously"/> so a waiting caller's continuation
    /// cannot run on — and stall — the flush loop.
    /// </summary>
    TaskCompletionSource<TResult> Completion { get; }

    /// <summary>
    /// The enqueueing activity's id, linked from the flush's own activity so a request keeps its trace across
    /// the hand-off to the flush loop. Null when nothing was sampled.
    /// </summary>
    string? TraceContext { get; }
}
