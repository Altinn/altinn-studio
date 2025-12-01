using Altinn.App.Core.Exceptions;

namespace Altinn.App.Clients.Fiks.Exceptions;

/// <summary>
/// Indicates an error related to Fiks Arkiv.
/// </summary>
public class FiksArkivException : AltinnException
{
    /// <inheritdoc/>
    internal FiksArkivException() { }

    /// <inheritdoc/>
    internal FiksArkivException(string? message)
        : base(message) { }

    /// <inheritdoc/>
    internal FiksArkivException(string? message, Exception? innerException)
        : base(message, innerException) { }
}
