namespace Altinn.App.ProcessEngine.Exceptions;

internal class ProcessEngineException : Exception
{
    /// <inheritdoc/>
    public ProcessEngineException() { }

    /// <inheritdoc/>
    public ProcessEngineException(string? message)
        : base(message) { }

    /// <inheritdoc/>
    public ProcessEngineException(string? message, Exception? innerException)
        : base(message, innerException) { }
}
