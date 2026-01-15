namespace WorkflowEngine.Models.Exceptions;

public sealed class EngineTaskException : EngineException
{
    public EngineTaskException(string message)
        : base(message) { }

    public EngineTaskException() { }

    public EngineTaskException(string message, Exception? innerException)
        : base(message, innerException) { }
}
