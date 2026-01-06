namespace WorkflowEngine.Models;

/// <summary>
/// The response from the process engine for a <see cref="Request"/>.
/// </summary>
public sealed record Response(RequestStatus Status, string? Message = null)
{
    /// <summary>
    /// Creates an accepted response.
    /// </summary>
    public static Response Accepted() => new(RequestStatus.Accepted);

    /// <summary>
    /// Creates a rejected response.
    /// </summary>
    /// <param name="message">Optional message for the caller, describing why the request was rejected.</param>
    public static Response Rejected(string? message = null) => new(RequestStatus.Rejected, message);
};
