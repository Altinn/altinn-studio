namespace Altinn.App.Clients.Fiks.FiksIO.Models;

/// <summary>
/// A Fiks IO message that has already been received, decrypted and handed on, reduced to the values a later
/// reader needs — what a <see cref="FiksIOReceivedMessage"/> is rebuilt from when the live connection is gone.
/// A plain value type in the Fiks IO layer rather than a reference to whatever the caller serialized, so the
/// transport layer never learns what an archive message looks like.
/// </summary>
internal sealed record FiksIOReplayedMessage
{
    /// <summary>The Fiks IO message id.</summary>
    public required Guid MessageId { get; init; }

    /// <summary>The message type (e.g. <c>no.ks.fiks.arkiv.v1.arkivering.arkivmelding.opprett.kvittering</c>).</summary>
    public required string MessageType { get; init; }

    /// <summary>The sender's own reference to this message, when it supplied one.</summary>
    public Guid? SendersReference { get; init; }

    /// <summary>The Fiks IO id of the message this one answers, when it answers one.</summary>
    public Guid? InReplyToMessage { get; init; }

    /// <summary>The correlation id the message carried.</summary>
    public string? CorrelationId { get; init; }

    /// <summary>The sender's Fiks account id.</summary>
    public Guid Sender { get; init; }

    /// <summary>The recipient's Fiks account id.</summary>
    public Guid Recipient { get; init; }

    /// <summary>How long the message was valid for in transit.</summary>
    public TimeSpan MessageLifetime { get; init; }

    /// <summary>Whether Fiks IO had already attempted delivery of this message before.</summary>
    public bool IsReSent { get; init; }

    /// <summary>The message headers, as Fiks IO delivered them.</summary>
    public Dictionary<string, string>? Headers { get; init; }

    /// <summary>The decrypted payloads, in the order Fiks IO delivered them.</summary>
    public IReadOnlyList<(string Filename, string Content)>? Payloads { get; init; }
}
