using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>
/// Response model for a workflow hierarchy rooted at a specific workflow.
/// </summary>
internal sealed record WorkflowHierarchyResponse
{
    /// <summary>
    /// The workflow ID used as the hierarchy root.
    /// </summary>
    [JsonPropertyName("workflowId")]
    public Guid WorkflowId { get; init; }

    /// <summary>
    /// All workflows reachable from the requested workflow through dependency relationships.
    /// Includes the requested workflow itself.
    /// </summary>
    [JsonPropertyName("workflows")]
    public required IReadOnlyList<WorkflowStatusResponse> Workflows { get; init; }
}
