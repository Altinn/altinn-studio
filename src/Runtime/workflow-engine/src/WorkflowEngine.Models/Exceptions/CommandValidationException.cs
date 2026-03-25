namespace WorkflowEngine.Models.Exceptions;

public sealed class CommandValidationException : EngineException
{
    public CommandValidationException(string message)
        : base(message) { }

    public CommandValidationException() { }

    public CommandValidationException(string message, Exception? innerException)
        : base(message, innerException) { }
}
