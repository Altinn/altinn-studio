using Altinn.App.Clients.Fiks.Constants;
using Altinn.App.Clients.Fiks.Extensions;
using KS.Fiks.IO.Client.Models;
using KS.Fiks.IO.Client.Send;

namespace Altinn.App.Clients.Fiks.FiksIO.Models;

/// <summary>
/// Represents a received Fiks IO message (inbound).
/// </summary>
/// <remarks>
/// A message is normally <em>live</em>: it arrived on the Fiks IO connection this process holds, so its
/// streams can be read and its <see cref="Responder"/> can answer the sender. A message handed to code
/// that runs after the fact — a service task's reply handler, which may run on another pod days later —
/// is <em>replayed</em> instead: every value the message carried is still there, but nothing that needs
/// the connection works. See <see cref="Replay"/>.
/// </remarks>
public sealed record FiksIOReceivedMessage
{
    /// <summary>
    /// The message content.
    /// </summary>
    public FiksIOReceivedMessageContent Message { get; init; }

    /// <summary>
    /// A responder instance that can be used to respond to the message.
    /// </summary>
    /// <remarks>
    /// Usable only while the message is live. On a replayed message every member throws
    /// <see cref="InvalidOperationException"/>: the Fiks IO channel settled this message when it was
    /// received, and the connection it would answer on belongs to that moment. <see cref="IsReplayed"/>
    /// answers that question without provoking the exception.
    /// </remarks>
    public FiksIOMessageResponder Responder { get; init; }

    /// <summary>Indicates whether this message is being read away from the Fiks IO connection it arrived on.</summary>
    /// <remarks>
    /// <see langword="false"/> for a message handed to a Fiks IO subscriber as it arrives — everything works,
    /// including <see cref="Responder"/> and the stream members. <see langword="true"/> for one replayed later,
    /// where every value the message carried is still there but the members that need the connection throw
    /// <see cref="InvalidOperationException"/>. Ask this rather than catching that.
    /// </remarks>
    public bool IsReplayed => Message.IsReplayed;

    /// <summary>
    /// Indicates whether this message is an error response or not.
    /// </summary>
    public bool IsErrorResponse =>
        string.IsNullOrWhiteSpace(Message.MessageType) || FiksIOConstants.IsErrorType(Message.MessageType);

    /// <summary>
    /// Indicates whether this message is a receipt response or not.
    /// </summary>
    /// <remarks>
    /// Offered for app code that consumes Fiks IO messages itself. The runtime does not use it: the Fiks
    /// IO subscriber delivers every message into the waiting mailbox without classifying it, and the Fiks
    /// Arkiv service task classifies the delivered message rather than this wrapper.
    /// </remarks>
    public bool IsReceiptResponse =>
        string.IsNullOrWhiteSpace(Message.MessageType) || FiksIOConstants.IsReceiptType(Message.MessageType);

    internal FiksIOReceivedMessage(MottattMeldingArgs mottattMeldingArgs)
    {
        Message = new FiksIOReceivedMessageContent(mottattMeldingArgs.Melding);
        Responder = new FiksIOMessageResponder(mottattMeldingArgs.SvarSender);
    }

    private FiksIOReceivedMessage(FiksIOReplayedMessage replayed)
    {
        Message = new FiksIOReceivedMessageContent(replayed);
        Responder = new FiksIOMessageResponder();
    }

    /// <summary>
    /// Rebuilds a message that was received earlier, for code that reads it away from the Fiks IO connection it
    /// arrived on. Everything the message carried is answered from the replayed values; the members that would need
    /// the live connection throw <see cref="InvalidOperationException"/> rather than inventing an answer.
    /// </summary>
    internal static FiksIOReceivedMessage Replay(FiksIOReplayedMessage replayed) => new(replayed);
}

/// <summary>
/// Represents the content of a received Fiks IO message.
/// </summary>
public sealed record FiksIOReceivedMessageContent
{
    /// <summary>
    /// Indicates whether this content is replayed rather than read from the live Fiks IO connection —
    /// see <see cref="FiksIOReceivedMessage.IsReplayed"/>, which forwards this.
    /// </summary>
    public bool IsReplayed => _replayed is not null;

