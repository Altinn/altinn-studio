namespace WorkflowEngine.Models.Exceptions;

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
