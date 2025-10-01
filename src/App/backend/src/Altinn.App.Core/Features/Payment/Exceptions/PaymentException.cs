using Altinn.App.Core.Exceptions;

namespace Altinn.App.Core.Features.Payment.Exceptions;

/// <summary>
/// Represents an exception that is thrown when an error occurs during payment processing.
/// </summary>
public class PaymentException : AltinnException
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PaymentException"/> class.
    /// </summary>
    /// <param name="message"></param>
    public PaymentException(string message)
        : base(message) { }
}
