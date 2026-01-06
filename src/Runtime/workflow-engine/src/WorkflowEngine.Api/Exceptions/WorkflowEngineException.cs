namespace WorkflowEngine.Api.Exceptions;

public class WorkflowEngineException : Exception
{
    /// <inheritdoc/>
    public WorkflowEngineException() { }

    /// <inheritdoc/>
    public WorkflowEngineException(string? message)
        : base(message) { }

    /// <inheritdoc/>
    public WorkflowEngineException(string? message, Exception? innerException)
        : base(message, innerException) { }
}
