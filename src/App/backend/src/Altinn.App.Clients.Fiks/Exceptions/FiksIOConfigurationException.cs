namespace Altinn.App.Clients.Fiks.Exceptions;

/// <summary>
/// Indicates an error with the Fiks IO configuration.
/// </summary>
public class FiksIOConfigurationException : FiksIOException
{
    /// <inheritdoc/>
    internal FiksIOConfigurationException() { }

    /// <inheritdoc/>
    internal FiksIOConfigurationException(string? message)
        : base(message) { }

    /// <inheritdoc/>
    internal FiksIOConfigurationException(string? message, Exception? innerException)
        : base(message, innerException) { }
}
