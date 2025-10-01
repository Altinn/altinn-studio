namespace Altinn.App.Core.Exceptions;

/// <summary>
/// An exception that indicates a missing or invalid configuration.
/// </summary>
public class ConfigurationException : AltinnException
{
    /// <inheritdoc/>
    public ConfigurationException() { }

    /// <inheritdoc/>
    public ConfigurationException(string? message)
        : base(message) { }

    /// <inheritdoc/>
    public ConfigurationException(string? message, Exception? innerException)
        : base(message, innerException) { }
}
