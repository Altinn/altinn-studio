using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Response model for a workflow dependency graph rooted at a specific workflow.
/// </summary>
public sealed record WorkflowDependencyGraphResponse
{
    /// <summary>
    /// The workflow ID used as the dependency graph root.
    /// </summary>
    [JsonPropertyName("rootWorkflowId")]
    public Guid RootWorkflowId { get; init; }

    /// <summary>
    /// All workflows reachable from the requested workflow through dependency relationships.
    /// Includes the requested workflow itself.
    /// </summary>
    [JsonPropertyName("workflows")]
    public required IReadOnlyList<WorkflowStatusResponse> Workflows { get; init; }

    /// <summary>
    /// The relationships between workflows in the returned dependency graph.
    /// </summary>
    [JsonPropertyName("edges")]
    public required IReadOnlyList<WorkflowDependencyGraphEdgeResponse> Edges { get; init; }
}
