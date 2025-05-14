using Altinn.App.Core.Exceptions;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Represents errors that occur while handling a process.
/// </summary>
public class ProcessException : AltinnException
{
    /// <summary>
    /// Initializes a new instance of the <see cref="ProcessException"/> class with a specified error message.
    /// </summary>
    /// <param name="message">The message that describes the error.</param>
    public ProcessException(string message)
        : base(message) { }
}
