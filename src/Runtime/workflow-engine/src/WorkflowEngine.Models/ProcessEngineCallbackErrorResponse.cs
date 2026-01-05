namespace WorkflowEngine.Models;

/// <summary>
/// Error response returned by the process engine callback controller
/// </summary>
public sealed record ProcessEngineCallbackErrorResponse
{
    /// <summary>
    /// Human-readable error message
    /// </summary>
    public required string Message { get; init; }

    /// <summary>
    /// The type of exception that occurred
    /// </summary>
    public string? ExceptionType { get; init; }
}
