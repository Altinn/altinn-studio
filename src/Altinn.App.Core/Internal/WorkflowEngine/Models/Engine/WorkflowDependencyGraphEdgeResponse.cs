using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

internal sealed record WorkflowDependencyGraphEdgeResponse
{
    [JsonPropertyName("from")]
    public Guid From { get; init; }

    [JsonPropertyName("to")]
    public Guid To { get; init; }

    [JsonPropertyName("kind")]
    public required string Kind { get; init; }
}
