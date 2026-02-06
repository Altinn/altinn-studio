namespace WorkflowEngine.Models.Exceptions;

public sealed class EngineDbException : EngineException
{
    public EngineDbException(string message)
        : base(message) { }

    public EngineDbException() { }

    public EngineDbException(string message, Exception? innerException)
        : base(message, innerException) { }
}
