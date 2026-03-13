using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// The response from the process engine for a <see cref="WorkflowEnqueueRequest"/>.
/// </summary>
public abstract record WorkflowEnqueueResponse
{
    private WorkflowEnqueueResponse() { }

    public static Accepted.Inserted Created(IReadOnlyList<WorkflowResult> workflows) => new() { Workflows = workflows };

    public static Accepted.Matched Existing(IReadOnlyList<WorkflowResult> workflows) => new() { Workflows = workflows };

    public static Rejected Reject(Rejection reason, string? message = null) =>
        new() { Reason = reason, Message = message };

    /// <summary>
    /// Represents an accepted response.
    /// </summary>
    public record Accepted : WorkflowEnqueueResponse
    {
        [JsonPropertyName("workflows")]
        public required IReadOnlyList<WorkflowResult> Workflows { get; init; }

        /// <summary>
        /// Indicates that new database records were inserted for this request.
        /// </summary>
        public sealed record Inserted : Accepted;

        /// <summary>
        /// Indicates that matching database records were returned for this request.
        /// </summary>
        public sealed record Matched : Accepted;
    }

    /// <summary>
    /// Represents a rejected response.
    /// </summary>
    public sealed record Rejected : WorkflowEnqueueResponse
    {
        [JsonPropertyName("reason")]
        public required Rejection Reason { get; init; }

        [JsonPropertyName("message")]
        public string? Message { get; init; }
    }

    /// <summary>
    /// The reason for a rejection.
    /// </summary>
    public enum Rejection
    {
        Invalid,
        Duplicate,
        Unavailable,
        AtCapacity,
    }

    /// <summary>
    /// A single workflow result within an accepted enqueue response.
    /// </summary>
    public sealed record WorkflowResult
    {
        [JsonPropertyName("ref")]
        public string? Ref { get; init; }

        [JsonPropertyName("databaseId")]
        public required Guid DatabaseId { get; init; }

        [JsonPropertyName("namespace")]
        public required string Namespace { get; init; }
    }
}
