using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>
/// Response from the workflow engine enqueue endpoint.
/// </summary>
internal abstract record WorkflowEnqueueResponse
{
    private WorkflowEnqueueResponse() { }

    /// <summary>
    /// The request was accepted and workflows have been enqueued.
    /// </summary>
    internal sealed record Accepted : WorkflowEnqueueResponse
    {
        /// <summary>
        /// The enqueued workflow results.
        /// </summary>
        [JsonPropertyName("workflows")]
        public required IReadOnlyList<WorkflowResult> Workflows { get; init; }
    }
}

/// <summary>
/// Result for an individual enqueued workflow.
/// </summary>
internal sealed record WorkflowResult
{
    /// <summary>
    /// The workflow reference, if provided in the request.
    /// </summary>
    [JsonPropertyName("ref")]
    public string? Ref { get; init; }

    /// <summary>
    /// The database ID assigned by the engine.
    /// </summary>
    [JsonPropertyName("databaseId")]
    public required Guid DatabaseId { get; init; }

    /// <summary>
    /// The namespace the workflow was created in.
    /// </summary>
    [JsonPropertyName("namespace")]
    public required string Namespace { get; init; }
}
