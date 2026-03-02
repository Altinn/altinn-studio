namespace WorkflowEngine.Models.Exceptions;

/// <summary>
/// Thrown when the engine is not running or is currently disabled.
/// </summary>
public class EngineUnavailableException : EngineException
{
    /// <inheritdoc/>
    public EngineUnavailableException() { }

    /// <inheritdoc/>
    public EngineUnavailableException(string? message)
        : base(message) { }

    /// <inheritdoc/>
    public EngineUnavailableException(string? message, Exception? innerException)
        : base(message, innerException) { }
}
