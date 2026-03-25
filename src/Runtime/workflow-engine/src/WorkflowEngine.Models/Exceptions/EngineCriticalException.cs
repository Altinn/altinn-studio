namespace WorkflowEngine.Models.Exceptions;

public sealed class EngineCriticalException : EngineException
{
    public EngineCriticalException(string message)
        : base(message) { }

    public EngineCriticalException() { }

    public EngineCriticalException(string message, Exception? innerException)
        : base(message, innerException) { }
}
