namespace Altinn.App.Clients.Fiks.Exceptions;

/// <summary>
/// Indicates an error with the Fiks Arkiv configuration.
/// </summary>
public class FiksArkivConfigurationException : FiksArkivException
{
    /// <inheritdoc/>
    internal FiksArkivConfigurationException() { }

    /// <inheritdoc/>
    internal FiksArkivConfigurationException(string? message)
        : base(message) { }

    /// <inheritdoc/>
    internal FiksArkivConfigurationException(string? message, Exception? innerException)
        : base(message, innerException) { }
}
