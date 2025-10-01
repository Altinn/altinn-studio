using Altinn.App.Core.Exceptions;

namespace Altinn.App.Core.Features.Maskinporten.Exceptions;

/// <summary>
/// Generic Maskinporten related exception. Something went wrong, and it was related to Maskinporten.
/// </summary>
public abstract class MaskinportenException : AltinnException
{
    /// <inheritdoc/>
    protected MaskinportenException() { }

    /// <inheritdoc/>
    protected MaskinportenException(string? message)
        : base(message) { }

    /// <inheritdoc/>
    protected MaskinportenException(string? message, Exception? innerException)
        : base(message, innerException) { }
}
