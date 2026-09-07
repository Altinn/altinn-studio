using System.Diagnostics;
using System.Text.Json;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

/// <summary>
/// Hosts the Fiks IO subscription: keeps the connection alive, and hands each received message to the
/// waiting service task. Nothing else happens here — the subscriber decrypts (only possible on the live
/// connection) and forwards.
/// </summary>
internal sealed class FiksArkivSubscriber : BackgroundService
{
    private readonly ILogger<FiksArkivSubscriber> _logger;
    private readonly IFiksIOClient _fiksIOClient;
    private readonly Telemetry? _telemetry;
    private readonly IHostEnvironment _env;
    private readonly TimeProvider _timeProvider;
    private readonly IServiceScopeFactory _serviceScopeFactory;

    public FiksArkivSubscriber(
        IFiksIOClient fiksIOClient,
        ILogger<FiksArkivSubscriber> logger,
        IServiceScopeFactory serviceScopeFactory,
        IHostEnvironment env,
        TimeProvider? timeProvider = null,
        Telemetry? telemetry = null
    )
    {
        _logger = logger;
        _fiksIOClient = fiksIOClient;
        _telemetry = telemetry;
        _serviceScopeFactory = serviceScopeFactory;
        _timeProvider = timeProvider ?? TimeProvider.System;
        _env = env;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            _logger.LogInformation("Fiks Arkiv Service starting");
            await _fiksIOClient.OnMessageReceived(IncomingMessageListener);

            DateTimeOffset nextIteration = GetLoopDelay();
            DateTimeOffset nextHealthCheck = GetHealthCheckDelay();

            // Keep-alive loop
            while (!stoppingToken.IsCancellationRequested)
            {
                TimeSpan delta = nextIteration - _timeProvider.GetUtcNow();
                await _timeProvider.Delay(delta > TimeSpan.Zero ? delta : TimeSpan.Zero, stoppingToken);

                // Perform health check
                if (_timeProvider.GetUtcNow() >= nextHealthCheck)
                {
                    if (await _fiksIOClient.IsHealthy() is false)
                    {
                        _logger.LogError("FiksIO Client is unhealthy, reconnecting.");
                        await _fiksIOClient.Reconnect();
                    }

                    nextHealthCheck = GetHealthCheckDelay();
                }

                nextIteration = GetLoopDelay();
            }
        }
        finally
        {
            _logger.LogInformation("Fiks Arkiv Service stopping.");
            await _fiksIOClient.DisposeAsync();
        }

        return;

