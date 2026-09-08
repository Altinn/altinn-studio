using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Data;

/// <summary>
/// A <c>Requeued</c> workflow eligible for throttle parking, carrying exactly the fields the
/// per-stamp retry-deadline clamp needs: the current step's retry strategy and the inputs to the
/// retry anchor rule (last deferral, previous step completion, step creation). The sweep computes
/// the clamped <c>throttled_until</c> per row in C# — reusing the handler's anchor/deadline code —
/// rather than approximating the rule in SQL.
/// </summary>
internal sealed record ThrottleParkCandidate(
    Guid WorkflowId,
    RetryStrategy? RetryStrategy,
    DateTimeOffset? LastDeferredAt,
    DateTimeOffset StepCreatedAt,
    DateTimeOffset? PreviousStepUpdatedAt
);
