namespace WorkflowEngine.Models;

/// <summary>
/// Response model listing active workflows for an instance.
/// </summary>
public sealed record WorkflowListResponse
{
    /// <summary>
    /// The active workflows for the instance.
    /// </summary>
    public required IReadOnlyList<WorkflowStatusResponse> Workflows { get; init; }
}
