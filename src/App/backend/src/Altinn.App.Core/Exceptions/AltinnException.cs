namespace Altinn.App.Core.Exceptions;

/// <summary>
/// Generic Altinn exception. Something went wrong, and it was thrown from Altinn code.
/// </summary>
public abstract class AltinnException : Exception
{
    /// <inheritdoc/>
    protected AltinnException() { }

    /// <inheritdoc/>
    protected AltinnException(string? message)
        : base(message) { }

    /// <inheritdoc/>
    protected AltinnException(string? message, Exception? innerException)
        : base(message, innerException) { }
}
