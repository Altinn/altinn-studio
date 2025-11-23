using Altinn.App.Clients.Fiks.Extensions;
using KS.Fiks.IO.Client.Models;

namespace Altinn.App.Clients.Fiks.FiksIO.Models;

/// <summary>
/// Represents the response of a Fiks IO message request.
/// </summary>
public sealed record FiksIOMessageResponse
{
    /// <summary>
    /// The message ID.
    /// </summary>
    public Guid MessageId => _sendtMelding.MeldingId;

    /// <summary>
    /// Sender's reference for this message.
    /// </summary>
    public Guid? SendersReference => _sendtMelding.KlientMeldingId;

    /// <summary>
    /// Correlation ID for the message.
    /// </summary>
    public string? CorrelationId => _sendtMelding.KlientKorrelasjonsId?.FromUrlSafeBase64();

    /// <summary>
    /// The message type (e.g. no.ks.fiks.arkiv.v1.arkivering.arkivmelding.opprett)
    /// </summary>
    public string MessageType => _sendtMelding.MeldingType;

    /// <summary>
    /// The sender's account ID (e.g. you).
    /// </summary>
    public Guid Sender => _sendtMelding.AvsenderKontoId;

    /// <summary>
    /// The recipient's account ID.
    /// </summary>
    public Guid Recipient => _sendtMelding.MottakerKontoId;

    /// <summary>
    /// The message lifetime.
    /// </summary>
    public TimeSpan MessageLifetime => _sendtMelding.Ttl;

    /// <summary>
    /// The message headers.
    /// </summary>
    public Dictionary<string, string> Headers => _sendtMelding.Headere;

    /// <summary>
    /// The ID of the message this is a reply to, if any.
    /// </summary>
    public Guid? InReplyToMessage => _sendtMelding.SvarPaMelding;

    /// <summary>
    /// Indicates whether this message has been re-sent or not.
    /// </summary>
    public bool ReSent => _sendtMelding.Resendt;

    private SendtMelding _sendtMelding { get; }

    internal FiksIOMessageResponse(SendtMelding sendtMelding)
    {
        _sendtMelding = sendtMelding;
    }
}
