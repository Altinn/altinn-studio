using System.Text.Json.Serialization;

namespace Altinn.App.Clients.Fiks.FiksArkiv.Models;

/// <summary>
/// A received Fiks Arkiv message, reduced to what is needed to process it later and elsewhere. This is the body
/// the Fiks IO subscriber delivers into the mailbox, and the body <see cref="FiksArkivServiceTask"/> reads back
/// off <c>ServiceTaskContext.Reply</c>: decryption needs the live Fiks IO connection, which the reply handler
/// does not have, so the subscriber decrypts on the spot. The transport metadata beside the payloads is what
/// lets the reply handler rebuild a replayed <c>FiksIOReceivedMessage</c> for
/// <see cref="IFiksArkivResponseHandler"/>.
/// </summary>
internal sealed record StoredFiksArkivMessage
{
    /// <summary>
    /// The Fiks IO message id. Also the delivery's idempotency key, which is what makes forwarding the
    /// same message twice harmless.
    /// </summary>
    [JsonPropertyName("messageId")]
    public required Guid MessageId { get; init; }

    /// <summary>
    /// The Fiks Arkiv message type (e.g. <c>no.ks.fiks.arkiv.v1.arkivering.arkivmelding.opprett.kvittering</c>),
    /// which is what says whether this is an acknowledgement, the receipt, or an error.
    /// </summary>
    [JsonPropertyName("messageType")]
    public required string MessageType { get; init; }

    /// <summary>The sender's (the archive's) own reference to this message, when it supplied one.</summary>
    [JsonPropertyName("sendersReference")]
    public Guid? SendersReference { get; init; }

    /// <summary>The Fiks IO id of the message this one answers, when it answers one.</summary>
    [JsonPropertyName("inReplyToMessage")]
    public Guid? InReplyToMessage { get; init; }

    /// <summary>
    /// The correlation id the message carried — the reply address the archive echoed back, which is
    /// the mailbox this message was delivered into.
    /// </summary>
    [JsonPropertyName("correlationId")]
    public string? CorrelationId { get; init; }

    /// <summary>The sender's Fiks account id.</summary>
    [JsonPropertyName("sender")]
    public Guid Sender { get; init; }

    /// <summary>The recipient's Fiks account id (this app's account).</summary>
    [JsonPropertyName("recipient")]
    public Guid Recipient { get; init; }

    /// <summary>How long the message was valid for in transit.</summary>
    [JsonPropertyName("messageLifetime")]
    public TimeSpan MessageLifetime { get; init; }

    /// <summary>Whether Fiks IO had already attempted delivery of this message before.</summary>
    [JsonPropertyName("isReSent")]
    public bool IsReSent { get; init; }

    /// <summary>The message headers, as Fiks IO delivered them.</summary>
    [JsonPropertyName("headers")]
    public Dictionary<string, string>? Headers { get; init; }

    /// <summary>The decrypted payloads attached to the message, in the order Fiks IO delivered them.</summary>
    [JsonPropertyName("payloads")]
    public IReadOnlyList<StoredFiksArkivPayload>? Payloads { get; init; }
}

/// <summary>A single decrypted payload entry from a Fiks Arkiv message.</summary>
internal sealed record StoredFiksArkivPayload
{
    /// <summary>The filename of the payload (e.g. <c>arkivmelding.xml</c>).</summary>
    [JsonPropertyName("filename")]
    public required string Filename { get; init; }

    /// <summary>The decrypted content of the payload as a string.</summary>
    [JsonPropertyName("content")]
    public required string Content { get; init; }
}
