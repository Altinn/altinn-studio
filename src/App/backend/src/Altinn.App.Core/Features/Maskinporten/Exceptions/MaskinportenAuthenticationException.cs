namespace Altinn.App.Core.Features.Maskinporten.Exceptions;

/// <summary>
/// An exception that indicates a problem with the authentication/authorization call to Maskinporten.
/// </summary>
public sealed class MaskinportenAuthenticationException : MaskinportenException
{
    /// <inheritdoc/>
    public MaskinportenAuthenticationException() { }

    /// <inheritdoc/>
    public MaskinportenAuthenticationException(string? message)
        : base(message) { }

    /// <inheritdoc/>
    public MaskinportenAuthenticationException(string? message, Exception? innerException)
        : base(message, innerException) { }
}
