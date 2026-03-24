namespace WorkflowEngine.Models.Exceptions;

/// <summary>
/// Thrown when one or more workflow dependency or link references could not be resolved.
/// </summary>
public sealed class InvalidWorkflowReferenceException : EngineException
{
    public InvalidWorkflowReferenceException(string message)
        : base(message) { }
}
