using Altinn.App.Clients.Fiks.Constants;
using Altinn.App.Clients.Fiks.Extensions;
using KS.Fiks.IO.Client.Models;
using KS.Fiks.IO.Client.Send;

namespace Altinn.App.Clients.Fiks.FiksIO.Models;

/// <summary>
/// Represents a received Fiks IO message (inbound).
/// </summary>
public sealed record FiksIOReceivedMessage
{
    /// <summary>
    /// The message content.
    /// </summary>
    public FiksIOReceivedMessageContent Message { get; init; }

    /// <summary>
    /// A responder instance that can be used to respond to the message.
    /// </summary>
    public FiksIOMessageResponder Responder { get; init; }

    /// <summary>
    /// Indicates whether this message is an error response or not.
    /// </summary>
    public bool IsErrorResponse =>
        string.IsNullOrWhiteSpace(Message.MessageType) || FiksIOConstants.IsErrorType(Message.MessageType);

    /// <summary>
    /// Indicates whether this message is a receipt response or not.
    /// </summary>
    public bool IsReceiptResponse =>
        string.IsNullOrWhiteSpace(Message.MessageType) || FiksIOConstants.IsReceiptType(Message.MessageType);

    internal FiksIOReceivedMessage(MottattMeldingArgs mottattMeldingArgs)
    {
        Message = new FiksIOReceivedMessageContent(mottattMeldingArgs.Melding);
        Responder = new FiksIOMessageResponder(mottattMeldingArgs.SvarSender);
    }
}

/// <summary>
/// Represents the content of a received Fiks IO message.
/// </summary>
public sealed record FiksIOReceivedMessageContent
{
    /// <summary>
    /// Indicates whether the message has a payload or not.
    /// </summary>
    public bool HasPayload => _mottattMelding.HasPayload;

    /// <summary>
    /// The ID of the message this is a reply to, if any.
    /// </summary>
    public Guid? InReplyToMessage => _mottattMelding.SvarPaMelding;

    /// <summary>
    /// The correlation ID for this message, if any.
    /// </summary>
    public string? CorrelationId => _mottattMelding.KlientKorrelasjonsId?.FromUrlSafeBase64();

    /// <summary>
    /// The message ID.
    /// </summary>
    public Guid MessageId => _mottattMelding.MeldingId;

    /// <summary>
    /// Sender's reference to this message.
    /// </summary>
    public Guid? SendersReference => _mottattMelding.KlientMeldingId;

    /// <summary>
    /// The message type (e.g. no.ks.fiks.arkiv.v1.arkivering.arkivmelding.opprett.kvittering)
    /// </summary>
    public string MessageType => _mottattMelding.MeldingType;

    /// <summary>
    /// The sender's account ID.
    /// </summary>
    public Guid Sender => _mottattMelding.AvsenderKontoId;

    /// <summary>
    /// The recipient's account ID (e.g. you).
    /// </summary>
    public Guid Recipient => _mottattMelding.MottakerKontoId;

    /// <summary>
    /// The message lifetime.
    /// </summary>
    public TimeSpan MessageLifetime => _mottattMelding.Ttl;

    /// <summary>
    /// The message headers.
    /// </summary>
    public Dictionary<string, string> Headers => _mottattMelding.Headere;

    /// <summary>
    /// Indicates whether this message has been re-sent or not.
    /// </summary>
    public bool IsReSent => _mottattMelding.Resendt;

    /// <summary>
    /// Write the encrypted stream to a ZIP file.
    /// </summary>
    /// <param name="outPath"></param>
    /// <returns></returns>
    public Task WriteEncryptedZip(string outPath) => _mottattMelding.WriteEncryptedZip(outPath);

    /// <summary>
    /// Write the decrypted stream to a ZIP file.
    /// </summary>
    /// <param name="outPath"></param>
    /// <returns></returns>
    public Task WriteDecryptedZip(string outPath) => _mottattMelding.WriteDecryptedZip(outPath);

    /// <summary>
    /// Gets the encrypted stream.
    /// </summary>
    public Task<Stream> GetEncryptedStream() => _mottattMelding.EncryptedStream;

    /// <summary>
    /// Gets the decrypted stream.
    /// </summary>
    public Task<Stream> GetDecryptedStream() => _mottattMelding.DecryptedStream;

    /// <summary>
    /// Gets the decrypted payload content as strings. Cached after first call.
    /// </summary>
    public async Task<IReadOnlyList<(string Filename, string Content)>?> GetDecryptedPayloads()
    {
        if (_decrypedPayloadStrings is null && _mottattMelding.HasPayload)
        {
            var decryptedPayloads = await _mottattMelding.DecryptedPayloads;
            _decrypedPayloadStrings = decryptedPayloads.Select(x => (x.Filename, x.Payload.ReadToString())).ToList();
        }

        return _decrypedPayloadStrings;
    }

    private IMottattMelding _mottattMelding { get; }
    private IReadOnlyList<(string, string)>? _decrypedPayloadStrings;

    internal FiksIOReceivedMessageContent(IMottattMelding mottattMelding)
    {
        _mottattMelding = mottattMelding;
    }
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
        var response = await _svarSender.Svar(
            messageType,
            [.. payload.Select(x => x.ToPayload())],
            sendersReference,
            cancellationToken
        );
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
        var response = await _svarSender.Svar(messageType, sendersReference, cancellationToken);
        return new FiksIOMessageResponse(response);
    }

    /// <summary>
    /// Acknowledge that the message has been consumed.
    /// </summary>
    public async Task Ack() => await _svarSender.AckAsync();

    /// <summary>
    /// Acknowledge that the message could not be consumed.
    /// </summary>
    public async Task Nack() => await _svarSender.NackAsync();

    /// <summary>
    /// Acknowledge that the message could not be consumed and request to put it back in the queue to be consumed again.
    /// </summary>
    public async Task NackWithRequeue() => await _svarSender.NackWithRequeueAsync();

    private ISvarSender _svarSender { get; init; }

    internal FiksIOMessageResponder(ISvarSender svarSender)
    {
        _svarSender = svarSender;
    }
}