    /// <summary>
    /// Indicates whether the message has a payload or not.
    /// </summary>
    public bool HasPayload => _replayed is { } replayed ? replayed.Payloads?.Count > 0 : _live.HasPayload;

    /// <summary>
    /// The ID of the message this is a reply to, if any.
    /// </summary>
    public Guid? InReplyToMessage => _replayed is { } replayed ? replayed.InReplyToMessage : _live.SvarPaMelding;

    /// <summary>
    /// The correlation ID for this message, if any.
    /// </summary>
    public string? CorrelationId =>
        _replayed is { } replayed ? replayed.CorrelationId : _live.KlientKorrelasjonsId?.FromUrlSafeBase64();

    /// <summary>
    /// The message ID.
    /// </summary>
    public Guid MessageId => _replayed?.MessageId ?? _live.MeldingId;

    /// <summary>
    /// Sender's reference to this message.
    /// </summary>
    public Guid? SendersReference => _replayed is { } replayed ? replayed.SendersReference : _live.KlientMeldingId;

    /// <summary>
    /// The message type (e.g. no.ks.fiks.arkiv.v1.arkivering.arkivmelding.opprett.kvittering)
    /// </summary>
    public string MessageType => _replayed?.MessageType ?? _live.MeldingType;

    /// <summary>
    /// The sender's account ID.
    /// </summary>
    public Guid Sender => _replayed?.Sender ?? _live.AvsenderKontoId;

    /// <summary>
    /// The recipient's account ID (e.g. you).
    /// </summary>
    public Guid Recipient => _replayed?.Recipient ?? _live.MottakerKontoId;

    /// <summary>
    /// The message lifetime.
    /// </summary>
    public TimeSpan MessageLifetime => _replayed?.MessageLifetime ?? _live.Ttl;

    /// <summary>
    /// The message headers.
    /// </summary>
    public Dictionary<string, string> Headers => _replayed is { } replayed ? replayed.Headers ?? [] : _live.Headere;

    /// <summary>
    /// Indicates whether this message has been re-sent or not.
    /// </summary>
    public bool IsReSent => _replayed?.IsReSent ?? _live.Resendt;

    /// <summary>
    /// Write the encrypted stream to a ZIP file.
    /// </summary>
    /// <param name="outPath"></param>
    /// <returns></returns>
    public Task WriteEncryptedZip(string outPath) =>
        _mottattMelding?.WriteEncryptedZip(outPath) ?? throw ReplayedMessageHasNoConnection(nameof(WriteEncryptedZip));

    /// <summary>
    /// Write the decrypted stream to a ZIP file.
    /// </summary>
    /// <param name="outPath"></param>
    /// <returns></returns>
    public Task WriteDecryptedZip(string outPath) =>
        _mottattMelding?.WriteDecryptedZip(outPath) ?? throw ReplayedMessageHasNoConnection(nameof(WriteDecryptedZip));

    /// <summary>
    /// Gets the encrypted stream.
    /// </summary>
    public Task<Stream> GetEncryptedStream() =>
        _mottattMelding?.EncryptedStream ?? throw ReplayedMessageHasNoConnection(nameof(GetEncryptedStream));

    /// <summary>
    /// Gets the decrypted stream.
    /// </summary>
    public Task<Stream> GetDecryptedStream() =>
        _mottattMelding?.DecryptedStream ?? throw ReplayedMessageHasNoConnection(nameof(GetDecryptedStream));

    /// <summary>
    /// Gets the decrypted payload content as strings. Cached after first call.
    /// </summary>
    public async Task<IReadOnlyList<(string Filename, string Content)>?> GetDecryptedPayloads()
    {
        if (_replayed is { } replayed)
            return replayed.Payloads;

        if (_decryptedPayloadStrings is null && _live.HasPayload)
        {
            var decryptedPayloads = await _live.DecryptedPayloads;
            _decryptedPayloadStrings = decryptedPayloads.Select(x => (x.Filename, x.Payload.ReadToString())).ToList();
        }

        return _decryptedPayloadStrings;
    }

