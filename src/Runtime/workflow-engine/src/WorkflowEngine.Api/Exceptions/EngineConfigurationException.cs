namespace WorkflowEngine.Api.Exceptions;

public sealed class EngineConfigurationException : EngineException
{
    public EngineConfigurationException(string message)
        : base(message) { }

    public EngineConfigurationException() { }

    public EngineConfigurationException(string message, Exception? innerException)
        : base(message, innerException) { }
}
