using System.Diagnostics;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Processors.Nets.Models;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Features.Payment.Services;

/// <summary>
/// The requests that reach a payment attempt from outside it: the user's cancel and check, and the payment processor's
/// events. Callers authorize the request first.
/// </summary>
internal sealed class PaymentAttemptRequests
{
    private readonly IPaymentService _paymentService;
    private readonly IProcessEngine _processEngine;
    private readonly IWorkflowEngineService _workflowEngineService;
    private readonly ServiceTaskReplyForwarder _replyForwarder;
    private readonly IInstanceClient _instanceClient;
    private readonly ILogger<PaymentAttemptRequests> _logger;

    public PaymentAttemptRequests(
        IPaymentService paymentService,
        IProcessEngine processEngine,
        IWorkflowEngineService workflowEngineService,
        ServiceTaskReplyForwarder replyForwarder,
        IInstanceClient instanceClient,
        ILogger<PaymentAttemptRequests> logger
    )
    {
        _paymentService = paymentService;
        _processEngine = processEngine;
        _workflowEngineService = workflowEngineService;
        _replyForwarder = replyForwarder;
        _instanceClient = instanceClient;
        _logger = logger;
    }

    /// <summary>
    /// Cancels the payment attempt that holds the payment task, and waits until the attempt has handled it. A reserved
    /// payment is refused before anything is sent, and when the attempt reads it as reserved.
    /// </summary>
    public async Task<PaymentAttemptAnswer> Cancel(
        Instance instance,
        string taskId,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        string? language,
        CancellationToken cancellationToken
    )
    {
        if (ProcessStatusHelper.IsIdle(instance))
        {
            return new PaymentAttemptAnswer.NotOpen();
        }

        PaymentInformation payment = await _paymentService.GetPaymentInformation(
            instance,
            paymentConfiguration,
            taskId,
            language,
            cancellationToken
        );
        if (payment.Status == PaymentStatus.Authorized)
        {
            return new PaymentAttemptAnswer.Reserved();
        }

        if (payment.MailboxId is not { } mailboxId)
        {
            return new PaymentAttemptAnswer.NotOpen();
        }

        // One cancel per attempt: the key is constant, and each attempt has its own mailbox.
        PaymentAttemptAnswer answer = await Send(
            instance,
            taskId,
            paymentConfiguration,
            mailboxId,
            PaymentAttemptMessage.Cancel,
            PaymentAttemptMessage.CancelKind,
            language,
            cancellationToken
        );
        return answer is PaymentAttemptAnswer.Record { AttemptOpen: true, Payment.Status: PaymentStatus.Authorized }
            ? new PaymentAttemptAnswer.Reserved()
            : answer;
    }

    /// <summary>
    /// Asks the payment processor about the payment of the attempt that holds the payment task, and tells the attempt
    /// when the status differs from the stored one. Asks nothing and sends nothing unless an attempt holds the task.
    /// </summary>
    public async Task<PaymentAttemptAnswer> Check(
        Instance instance,
        string taskId,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        string? language,
        CancellationToken cancellationToken
    )
    {
        PaymentInformation payment = await _paymentService.GetPaymentInformation(
            instance,
            paymentConfiguration,
            taskId,
            language,
            cancellationToken
        );
        // An idle task has no attempt, so the engine is not asked.
        if (
            ProcessStatusHelper.IsIdle(instance)
            || payment is not { MailboxId: { } mailboxId, PaymentDetails: not null }
        )
        {
            return new PaymentAttemptAnswer.Record(payment);
        }

        try
        {
            if (!(await _workflowEngineService.ResolveWorkflowTaskStatus(instance, cancellationToken)).AwaitingMessages)
            {
                return new PaymentAttemptAnswer.Record(payment);
            }
        }
        catch (HttpRequestException exception) when (!cancellationToken.IsCancellationRequested)
        {
            return EngineUnreachable(exception, instance);
        }

        PaymentStatus reported;
        try
        {
            reported = await _paymentService.GetProcessorStatus(instance, payment, cancellationToken);
        }
        catch (Exception exception) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning(
                exception,
                "Could not ask the payment processor about the payment of instance {InstanceId}.",
                instance.Id
            );
            return new PaymentAttemptAnswer.ProcessorUnavailable();
        }

