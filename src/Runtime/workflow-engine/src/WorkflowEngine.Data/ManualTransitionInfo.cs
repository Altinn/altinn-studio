namespace WorkflowEngine.Data;

/// <summary>
/// The workflow a manual transition's compare-and-set moved, carrying <c>is_head</c> out so the metric can be
/// tagged without a second read.
/// </summary>
internal sealed record ManualTransitionInfo(Guid WorkflowId, bool? IsHead);
