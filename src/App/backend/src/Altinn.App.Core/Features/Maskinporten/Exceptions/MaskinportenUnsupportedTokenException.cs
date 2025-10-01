namespace Altinn.App.Core.Features.Maskinporten.Exceptions;

/// <summary>
/// An exception that indicates an unsupported token type has been received from Maskinporten
/// </summary>
public class MaskinportenUnsupportedTokenException : MaskinportenException
{
    /// <inheritdoc/>
    public MaskinportenUnsupportedTokenException() { }

    /// <inheritdoc/>
    public MaskinportenUnsupportedTokenException(string? message)
        : base(message) { }

    /// <inheritdoc/>
    public MaskinportenUnsupportedTokenException(string? message, Exception? innerException)
        : base(message, innerException) { }
}
