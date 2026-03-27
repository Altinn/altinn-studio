namespace WorkflowEngine.Models.Exceptions;

/// <summary>
/// Thrown when a descriptor requests typed command data or workflow context
/// that does not match the actual deserialized type.
/// This is a non-retryable programming error.
/// </summary>
public sealed class CommandDataTypeMismatchException : EngineException
{
    /// <inheritdoc/>
    public CommandDataTypeMismatchException() { }

    /// <inheritdoc/>
    public CommandDataTypeMismatchException(string message)
        : base(message) { }

    /// <inheritdoc/>
    public CommandDataTypeMismatchException(string message, Exception? innerException)
        : base(message, innerException) { }
}