        DateTimeOffset GetLoopDelay() => _timeProvider.GetUtcNow() + TimeSpan.FromSeconds(1);
        DateTimeOffset GetHealthCheckDelay() => _timeProvider.GetUtcNow() + TimeSpan.FromMinutes(10);
    }

    /// <remarks>
    /// The one decision made here is whether Fiks IO should redeliver, following the forwarder's verdict; a
    /// message with no usable reply address, or a settled outcome, is acknowledged and logged as an error.
    /// Every read of the message happens inside the try — it came from outside, and a throw above the try
    /// would escape the listener with no log and no acknowledgement.
    /// </remarks>
    internal async Task IncomingMessageListener(FiksIOReceivedMessage message)
    {
        Activity? mainActivity = null;

        try
        {
            string? correlationId = ReadCorrelationId(message);

            mainActivity = _telemetry?.StartReceiveFiksActivity(
                message.Message.Sender,
                message.Message.MessageId,
                message.Message.MessageType,
                message.Message.SendersReference,
                message.Message.InReplyToMessage,
                correlationId
            );

            _logger.LogInformation(
                "Received message {MessageType}:{MessageId} from {MessageSender}, in reply to {MessageReplyFor} with "
                    + "senders-reference {SendersReference} and correlation-id {CorrelationId}",
                message.Message.MessageType,
                message.Message.MessageId,
                message.Message.Sender,
                message.Message.InReplyToMessage,
                message.Message.SendersReference,
                correlationId
            );

            _telemetry?.RecordFiksMessageReceived(
                message.IsErrorResponse ? Telemetry.Fiks.FiksResult.Error : Telemetry.Fiks.FiksResult.Success
            );

            if (!Guid.TryParse(correlationId, out Guid mailboxId) || mailboxId == Guid.Empty)
            {
                _logger.LogError(
                    "Fiks Arkiv message {MessageId} carries no usable correlation id ({CorrelationId}), so there is "
                        + "no way to tell which service task is waiting for it. Acknowledging without forwarding.",
                    message.Message.MessageId,
                    correlationId
                );
                await message.Responder.Ack();
                return;
            }

            // Turned into a verdict inside this try so the responder call stays covered: a throw from Ack in a
            // sibling catch would escape the listener.
            bool forwarded = false;
            bool requestRedelivery = false;
            try
            {
                await ForwardReply(message, mailboxId);
                forwarded = true;
            }
            catch (ServiceTaskReplyForwardException e)
            {
                mainActivity?.Errored(e);
                requestRedelivery = ShouldRequestRedelivery(e);

                if (requestRedelivery)
                {
                    _logger.LogWarning(
                        e,
                        "Could not forward Fiks Arkiv message {MessageId} ({Outcome}). Requesting redelivery.",
                        message.Message.MessageId,
                        e.Outcome
                    );
                }
                else
                {
                    _logger.LogError(
                        e,
                        "Fiks Arkiv message {MessageId} could not be delivered to a waiting service task ({Outcome}) and will not be retried: {Error}",
                        message.Message.MessageId,
                        e.Outcome,
                        e.Message
                    );
                }
            }

            if (requestRedelivery)
            {
                await message.Responder.NackWithRequeue();
                return;
            }

            await message.Responder.Ack();

            if (forwarded)
                _logger.LogInformation("Message {MessageId} forwarded successfully", message.Message.MessageId);
        }
        catch (Exception e)
        {
            _logger.LogError(
                e,
                "Fiks Arkiv MessageReceivedHandler failed with unrecoverable error: {Error}",
                e.Message
            );
            mainActivity?.Errored(e);

            // Don't ack messages we failed to process in PROD. Let Fiks IO redeliver and/or trigger alarms.
            if (!_env.IsProduction())
                await message.Responder.Ack();
        }
        finally
        {
            mainActivity?.Dispose();
        }
    }

    /// <summary>
    /// Whether Fiks IO should redeliver, decided per <see cref="ServiceTaskReplyForwardException.Outcome"/>
    /// so no verdict is a drifted default. Easy to misread: a full mailbox never frees a slot, <c>Late</c>
    /// never means early, and a rejected submission is wrong rather than badly timed.
    /// </summary>
    private static bool ShouldRequestRedelivery(ServiceTaskReplyForwardException exception) =>
        exception.Outcome switch
        {
            // Nothing left the app, and the callback code is re-read on every call.
            ServiceTaskReplyForwardOutcome.EngineUnavailable => true,
            ServiceTaskReplyForwardOutcome.SigningUnavailable => true,

            ServiceTaskReplyForwardOutcome.Unroutable => false,
            ServiceTaskReplyForwardOutcome.Late => false,
            ServiceTaskReplyForwardOutcome.PayloadTooLarge => false,
            ServiceTaskReplyForwardOutcome.MailboxFull => false,
            ServiceTaskReplyForwardOutcome.Rejected => false,

            _ => exception.IsTransient,
        };

    private async Task ForwardReply(FiksIOReceivedMessage message, Guid mailboxId)
    {
        var payloads = await message.Message.GetDecryptedPayloads();
        var storedMessage = new StoredFiksArkivMessage
        {
            MessageId = message.Message.MessageId,
            MessageType = message.Message.MessageType,
            SendersReference = message.Message.SendersReference,
            InReplyToMessage = message.Message.InReplyToMessage,
            CorrelationId = mailboxId.ToString(),
            Sender = message.Message.Sender,
            Recipient = message.Message.Recipient,
            MessageLifetime = message.Message.MessageLifetime,
            IsReSent = message.Message.IsReSent,
            Headers = message.Message.Headers,
            Payloads =
            [
                .. payloads?.Select(x => new StoredFiksArkivPayload { Filename = x.Filename, Content = x.Content })
                    ?? [],
            ],
        };

        // Per message from a scope: this is a singleton BackgroundService, and holding the transient forwarder
        // would pin its HttpClient for the process lifetime.
        await using AsyncServiceScope scope = _serviceScopeFactory.CreateAsyncScope();
        var forwarder = scope.ServiceProvider.GetRequiredService<IServiceTaskReplyForwarder>();

        _logger.LogInformation(
            "Forwarding Fiks Arkiv message {MessageType}:{MessageId} with {PayloadCount} payload(s) to mailbox {MailboxId}",
            storedMessage.MessageType,
            storedMessage.MessageId,
            storedMessage.Payloads?.Count ?? 0,
            mailboxId
        );

        // The Fiks IO message id is the idempotency key, making at-least-once delivery and retries safe. The
        // task type is named, not derived, so an envelope can never be sealed against the wrong handler.
        await forwarder.ForwardReply(
            mailboxId,
            AltinnTaskTypes.FiksArkiv,
            JsonSerializer.Serialize(storedMessage),
            idempotencyKey: storedMessage.MessageId.ToString()
        );
    }

    /// <summary>
    /// The correlation id, or <c>null</c> when unreadable. The property base64-decodes and throws on anything
    /// else — which other integrations on a shared Fiks IO account routinely send — and since this field routes
    /// the reply, an undecodable one must be an ordinary "none" rather than a fault.
    /// </summary>
    private string? ReadCorrelationId(FiksIOReceivedMessage message)
    {
        try
        {
            return message.Message.CorrelationId;
        }
        catch (Exception e)
        {
            _logger.LogWarning(
                e,
                "Fiks Arkiv message {MessageId} has a correlation id that could not be decoded: {Error}",
                message.Message.MessageId,
                e.Message
            );
            return null;
        }
    }
}
