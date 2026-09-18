namespace Altinn.App.Core.Features.Maskinporten.Exceptions;

/// <summary>
/// An exception that indicates that the Maskinporten credentials the platform provisions for the app are
/// missing or invalid.
/// </summary>
public sealed class MaskinportenConfigurationException : MaskinportenException
{
    /// <inheritdoc/>
    public MaskinportenConfigurationException() { }

    /// <inheritdoc/>
    public MaskinportenConfigurationException(string? message)
        : base(message) { }

    /// <inheritdoc/>
    public MaskinportenConfigurationException(string? message, Exception? innerException)
        : base(message, innerException) { }
}
