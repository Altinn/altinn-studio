namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Durable checkpoints for a service task — the send guard for send-then-poll work, stored as
/// instance data values keyed <c>serviceTask:{Type}:{key}</c>. Exposed on
/// <see cref="ServiceTaskContext.Checkpoints"/>; the runtime supplies the Storage-backed
/// implementation, and a unit test constructing a context injects a fake (an in-memory dictionary
/// is enough).
/// </summary>
/// <remarks>
/// Checkpoints are instance metadata: visible to anyone who can read the instance, retained for
/// the instance's lifetime (a useful audit trail), and sized for identifiers and markers — never
/// secrets or documents. Keys are instance-scoped by design: to scope a value to one pass through
/// the task, put the pass identity in the value (e.g. <c>$"{context.WorkflowId}:{receiptId}"</c>)
/// and compare on re-entry — a repeated visit to the task (BPMN round trip) reads the earlier
/// pass's checkpoint and must decide deliberately whether to skip, fail, or redo.
/// </remarks>
public interface IServiceTaskCheckpoints
{
    /// <summary>
    /// Records a checkpoint. Written to Storage immediately — deliberately <em>not</em> part of the
    /// save-on-success unit of work, because its job is to survive an attempt that fails after a side
    /// effect. Record the receipt in the same attempt that sends, and branch on <see cref="Get"/> —
    /// never on engine bookkeeping like <see cref="ServiceTaskWait.DeferCount"/>.
    /// </summary>
    /// <param name="key">Checkpoint name, unique within this task type.</param>
    /// <param name="value">The evidence to record; overwrites any previous value for the key.</param>
    Task Set(string key, string value);

    /// <summary>
    /// Reads a checkpoint recorded by <see cref="Set"/>, or <c>null</c> when none exists. Reads
    /// through to Storage (fetched once per attempt) rather than this attempt's execution snapshot,
    /// so a checkpoint written by a crashed attempt is visible to its retry. A failed read throws
    /// instead of returning <c>null</c> — <c>null</c> strictly means "never recorded", so a send
    /// guard can trust it.
    /// </summary>
    /// <param name="key">Checkpoint name, unique within this task type.</param>
    Task<string?> Get(string key);
}
