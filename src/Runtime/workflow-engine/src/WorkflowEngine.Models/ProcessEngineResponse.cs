namespace WorkflowEngine.Models;

/// <summary>
/// The response from the process engine for a <see cref="ProcessEngineJobRequest"/>.
/// </summary>
public sealed record ProcessEngineResponse(ProcessEngineRequestStatus Status, string? Message = null)
{
    /// <summary>
    /// Creates an accepted response.
    /// </summary>
    public static ProcessEngineResponse Accepted() => new(ProcessEngineRequestStatus.Accepted);

    /// <summary>
    /// Creates a rejected response.
    /// </summary>
    /// <param name="message">Optional message for the caller, describing why the request was rejected.</param>
    public static ProcessEngineResponse Rejected(string? message = null) =>
        new(ProcessEngineRequestStatus.Rejected, message);
};
