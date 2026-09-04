using WorkflowEngine.Models;

namespace WorkflowEngine.Data;

/// <summary>
/// The workflow a manual failure moved to <see cref="PersistentItemStatus.Failed"/>, carrying the
/// head-visibility directive out of the compare-and-set so the failure metric can be tagged like every
/// other failure without a second read.
/// </summary>
internal sealed record WorkflowFailureInfo(Guid WorkflowId, bool? IsHead);