    private IMottattMelding? _mottattMelding { get; }
    private FiksIOReplayedMessage? _replayed { get; }

    /// <summary>
    /// The live Fiks IO message this content wraps. Exactly one of the two constructors runs, so this is non-null
    /// wherever <see cref="_replayed"/> is null and the throw is unreachable.
    /// </summary>
    private IMottattMelding _live =>
        _mottattMelding
        ?? throw new InvalidOperationException(
            $"{nameof(FiksIOReceivedMessageContent)} carries neither a live nor a replayed message."
        );
    private IReadOnlyList<(string, string)>? _decryptedPayloadStrings;

    internal FiksIOReceivedMessageContent(IMottattMelding mottattMelding)
    {
        _mottattMelding = mottattMelding;
    }

    internal FiksIOReceivedMessageContent(FiksIOReplayedMessage replayed)
    {
        _replayed = replayed;
    }

    private static InvalidOperationException ReplayedMessageHasNoConnection(string member) =>
        new(
            $"{nameof(FiksIOReceivedMessageContent)}.{member} needs the live Fiks IO connection the message arrived "
                + "on, and this message is being replayed after the fact. Its identifiers, headers and decrypted "
                + $"payloads are available; {nameof(GetDecryptedPayloads)} is what the content is read from here."
        );
}

/// <summary>
/// Message responder for received Fiks IO messages.
/// </summary>
public sealed record FiksIOMessageResponder
{
    /// <summary>
    /// Respond to the message with a payload.
    /// </summary>
    /// <param name="messageType">The message type to send.</param>
    /// <param name="payload">The payload(s) to attach.</param>
    /// <param name="sendersReference">Your reference.</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns></returns>
    public async Task<FiksIOMessageResponse> Respond(
        string messageType,
        IEnumerable<FiksIOMessagePayload> payload,
        Guid? sendersReference = null,
        CancellationToken cancellationToken = default
    )
    {
        var response = await RequireSender(nameof(Respond))
            .Svar(messageType, [.. payload.Select(x => x.ToPayload())], sendersReference, cancellationToken);
        return new FiksIOMessageResponse(response);
    }

    /// <summary>
    /// Respond to the message without a payload.
    /// </summary>
    /// <param name="messageType">The message type to send.</param>
    /// <param name="sendersReference">Your reference.</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns></returns>
    public async Task<FiksIOMessageResponse> Respond(
        string messageType,
        Guid? sendersReference = null,
        CancellationToken cancellationToken = default
    )
    {
        var response = await RequireSender(nameof(Respond)).Svar(messageType, sendersReference, cancellationToken);
        return new FiksIOMessageResponse(response);
    }

    /// <summary>
    /// Acknowledge that the message has been consumed.
    /// </summary>
    public async Task Ack() => await RequireSender(nameof(Ack)).AckAsync();

    /// <summary>
    /// Acknowledge that the message could not be consumed.
    /// </summary>
    public async Task Nack() => await RequireSender(nameof(Nack)).NackAsync();

    /// <summary>
    /// Acknowledge that the message could not be consumed and request to put it back in the queue to be consumed again.
    /// </summary>
    public async Task NackWithRequeue() => await RequireSender(nameof(NackWithRequeue)).NackWithRequeueAsync();

    private ISvarSender? _svarSender { get; init; }

    internal FiksIOMessageResponder(ISvarSender svarSender)
    {
        _svarSender = svarSender;
    }

    /// <summary>Builds the responder of a replayed message, which can respond to nothing.</summary>
    internal FiksIOMessageResponder() { }

    private ISvarSender RequireSender(string member) =>
        _svarSender
        ?? throw new InvalidOperationException(
            $"{nameof(FiksIOMessageResponder)}.{member} needs the live Fiks IO connection the message arrived on, "
                + "and this message is being replayed after the fact. The channel settled this message when it was "
                + "received; anything sent back to the sender now has to be sent as a new message."
        );
}
