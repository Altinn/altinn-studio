using Altinn.App.Core.Exceptions;

namespace Altinn.App.Core.Features.Correspondence.Exceptions;

/// <summary>
/// Generic Correspondence related exception. Something went wrong, and it was related to Correspondence.
/// </summary>
public abstract class CorrespondenceException : AltinnException
{
    /// <inheritdoc/>
    protected CorrespondenceException() { }

    /// <inheritdoc/>
    protected CorrespondenceException(string? message)
        : base(message) { }

    /// <inheritdoc/>
    protected CorrespondenceException(string? message, Exception? innerException)
        : base(message, innerException) { }
}
