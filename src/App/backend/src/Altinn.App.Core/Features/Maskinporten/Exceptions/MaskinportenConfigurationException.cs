namespace Altinn.App.Core.Features.Maskinporten.Exceptions;

/// <summary>
/// An exception that indicates a missing or invalid <c>maskinporten-settings.json</c> file.
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
