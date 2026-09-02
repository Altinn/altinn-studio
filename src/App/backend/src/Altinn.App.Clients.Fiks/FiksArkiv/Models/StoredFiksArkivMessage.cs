using System.Text.Json.Serialization;

namespace Altinn.App.Clients.Fiks.FiksArkiv.Models;

/// <summary>
/// A received Fiks Arkiv message reduced to what later processing needs — the body the subscriber delivers
/// into the mailbox (decryption needs the live connection, so it happens at receipt). The reply handler
/// reads it back and builds the <see cref="FiksArkivReceivedMessage"/> it acts on.
/// </summary>
internal sealed record StoredFiksArkivMessage
{
    /// <summary>The Fiks IO message id — also the delivery's idempotency key.</summary>
    [JsonPropertyName("messageId")]
    public required Guid MessageId { get; init; }

    /// <summary>
    /// The Fiks Arkiv message type — what says whether this is an acknowledgement, the receipt, or an error.
    /// </summary>
    [JsonPropertyName("messageType")]
    public required string MessageType { get; init; }

    [JsonPropertyName("sendersReference")]
    public Guid? SendersReference { get; init; }

    [JsonPropertyName("inReplyToMessage")]
    public Guid? InReplyToMessage { get; init; }

    /// <summary>The echoed reply address — the mailbox this message was delivered into.</summary>
    [JsonPropertyName("correlationId")]
    public string? CorrelationId { get; init; }

    [JsonPropertyName("sender")]
    public Guid Sender { get; init; }

    [JsonPropertyName("recipient")]
    public Guid Recipient { get; init; }

    [JsonPropertyName("messageLifetime")]
    public TimeSpan MessageLifetime { get; init; }

    [JsonPropertyName("isReSent")]
    public bool IsReSent { get; init; }

    [JsonPropertyName("headers")]
    public Dictionary<string, string>? Headers { get; init; }

    [JsonPropertyName("payloads")]
    public IReadOnlyList<StoredFiksArkivPayload>? Payloads { get; init; }
}

/// <summary>A single decrypted payload entry from a Fiks Arkiv message.</summary>
internal sealed record StoredFiksArkivPayload
{
    [JsonPropertyName("filename")]
    public required string Filename { get; init; }

    [JsonPropertyName("content")]
    public required string Content { get; init; }
}