        if (reported == payment.Status)
        {
            return new PaymentAttemptAnswer.Record(payment);
        }

        // Keyed on the status, so each status reaches the attempt at most once.
        return await Send(
            instance,
            taskId,
            paymentConfiguration,
            mailboxId,
            PaymentAttemptMessage.Check,
            $"{PaymentAttemptMessage.CheckKind}:{reported}",
            language,
            cancellationToken
        );
    }

    /// <summary>
    /// Forwards a Nets event to the payment attempt whose mailbox the webhook URL names, or, for a payment created
    /// without one, the mailbox its stored payment names. Logs an event no open attempt can take. Throws only when
    /// Nets calling again can help.
    /// </summary>
    public async Task ForwardNetsEvent(
        AppIdentifier appId,
        InstanceIdentifier instanceId,
        Guid? mailboxId,
        NetsCompleteWebhookPayload webhookPayload,
        CancellationToken cancellationToken
    )
    {
        string paymentId = webhookPayload.Data.PaymentId;
        if (mailboxId is null)
        {
            PaymentInformation? payment = await FindPaymentRecord(appId, instanceId, paymentId, cancellationToken);
            if (payment?.MailboxId is not { } recordedMailboxId)
            {
                LogEventWithoutAttempt(instanceId, webhookPayload, payment);
                return;
            }

            mailboxId = recordedMailboxId;
        }
        else if (!await _workflowEngineService.IsMailboxOfInstance(instanceId, mailboxId.Value, cancellationToken))
        {
            // The secret is shared by every instance, so the URL alone does not prove which attempt the event is for.
            _logger.LogError(
                "Dropped Nets event {EventName} for payment {Payment} of instance {InstanceGuid}: the engine knows no mailbox {MailboxId} of the instance.",
                webhookPayload.EventName,
                paymentId,
                instanceId.InstanceGuid,
                mailboxId
            );
            return;
        }

        try
        {
            await _replyForwarder.Forward(
                mailboxId.Value,
                PipelineId.ActionPipeline(AltinnTaskTypes.Payment, PaymentProcessTask.PayAction),
                PaymentAttemptMessage.NetsEvent(webhookPayload.EventName),
                webhookPayload.Id,
                sender: null,
                cancellationToken
            );
        }
        catch (ServiceTaskReplyForwardException exception)
            when (exception.Outcome is ServiceTaskReplyForwardOutcome.Late)
        {
            PaymentInformation? payment;
            try
            {
                payment = await FindPaymentRecord(appId, instanceId, paymentId, cancellationToken);
            }
            catch (Exception readException) when (!cancellationToken.IsCancellationRequested)
            {
                _logger.LogWarning(
                    readException,
                    "Nets event {EventName} for payment {Payment} of instance {InstanceGuid} came after its payment attempt ended, and the stored payment could not be read.",
                    webhookPayload.EventName,
                    paymentId,
                    instanceId.InstanceGuid
                );
                return;
            }

            LogEventWithoutAttempt(instanceId, webhookPayload, payment);
        }
        catch (ServiceTaskReplyForwardException exception) when (!exception.IsTransient)
        {
            // Nets calling again cannot help.
            _logger.LogError(
                exception,
                "Dropped Nets event {EventName} for payment {Payment} of instance {InstanceGuid}.",
                webhookPayload.EventName,
                paymentId,
                instanceId.InstanceGuid
            );
        }
    }

    /// <summary>
    /// Logs a Nets event that no open payment attempt can take: as an error when it says that a payment went through
    /// which the stored payment does not show as paid.
    /// </summary>
    private void LogEventWithoutAttempt(
        InstanceIdentifier instanceId,
        NetsCompleteWebhookPayload webhookPayload,
        PaymentInformation? payment
    )
    {
        bool saysPaid = webhookPayload.EventName is "payment.checkout.completed" or "payment.charge.created.v2";
        _logger.Log(
            saysPaid && payment?.Status != PaymentStatus.Paid ? LogLevel.Error : LogLevel.Information,
            "Nets event {EventName} for payment {Payment} of instance {InstanceGuid} reached no open payment attempt. The stored payment is {Status}.",
            webhookPayload.EventName,
            webhookPayload.Data.PaymentId,
            instanceId.InstanceGuid,
            payment?.Status.ToString() ?? "missing"
        );
    }

    /// <summary>
    /// The engine could not be asked whether an attempt holds the task, which workflow it runs in, or how far the
    /// message got. The idempotency key makes sending again safe.
    /// </summary>
    private PaymentAttemptAnswer.EngineUnavailable EngineUnreachable(HttpRequestException exception, Instance instance)
    {
        _logger.LogWarning(
            exception,
            "The workflow engine could not be reached for a message to the payment attempt of instance {InstanceId}.",
            instance.Id
        );
        return new PaymentAttemptAnswer.EngineUnavailable();
    }

    private async Task<PaymentInformation?> FindPaymentRecord(
        AppIdentifier appId,
        InstanceIdentifier instanceId,
        string paymentId,
        CancellationToken cancellationToken
    )
    {
        Instance instance = await _instanceClient.GetInstance(
            appId.App,
            appId.Org,
            instanceId.InstanceOwnerPartyId,
            instanceId.InstanceGuid,
            StorageAuthenticationMethod.ServiceOwner(),
            cancellationToken
        );
        return await _paymentService.FindPaymentRecord(instance, paymentId, cancellationToken);
    }

    /// <summary>
    /// Sends the caller's message to the payment attempt and waits until it is handled. A message the attempt took
    /// is answered with the payment record stored afterwards.
    /// </summary>
    private async Task<PaymentAttemptAnswer> Send(
        Instance instance,
        string taskId,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        Guid mailboxId,
        string message,
        string idempotencyKey,
        string? language,
        CancellationToken cancellationToken
    )
    {
        ActionPipelineOutcome outcome;
        try
        {
            outcome = await _processEngine.SendToActionPipeline(
                instance,
                mailboxId,
                message,
                idempotencyKey,
                language,
                cancellationToken
            );
        }
        catch (ServiceTaskReplyForwardException exception)
            when (exception.Outcome is ServiceTaskReplyForwardOutcome.Late or ServiceTaskReplyForwardOutcome.Unroutable)
        {
            // The attempt has ended. Its transition or release may still hold the instance, so only the stored payment
            // tells how.
            Instance current = await _instanceClient.GetInstance(instance, cancellationToken: cancellationToken);
            return new PaymentAttemptAnswer.Record(
                await _paymentService.GetPaymentInformation(
                    current,
                    paymentConfiguration,
                    taskId,
                    language,
                    cancellationToken
                )
            );
        }
        catch (ServiceTaskReplyForwardException exception)
        {
            return
                exception.Outcome
                    is ServiceTaskReplyForwardOutcome.EngineUnavailable
                        or ServiceTaskReplyForwardOutcome.SigningUnavailable
                ? new PaymentAttemptAnswer.EngineUnavailable()
                : new PaymentAttemptAnswer.MessageLimit();
        }
        catch (HttpRequestException exception) when (!cancellationToken.IsCancellationRequested)
        {
            return EngineUnreachable(exception, instance);
        }

        if (outcome is ActionPipelineOutcome.Refused { Result: var refusal })
        {
            return new PaymentAttemptAnswer.Refused(refusal);
        }

        (InstanceWithStorageMetadata after, bool attemptOpen) = outcome switch
        {
            ActionPipelineOutcome.Open open => (open.Instance, true),
            ActionPipelineOutcome.Moved moved => (moved.Instance, false),
            ActionPipelineOutcome.Released released => (released.Instance, false),
            // The attempt ended between the read and the send.
            ActionPipelineOutcome.NotOpen notOpen => (notOpen.Instance, false),
            _ => throw new UnreachableException($"Unknown action pipeline outcome {outcome.GetType().Name}."),
        };
        return new PaymentAttemptAnswer.Record(
            await _paymentService.GetPaymentInformation(
                after.Instance,
                paymentConfiguration,
                taskId,
                language,
                cancellationToken
            ),
            attemptOpen
        );
    }
}
