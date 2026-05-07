using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>
/// Response model for a workflow dependency graph rooted at a specific workflow.
/// </summary>
internal sealed record WorkflowDependencyGraphResponse
{
    /// <summary>
    /// The workflow ID used as the dependency graph root.
    /// </summary>
    [JsonPropertyName("rootWorkflowId")]
    public Guid RootWorkflowId { get; init; }

    /// <summary>
    /// All workflows in the connected component reachable from the requested workflow
    /// through dependency and link relationships in either direction.
    /// </summary>
    [JsonPropertyName("workflows")]
    public required IReadOnlyList<WorkflowStatusResponse> Workflows { get; init; }

    /// <summary>
    /// The relationships between workflows in the returned dependency graph.
    /// </summary>
    [JsonPropertyName("edges")]
    public required IReadOnlyList<WorkflowDependencyGraphEdgeResponse> Edges { get; init; }
}
