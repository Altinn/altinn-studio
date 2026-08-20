using System.Globalization;
using System.Net;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Seals a received message into its tamper-evident envelope and delivers it into the mailbox that addresses
/// it, over the same authenticated app→engine channel that carries enqueues.
/// </summary>
/// <remarks>
/// One policy lives here and nowhere else: the status mapping. <c>202</c> (appended) and <c>200</c> (this key
/// had already delivered into this mailbox) are both success, which is what makes the two overlapping
/// at-least-once deliveries safe. Everything else surfaces as a
/// <see cref="ServiceTaskReplyForwardException"/> rather than being swallowed here, because only the receiving
/// channel can decide whether its message should be dead-lettered, reported, redelivered or dropped. Retrying
/// is for transport failures alone: a <c>409</c> always means too late and a <c>400</c> means the submission
/// itself was wrong.
/// <para>
/// There is no lookup here, deliberately: the receive workflow was declared by the app-lib when the receiver
/// was enqueued, so a delivery is a mailbox id, a key and a body. Which task's handler reads the message is
/// <em>told</em> by the caller rather than derived, because a derivation can be wrong at signing time and then
/// sign its own mistake.
/// </para>
/// </remarks>
internal sealed class ServiceTaskReplyForwarder(
    IWorkflowEngineClient workflowEngineClient,
    MailboxDeliveryEnvelope envelope,
    AppIdentifier appIdentifier,
    ILogger<ServiceTaskReplyForwarder> logger
) : IServiceTaskReplyForwarder
{
    /// <inheritdoc />
    public async Task ForwardReply(
        Guid mailboxId,
        string serviceTaskType,
        string payload,
        string idempotencyKey,
        CancellationToken cancellationToken = default
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(serviceTaskType);
        ArgumentNullException.ThrowIfNull(payload);
        ArgumentException.ThrowIfNullOrWhiteSpace(idempotencyKey);

        string ns = $"{appIdentifier.Org}/{appIdentifier.App}";

        MailboxDeliveryResult result;
        try
        {
            // Sealing reads the app's callback code, which is absent during a mounting or rotation gap — an ordinary
            // undeliverable-message outcome for the caller, so it is inside the try.
            string sealedPayload = envelope.Wrap(payload, mailboxId, serviceTaskType, idempotencyKey);

            var request = new MailboxDeliveryRequest { IdempotencyKey = idempotencyKey, Payload = sealedPayload };

            result = await workflowEngineClient.DeliverToMailbox(ns, mailboxId, request, cancellationToken);
        }
        catch (WorkflowCallbackSecretNotFoundException ex)
        {
            // Unfiltered on purpose: this exception can never be a cancellation. Nothing left the app, and the code
            // is re-read on every call, so the next attempt after the secret lands succeeds.
            throw Failure(
                ServiceTaskReplyForwardOutcome.SigningUnavailable,
                mailboxId,
                idempotencyKey,
                "the app has no usable workflow callback code to seal the message with",
                ex
            );
        }
        catch (Exception ex) when (ex is not OperationCanceledException || !cancellationToken.IsCancellationRequested)
        {
            // Transport failure, or the client's own timeout: forwarding again is the right response. The filter
            // tests the exception rather than just the token, so a genuine failure racing an unrelated
            // cancellation still surfaces classified instead of escaping unwrapped.
            throw Failure(
                ServiceTaskReplyForwardOutcome.EngineUnavailable,
                mailboxId,
                idempotencyKey,
                "the workflow engine could not be reached",
                ex
            );
        }

        switch (result.StatusCode)
        {
            case HttpStatusCode.Accepted:
                logger.LogDebug(
                    "Forwarded message {IdempotencyKey} into mailbox {MailboxId} at position {Idx}.",
                    idempotencyKey,
                    mailboxId,
                    result.Body?.Idx
                );
                return;

            case HttpStatusCode.OK:
                logger.LogDebug(
                    "Message {IdempotencyKey} was already delivered into mailbox {MailboxId} at position "
                        + "{Idx}; treating the redelivery as forwarded.",
                    idempotencyKey,
                    mailboxId,
                    result.Body?.Idx
                );
                return;

            default:
                throw Failure(
                    MapOutcome(result.StatusCode),
                    mailboxId,
                    idempotencyKey,
                    Describe(result.StatusCode),
                    detail: result.ErrorDetail
                );
        }
    }

    private static ServiceTaskReplyForwardOutcome MapOutcome(HttpStatusCode status) =>
        status switch
        {
            HttpStatusCode.NotFound => ServiceTaskReplyForwardOutcome.Unroutable,
            // Always too late, never too early: a mailbox refuses deliveries only once closed, and a message that
            // precedes its receiver is accepted and waits at its position.
            HttpStatusCode.Conflict => ServiceTaskReplyForwardOutcome.Late,
            HttpStatusCode.RequestEntityTooLarge => ServiceTaskReplyForwardOutcome.PayloadTooLarge,
            HttpStatusCode.TooManyRequests => ServiceTaskReplyForwardOutcome.MailboxFull,
            // The 4xx family the engine does not document, and which resolves on its own: a token the app could not
            // present or that had expired, a gateway refusing during an authorization incident, a request timed
            // out in front of the engine. Classifying them permanently would have the receiving channel
            // dead-letter real business messages that would have been accepted minutes later.
            HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden or HttpStatusCode.RequestTimeout =>
                ServiceTaskReplyForwardOutcome.EngineUnavailable,
            // Any other 4xx is a verdict on this submission and will be reached again by a replay of the same
            // bytes; anything else means the engine did not answer as itself, which the retryable outcome
            // covers.
            >= HttpStatusCode.BadRequest and < HttpStatusCode.InternalServerError =>
                ServiceTaskReplyForwardOutcome.Rejected,
            _ => ServiceTaskReplyForwardOutcome.EngineUnavailable,
        };

    private static string Describe(HttpStatusCode status) =>
        status switch
        {
            HttpStatusCode.NotFound =>
                "no mailbox of this app has that address (it was never opened here, or it has been purged since "
                    + "its exchange ended)",
            HttpStatusCode.Conflict =>
                "the mailbox is closed — the exchange concluded, an operator ended it, or its deadline passed — "
                    + "never that the message came too early, which is accepted",
            HttpStatusCode.RequestEntityTooLarge => "the payload exceeds the workflow engine's message size limit",
            HttpStatusCode.TooManyRequests =>
                "the mailbox has already taken as many messages as the workflow engine allows, and that count "
                    + "never goes back down",
            HttpStatusCode.BadRequest => "the workflow engine rejected the submission as malformed",
            HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden =>
                "the workflow engine refused the call as unauthorized, which is a deployment or credential "
                    + "condition rather than a verdict on this message",
            HttpStatusCode.RequestTimeout => "the call to the workflow engine timed out in front of it",
            _ => $"the workflow engine answered {((int)status).ToString(CultureInfo.InvariantCulture)}",
        };

    /// <remarks>
    /// Builds the exception without logging it: the caller decides what an undeliverable message means and has the
    /// whole exception in hand.
    /// </remarks>
    private static ServiceTaskReplyForwardException Failure(
        ServiceTaskReplyForwardOutcome outcome,
        Guid mailboxId,
        string? idempotencyKey,
        string reason,
        Exception? innerException = null,
        string? detail = null
    )
    {
        string message =
            $"Failed to forward message to workflow engine mailbox {mailboxId} "
            + $"(idempotency key: {idempotencyKey ?? "<none>"}): {reason}."
            + (string.IsNullOrWhiteSpace(detail) ? string.Empty : $" Engine response: {detail}");

        return new ServiceTaskReplyForwardException(outcome, mailboxId, idempotencyKey, message, innerException);
    }
}
