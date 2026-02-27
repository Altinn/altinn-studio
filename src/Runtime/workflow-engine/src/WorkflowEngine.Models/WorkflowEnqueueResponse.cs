using System.Text.Json.Serialization;
using WorkflowMap = System.Collections.Generic.Dictionary<string, long>;

namespace WorkflowEngine.Models;

/// <summary>
/// The response from the process engine for a <see cref="WorkflowEnqueueRequest"/>.
/// </summary>
public abstract record WorkflowEnqueueResponse
{
    private WorkflowEnqueueResponse() { }

    public static Accepted Accept(WorkflowMap workflows) => new() { Workflows = workflows };

    public static Rejected Reject(Rejection reason, string? message = null) =>
        new() { Reason = reason, Message = message };

    /// <summary>
    /// Represents an accepted response.
    /// </summary>
    public sealed record Accepted : WorkflowEnqueueResponse
    {
        [JsonPropertyName("workflows")]
        public required WorkflowMap Workflows { get; init; }
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
        ConcurrencyViolation,
    }
}
