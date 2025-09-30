namespace Altinn.App.Core.Features.Correspondence.Exceptions;

/// <summary>
/// An exception that indicates an invalid method argument is being used in a correspondence operation.
/// </summary>
public class CorrespondenceArgumentException : CorrespondenceException
{
    /// <inheritdoc/>
    public CorrespondenceArgumentException() { }

    /// <inheritdoc/>
    public CorrespondenceArgumentException(string? message)
        : base(message) { }

    /// <inheritdoc/>
    public CorrespondenceArgumentException(string? message, Exception? innerException)
        : base(message, innerException) { }
}
