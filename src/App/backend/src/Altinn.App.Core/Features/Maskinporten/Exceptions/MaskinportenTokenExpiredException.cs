namespace Altinn.App.Core.Features.Maskinporten.Exceptions;

/// <summary>
/// An exception that indicates the access token has expired when it was in fact expected to be valid.
/// </summary>
public sealed class MaskinportenTokenExpiredException : MaskinportenException
{
    /// <inheritdoc/>
    public MaskinportenTokenExpiredException() { }

    /// <inheritdoc/>
    public MaskinportenTokenExpiredException(string? message)
        : base(message) { }

    /// <inheritdoc/>
    public MaskinportenTokenExpiredException(string? message, Exception? innerException)
        : base(message, innerException) { }
}
