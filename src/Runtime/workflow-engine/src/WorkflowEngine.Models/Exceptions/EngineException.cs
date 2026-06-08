namespace WorkflowEngine.Models.Exceptions;

/// <summary>
/// Base type for exceptions raised by the workflow engine. Hosts can use it as a coarse catch
/// for engine-originated failures regardless of the specific cause.
/// </summary>
public class EngineException : Exception
{
    /// <inheritdoc/>
    public EngineException() { }

    /// <inheritdoc/>
    public EngineException(string? message)
        : base(message) { }

    /// <inheritdoc/>
    public EngineException(string? message, Exception? innerException)
        : base(message, innerException) { }
}
