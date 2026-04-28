namespace WorkflowEngine.Models.Exceptions;

/// <summary>
/// Thrown when the engine cannot be initialized due to invalid or missing configuration.
/// Hosts should treat this as a fatal startup error.
/// </summary>
public sealed class EngineConfigurationException : EngineException
{
    /// <inheritdoc/>
    public EngineConfigurationException(string message)
        : base(message) { }

    /// <inheritdoc/>
    public EngineConfigurationException() { }

    /// <inheritdoc/>
    public EngineConfigurationException(string message, Exception? innerException)
        : base(message, innerException) { }
}
