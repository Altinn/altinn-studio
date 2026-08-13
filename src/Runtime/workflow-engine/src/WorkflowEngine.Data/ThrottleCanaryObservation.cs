using WorkflowEngine.Models;

namespace WorkflowEngine.Data;

/// <summary>
/// The sweep's per-probe view of a canary workflow: its current status and the requeue count of
/// its current (first non-terminal) step. Judged against the count recorded at selection —
/// never against timing — which makes the check race-free against a canary being mid-attempt at
/// sweep time.
/// </summary>
internal sealed record ThrottleCanaryObservation(Guid WorkflowId, PersistentItemStatus Status, int RequeueCount);
