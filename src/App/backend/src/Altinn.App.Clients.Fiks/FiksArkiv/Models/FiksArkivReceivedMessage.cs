using Altinn.App.Clients.Fiks.Constants;

namespace Altinn.App.Clients.Fiks.FiksArkiv.Models;

/// <summary>
/// A message the archive sent back: the transport identifiers plus the decrypted, parsed payloads.
/// What <see cref="FiksArkivServiceTask"/> acts on and hands to <see cref="IFiksArkivMessageHandler"/>.
/// </summary>
public sealed record FiksArkivReceivedMessage
{
    /// <summary>The Fiks IO message id — also the deduplication key for at-least-once delivery.</summary>
    public required Guid MessageId { get; init; }

    /// <summary>
    /// The Fiks Arkiv message type (e.g. <c>no.ks.fiks.arkiv.v1.arkivering.arkivmelding.opprett.kvittering</c>).
    /// </summary>
    public required string MessageType { get; init; }

    /// <summary>The sender's own reference to this message, when it supplied one.</summary>
    public Guid? SendersReference { get; init; }

    /// <summary>The Fiks IO id of the message this one answers, when it answers one.</summary>
    public Guid? InReplyToMessage { get; init; }

    /// <summary>The sender's Fiks account id.</summary>
    public Guid Sender { get; init; }

    /// <summary>The recipient's Fiks account id (e.g. you).</summary>
    public Guid Recipient { get; init; }

    /// <summary>
    /// The decrypted payloads, parsed where the message type is one the task models:
    /// <see cref="FiksArkivReceivedMessagePayload.Receipt"/>, <see cref="FiksArkivReceivedMessagePayload.Error"/>
    /// or <see cref="FiksArkivReceivedMessagePayload.Unknown"/>. Empty when the message carried none.
    /// </summary>
    public required IReadOnlyList<FiksArkivReceivedMessagePayload> Payloads { get; init; }

    /// <summary>
    /// Whether the archive is reporting a failure — an error message type, or a receipt whose payload
    /// says the record could not be created.
    /// </summary>
    public bool IsError =>
        FiksIOConstants.IsErrorType(MessageType) || Payloads.OfType<FiksArkivReceivedMessagePayload.Error>().Any();

    /// <summary>Whether this is the archive's receipt (<c>*.kvittering</c>) — the answer that settles the exchange.</summary>
    public bool IsReceipt => FiksIOConstants.IsReceiptType(MessageType);

    /// <summary>
    /// Whether this is an intermediate acknowledgement (<c>*.mottatt</c>) — the archive confirming it has the
    /// request, which is not yet an answer to it.
    /// </summary>
    public bool IsAcknowledgement => FiksIOConstants.IsAcknowledgementType(MessageType);
}
