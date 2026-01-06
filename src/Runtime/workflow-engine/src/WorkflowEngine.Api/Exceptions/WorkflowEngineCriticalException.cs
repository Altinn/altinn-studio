namespace WorkflowEngine.Api.Exceptions;

public sealed class WorkflowEngineCriticalException : WorkflowEngineException
{
    public WorkflowEngineCriticalException(string message)
        : base(message) { }

    public WorkflowEngineCriticalException() { }

    public WorkflowEngineCriticalException(string message, Exception innerException)
        : base(message, innerException) { }
}
