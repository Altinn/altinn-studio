namespace Altinn.App.Core.Features.Correspondence.Exceptions;

/// <summary>
/// An exception that indicates an invalid value is being used in a correspondence operation
/// </summary>
public class CorrespondenceValueException : CorrespondenceException
{
    /// <inheritdoc/>
    public CorrespondenceValueException() { }

    /// <inheritdoc/>
    public CorrespondenceValueException(string? message)
        : base(message) { }

    /// <inheritdoc/>
    public CorrespondenceValueException(string? message, Exception? innerException)
        : base(message, innerException) { }
}
