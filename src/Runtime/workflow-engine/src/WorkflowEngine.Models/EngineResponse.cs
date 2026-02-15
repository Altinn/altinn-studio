namespace WorkflowEngine.Models;

/// <summary>
/// The response from the process engine for a <see cref="EngineRequest"/>.
/// </summary>
public abstract record EngineResponse
{
    private EngineResponse() { }

    public static Accepted Accept() => new();

    public static Rejected Reject(Rejection reason, string? message = null) => new(reason, message);

    /// <summary>
    /// Represents an accepted response.
    /// </summary>
    public sealed record Accepted : EngineResponse;

    /// <summary>
    /// Represents a rejected response.
    /// </summary>
    public sealed record Rejected(Rejection Reason, string? Message) : EngineResponse;

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
}
