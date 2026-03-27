namespace WorkflowEngine.Models;

public sealed record ResumeWorkflowResponse(
    Guid WorkflowId,
    DateTimeOffset ResumedAt,
    IReadOnlyList<Guid> CascadeResumed
);
