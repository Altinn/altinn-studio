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
/// Seals a received message into its tamper-evident envelope and delivers it into the mailbox. The status
/// mapping lives here and nowhere else. No lookup: which handler reads the message is <em>told</em> by the
/// caller, because a derivation could be wrong at signing time and sign its own mistake.
/// </summary>
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
            // Sealing reads the callback code, absent during a mounting/rotation gap — an ordinary outcome, so
            // inside the try.
            string sealedPayload = envelope.Wrap(payload, mailboxId, serviceTaskType, idempotencyKey);

            var request = new MailboxDeliveryRequest { IdempotencyKey = idempotencyKey, Payload = sealedPayload };

            result = await workflowEngineClient.DeliverToMailbox(ns, mailboxId, request, cancellationToken);
        }
        catch (WorkflowCallbackSecretNotFoundException ex)
        {
            // Never a cancellation, so unfiltered. Nothing left the app; the code is re-read per call.
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
            // The filter tests the exception, not just the token, so a genuine failure racing an unrelated
            // cancellation still surfaces classified.
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
            // Always too late, never too early: an early message is accepted and waits.
            HttpStatusCode.Conflict => ServiceTaskReplyForwardOutcome.Late,
            HttpStatusCode.RequestEntityTooLarge => ServiceTaskReplyForwardOutcome.PayloadTooLarge,
            HttpStatusCode.TooManyRequests => ServiceTaskReplyForwardOutcome.MailboxFull,
            // The undocumented 4xx family that resolves on its own (expired token, gateway mid-incident, timeout in
            // front of the engine). Permanent classification would dead-letter real business messages.
            HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden or HttpStatusCode.RequestTimeout =>
                ServiceTaskReplyForwardOutcome.EngineUnavailable,
            // Any other 4xx is a verdict a replay reaches again; everything else is the retryable outcome.
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

    /// <remarks>Built without logging: the caller decides what an undeliverable message means.</remarks>
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
