using Altinn.App.Core.Exceptions;

namespace Altinn.App.Core.EFormidling.Implementation;

/// <summary>
/// Exception thrown when Eformidling is unable to process the message delivered to
/// the integration point.
/// </summary>
public class EformidlingDeliveryException : AltinnException
{
    ///<inheritDoc/>
    public EformidlingDeliveryException() { }

    ///<inheritDoc/>
    public EformidlingDeliveryException(string message)
        : base(message) { }

    ///<inheritDoc/>
    public EformidlingDeliveryException(string message, Exception inner)
        : base(message, inner) { }
}
