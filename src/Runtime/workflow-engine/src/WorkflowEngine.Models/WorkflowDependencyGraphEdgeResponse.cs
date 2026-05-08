using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// A relationship between two workflows in a dependency graph response.
/// </summary>
public sealed record WorkflowDependencyGraphEdgeResponse
{
    /// <summary>
    /// The source workflow in the relationship.
    /// </summary>
    [JsonPropertyName("from")]
    public Guid From { get; init; }

    /// <summary>
    /// The target workflow in the relationship.
    /// </summary>
    [JsonPropertyName("to")]
    public Guid To { get; init; }

    /// <summary>
    /// The relationship type.
    /// </summary>
    [JsonPropertyName("kind")]
    public required WorkflowDependencyGraphEdgeKind Kind { get; init; }
}
