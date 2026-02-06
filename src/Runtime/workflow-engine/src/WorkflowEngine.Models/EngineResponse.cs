namespace WorkflowEngine.Models;

/// <summary>
/// The response from the process engine for a <see cref="EngineRequest"/>.
/// </summary>
public sealed record EngineResponse(EngineRequestStatus Status, string? Message = null)
{
    /// <summary>
    /// Creates an accepted response.
    /// </summary>
    public static EngineResponse Accepted() => new(EngineRequestStatus.Accepted);

    /// <summary>
    /// Creates a rejected response.
    /// </summary>
    /// <param name="message">Optional message for the caller, describing why the request was rejected.</param>
    public static EngineResponse Rejected(string? message = null) => new(EngineRequestStatus.Rejected, message);
};
