namespace WorkflowEngine.Models;

/// <summary>
/// The response from the engine for a retry or skip-backoff request.
/// </summary>
public abstract record WorkflowRetryResponse
{
    private WorkflowRetryResponse() { }

    public static Accepted Accept() => new();

    public static Rejected Reject(Rejection reason, string? message = null) => new(reason, message);

    public sealed record Accepted : WorkflowRetryResponse;

    public sealed record Rejected(Rejection Reason, string? Message) : WorkflowRetryResponse;

    public enum Rejection
    {
        Invalid,
        Duplicate,
        Unavailable,
        AtCapacity,
        NotFound,
    }
}
