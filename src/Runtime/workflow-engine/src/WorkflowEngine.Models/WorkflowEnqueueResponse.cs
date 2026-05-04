using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// The response from the process engine for a <see cref="WorkflowEnqueueRequest"/>.
/// </summary>
public abstract record WorkflowEnqueueResponse
{
    private WorkflowEnqueueResponse() { }

    /// <summary>
    /// Represents an accepted response.
    /// </summary>
    public record Accepted([property: JsonPropertyName("workflows")] IReadOnlyList<WorkflowResult> Workflows)
        : WorkflowEnqueueResponse
    {
        /// <summary>
        /// Indicates that new database records were inserted for this request.
        /// </summary>
        public sealed record Created(IReadOnlyList<WorkflowResult> Workflows) : Accepted(Workflows);

        /// <summary>
        /// Indicates that matching database records were returned for this request.
        /// </summary>
        public sealed record Existing(IReadOnlyList<WorkflowResult> Workflows) : Accepted(Workflows);
    }

    /// <summary>
    /// Represents a rejected response.
    /// </summary>
    public record Rejected([property: JsonPropertyName("message")] string Message) : WorkflowEnqueueResponse
    {
        /// <summary>
        /// Indicates that the request was invalid.
        /// </summary>
        public sealed record Invalid(string Message) : Rejected(Message);

        /// <summary>
        /// Indicates that the request was a duplicate.
        /// </summary>
        public sealed record Duplicate(string Message) : Rejected(Message);

        /// <summary>
        /// Indicates that the queue is at capacity.
        /// </summary>
        public sealed record AtCapacity(string Message) : Rejected(Message);
    }

    /// <summary>
    /// A single workflow result within an accepted enqueue response.
    /// </summary>
    public sealed record WorkflowResult
    {
        /// <summary>
        /// Echo of the request-scoped <see cref="WorkflowRequest.Ref"/>, when one was supplied.
        /// </summary>
        [JsonPropertyName("ref")]
        public string? Ref { get; init; }

        /// <summary>
        /// Database ID assigned to the workflow row.
        /// </summary>
        [JsonPropertyName("databaseId")]
        public required Guid DatabaseId { get; init; }

        /// <summary>
        /// Namespace the workflow was registered in.
        /// </summary>
        [JsonPropertyName("namespace")]
        public required string Namespace { get; init; }
    }
}
