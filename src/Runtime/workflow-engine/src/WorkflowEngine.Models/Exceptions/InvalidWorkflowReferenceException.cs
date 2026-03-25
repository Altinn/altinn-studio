namespace WorkflowEngine.Models.Exceptions;

/// <summary>
/// Thrown when one or more workflow dependency or link references could not be resolved.
/// </summary>
public sealed class InvalidWorkflowReferenceException : EngineException
{
    /// <inheritdoc/>
    public InvalidWorkflowReferenceException() { }

    /// <inheritdoc/>
    public InvalidWorkflowReferenceException(string message)
        : base(message) { }

    /// <inheritdoc/>
    public InvalidWorkflowReferenceException(string message, Exception? innerException)
        : base(message, innerException) { }
}
