namespace WorkflowEngine.Models.Exceptions;

/// <summary>
/// Thrown when the engine inbox has insufficient capacity to accept new work.
/// </summary>
public class EngineAtCapacityException : EngineException
{
    /// <inheritdoc/>
    public EngineAtCapacityException() { }

    /// <inheritdoc/>
    public EngineAtCapacityException(string? message)
        : base(message) { }

    /// <inheritdoc/>
    public EngineAtCapacityException(string? message, Exception? innerException)
        : base(message, innerException) { }
}
