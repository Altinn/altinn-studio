using System.Diagnostics;
using Altinn.App.Core.Features.Payment.Exceptions;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Processors;
using Altinn.App.Core.Features.Payment.Processors.Nets;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Features.Payment.Services;

/// <summary>
/// Service that wraps most payment related features
/// </summary>
internal class PaymentService : IPaymentService
{
    private readonly IDataService _dataService;
    private readonly ILogger<PaymentService> _logger;
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly IProcessReader _processReader;
    private readonly IWorkflowEngineService _workflowEngineService;
    private readonly Telemetry? _telemetry;

    /// <summary>
    /// Initializes a new instance of the <see cref="PaymentService"/> class.
    /// </summary>
    public PaymentService(
        IDataService dataService,
        ILogger<PaymentService> logger,
        AppImplementationFactory appImplementationFactory,
        IProcessReader processReader,
        IWorkflowEngineService workflowEngineService,
        Telemetry? telemetry = null
    )
    {
        _dataService = dataService;
        _logger = logger;
        _appImplementationFactory = appImplementationFactory;
        _processReader = processReader;
        _workflowEngineService = workflowEngineService;
        _telemetry = telemetry;
    }

    /// <inheritdoc/>
    public async Task<ServiceTaskOpeningStageResult> StartAttempt(
        StageContext context,
        ServiceTaskMailbox mailbox,
        ValidAltinnPaymentConfiguration paymentConfiguration
    )
    {
        using var activity = _telemetry?.StartPaymentServiceActivity();
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        StoredPaymentInformation? existingPayment = await ReadAttemptRecord(
            context,
            paymentConfiguration.PaymentDataType
        );
        Instance instance = dataMutator.Instance;
        if (existingPayment?.EndingStoredBy(context.StepId) is { } storedEnding)
        {
            return ToOpeningStageResult(storedEnding);
        }

        // A release stores nothing, so a closed mailbox is what tells a later run of this stage that an earlier one
        // released: only that run's conclusion, an operator or the deadline closes the mailbox before the attempt opens.
        if (!await _workflowEngineService.IsMailboxOpen(mailbox.Id, context.CancellationToken))
        {
            return ToOpeningStageResult(PaymentAttemptEnding.Release);
        }

        try
        {
            if (existingPayment is not null && !existingPayment.PaymentInformation.Status.IsClosed())
            {
                PaymentInformation existing = existingPayment.PaymentInformation;
                PaymentStatus reported =
                    existing.Status == PaymentStatus.Paid
                        ? PaymentStatus.Paid
                        : await TerminateOrRefreshStatus(
                            GetPaymentProcessor(existing),
                            instance,
                            existing,
                            GetPaymentDetails(existing),
                            dataMutator.Language,
                            context.CancellationToken
                        );

                if (reported == PaymentStatus.Paid)
                {
                    return StoreAndEnd(existingPayment, PaymentAttemptEnding.MoveOn);
                }

                if (reported == PaymentStatus.Authorized)
                {
                    // The attempt waits for the charge, which the processor's event or the user's check reports.
                    existing.MailboxId = mailbox.Id;
                    existing.Language = dataMutator.Language;
                    return StoreAndEnd(existingPayment, PaymentAttemptEnding.AwaitNextMessage);
                }

                if (!reported.IsClosed())
                {
                    _logger.LogError(
                        "Payment {PaymentId} for instance {InstanceId} could not be terminated, and is {Status}. No new payment is started.",
                        existing.PaymentDetails?.PaymentId,
                        instance.Id,
                        reported.ToString()
                    );
                    return ToOpeningStageResult(PaymentAttemptEnding.Release);
                }
            }

            OrderDetails orderDetails = await CalculateOrderDetails(
                instance,
                dataMutator.Language,
                context.CancellationToken
            );
            IPaymentProcessor paymentProcessor = GetPaymentProcessor(orderDetails.PaymentProcessorId);
            if (orderDetails.TotalPriceIncVat <= 0)
            {
                _logger.LogInformation(
                    "Skipping starting payment using {PaymentProcessorId} since order sum is zero for instance {InstanceId}.",
                    paymentProcessor.PaymentProcessorId,
                    instance.Id
                );
                return StoreNewAndEnd(
                    new PaymentInformation
                    {
                        TaskId = GetTaskId(dataMutator),
                        Status = PaymentStatus.Skipped,
                        OrderDetails = orderDetails,
                        Language = dataMutator.Language,
                    },
                    PaymentAttemptEnding.MoveOn
                );
            }

            PaymentDetails paymentDetails = paymentProcessor is IPaymentAttemptProcessor attemptProcessor
                ? await attemptProcessor.StartPayment(
                    instance,
                    orderDetails,
                    dataMutator.Language,
                    mailbox.Id,
                    context.CancellationToken
                )
                : await paymentProcessor.StartPayment(
                    instance,
                    orderDetails,
                    dataMutator.Language,
                    context.CancellationToken
                );
            _logger.LogInformation(
                "Payment started successfully using {PaymentProcessorId} for instance {InstanceId}.",
                paymentProcessor.PaymentProcessorId,
                instance.Id
            );
            return StoreNewAndEnd(
                new PaymentInformation
                {
                    TaskId = GetTaskId(dataMutator),
                    Status = PaymentStatus.Created,
                    OrderDetails = orderDetails,
                    PaymentDetails = paymentDetails,
                    Language = dataMutator.Language,
                    MailboxId = mailbox.Id,
                },
                PaymentAttemptEnding.AwaitNextMessage
            );
        }
        catch (Exception exception) when (!context.CancellationToken.IsCancellationRequested)
        {
            activity?.Errored(exception);
            _logger.LogError(exception, "Could not start a payment for instance {InstanceId}.", instance.Id);
            return ToOpeningStageResult(PaymentAttemptEnding.Release);
        }

        ServiceTaskOpeningStageResult StoreAndEnd(StoredPaymentInformation record, PaymentAttemptEnding ending)
        {
            record.Store(dataMutator, new PaymentAttemptStep(context.StepId, ending));
            return ToOpeningStageResult(ending);
        }

        ServiceTaskOpeningStageResult StoreNewAndEnd(PaymentInformation payment, PaymentAttemptEnding ending)
        {
            StoredPaymentInformation.Store(
                dataMutator,
                paymentConfiguration.PaymentDataType,
                existingPayment,
                payment,
                new PaymentAttemptStep(context.StepId, ending)
            );
            return ToOpeningStageResult(ending);
        }
    }

    private static ServiceTaskOpeningStageResult ToOpeningStageResult(PaymentAttemptEnding ending) =>
        ending switch
        {
            PaymentAttemptEnding.AwaitNextMessage => ServiceTaskOpeningStageResult.Completed(),
            PaymentAttemptEnding.MoveOn => ServiceTaskOpeningStageResult.Conclude(ServiceTaskResult.Success("confirm")),
            PaymentAttemptEnding.Release => ServiceTaskOpeningStageResult.Conclude(ActionPipelineResult.Release()),
            _ => throw new UnreachableException($"A payment attempt does not open with {ending}."),
        };

    /// <inheritdoc/>
    public async Task<ServiceTaskExchangeResult> HandleAttemptMessage(
        StageContext context,
        ServiceTaskReply reply,
        ValidAltinnPaymentConfiguration paymentConfiguration
    )
    {
        PaymentAttemptTrigger? trigger = PaymentAttemptMessage.Parse(reply.Payload) switch
        {
            { Kind: PaymentAttemptMessage.NetsEventKind, Event: NetsPaymentProcessor.ChargeFailedEventName } =>
                PaymentAttemptTrigger.ChargeFailed,
            { Kind: PaymentAttemptMessage.NetsEventKind or PaymentAttemptMessage.CheckKind } =>
                PaymentAttemptTrigger.StatusUpdate,
            { Kind: PaymentAttemptMessage.CancelKind } => PaymentAttemptTrigger.Cancel,
            _ => null,
        };
        if (trigger is null)
        {
            return ServiceTaskResult.FailedPermanent(
                $"Message {reply.IdempotencyKey} is not a payment attempt message."
            );
        }

        return await Settle(context, paymentConfiguration, trigger.Value);
    }

    /// <inheritdoc/>
    public async Task<ServiceTaskResult> SettleAtDeadline(
        StageContext context,
        ValidAltinnPaymentConfiguration paymentConfiguration
    ) =>
        await Settle(context, paymentConfiguration, PaymentAttemptTrigger.Deadline) as ServiceTaskResult
        ?? throw new UnreachableException("No verdict at the deadline waits for another message.");

    /// <summary>
    /// Asks the payment processor for the payment's status, and stores and ends as the verdict for it says. When the
    /// processor refuses a call the verdict needs, it asks again and follows the verdict for the new answer.
    /// </summary>
    private async Task<ServiceTaskExchangeResult> Settle(
        StageContext context,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        PaymentAttemptTrigger trigger
    )
    {
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        StoredPaymentInformation? storedPayment = await ReadAttemptRecord(
            context,
            paymentConfiguration.PaymentDataType
        );
        Instance instance = dataMutator.Instance;
        if (storedPayment?.EndingStoredBy(context.StepId) is { } storedEnding)
        {
            return ToExchangeResult(storedEnding);
        }

        if (storedPayment?.PaymentInformation.PaymentDetails is null)
        {
            return ServiceTaskResult.FailedPermanent("The payment attempt has no started payment stored.");
        }

        PaymentInformation payment = storedPayment.PaymentInformation;
        IPaymentProcessor paymentProcessor = GetPaymentProcessor(payment);
        string paymentId = GetPaymentDetails(payment).PaymentId;
        HashSet<PaymentProcessorCall> refused = [];
        while (true)
        {
            // In the language the user paid in, so the redirect URL stays the one the user was sent to.
            (PaymentStatus reported, PaymentDetails reportedDetails) = await paymentProcessor.GetPaymentStatus(
                instance,
                paymentId,
                payment.OrderDetails.TotalPriceIncVat,
                payment.Language,
                context.CancellationToken
            );
            PaymentAttemptVerdict? verdict = PaymentAttemptVerdict.Decide(trigger, reported);
            if (verdict is null)
            {
                return ServiceTaskResult.FailedPermanent(
                    $"{paymentProcessor.PaymentProcessorId} reports payment {paymentId} as {reported}, which no started payment can be."
                );
            }

            PaymentProcessorCall? acceptedCall = null;
            if (verdict.CallFirst is { } call)
            {
                if (refused.Contains(call))
                {
                    return ServiceTaskResult.FailedRetryable(
                        $"{paymentProcessor.PaymentProcessorId} refused to {call} payment {paymentId}, and still reports it as {reported}."
                    );
                }

                if (await CallPaymentProcessor(call, paymentProcessor, instance, payment, context.CancellationToken))
                {
                    acceptedCall = call;
                }
                else
                {
                    _logger.LogInformation(
                        "{PaymentProcessorId} refused to {Call} payment {PaymentId} for instance {InstanceId}. Asking for its status again.",
                        paymentProcessor.PaymentProcessorId,
                        call.ToString(),
                        paymentId,
                        instance.Id
                    );
                    refused.Add(call);
                    continue;
                }
            }

            verdict.EnsureMayEnd(reported, acceptedCall);
            PaymentAttemptEnding ending =
                verdict.End == PaymentAttemptEnding.GoBack
                && !_processReader.IsActionAllowedForTask(GetTaskId(dataMutator), "reject")
                    ? PaymentAttemptEnding.Release
                    : verdict.End;
            payment.Status = verdict.Store;
            payment.PaymentDetails = reportedDetails;
            storedPayment.Store(dataMutator, new PaymentAttemptStep(context.StepId, ending));
            _logger.LogInformation(
                "Payment attempt for instance {InstanceId} stored {Status} and ends with {Ending}.",
                instance.Id,
                verdict.Store.ToString(),
                ending.ToString()
            );
            return ToExchangeResult(ending);
        }
    }

    private static ServiceTaskExchangeResult ToExchangeResult(PaymentAttemptEnding ending) =>
        ending switch
        {
            PaymentAttemptEnding.AwaitNextMessage => ServiceTaskExchangeResult.AwaitNextReply(),
            PaymentAttemptEnding.MoveOn => ServiceTaskResult.Success("confirm"),
            PaymentAttemptEnding.GoBack => ServiceTaskResult.Success("reject"),
            PaymentAttemptEnding.Release => ActionPipelineResult.Release(),
            _ => throw new UnreachableException($"Unknown payment attempt ending {ending}."),
        };

    /// <summary>
    /// Reads the payment record for a step of a payment attempt. When the step's state shows no record, or one that
    /// changed after the state was captured, only an earlier run of the same step can have stored it: the instance is
    /// processing, and the steps of an attempt run one at a time. The step then reads the instance again as Storage
    /// has it now, as a run whose save Storage replayed does, and finds that run's ending in the record. A record that
    /// another step stored is a conflict, and fails the step.
    /// </summary>
    private static async Task<StoredPaymentInformation?> ReadAttemptRecord(StageContext context, string paymentDataType)
    {
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        DataElementContentConflictException? conflict = null;
        try
        {
            StoredPaymentInformation? record = await StoredPaymentInformation.Read(dataMutator, paymentDataType);
            // A data element the state knows no blob version of is read without a check, so the record can name
            // this step without a conflict.
            if (record is not null && record.EndingStoredBy(context.StepId) is null)
            {
                return record;
            }
        }
        catch (DataElementContentConflictException exception)
        {
            conflict = exception;
        }

        IReloadableInstanceData reloadable =
            dataMutator as IReloadableInstanceData
            ?? throw new InvalidOperationException(
                "A payment attempt step needs instance data it can read again from Storage."
            );
        await reloadable.ReloadFromStorage(context.CancellationToken);
        StoredPaymentInformation? current = await StoredPaymentInformation.Read(dataMutator, paymentDataType);
        if (current is not null && current.EndingStoredBy(context.StepId) is null)
        {
            throw conflict
                ?? new DataElementContentConflictException(dataMutator.Instance.Id, Guid.Parse(current.DataElement.Id));
        }

        return current;
    }

    private static async Task<bool> CallPaymentProcessor(
        PaymentProcessorCall call,
        IPaymentProcessor paymentProcessor,
        Instance instance,
        PaymentInformation payment,
        CancellationToken cancellationToken
    ) =>
        call switch
        {
            PaymentProcessorCall.Terminate => await paymentProcessor.TerminatePayment(
                instance,
                payment,
                cancellationToken
            ),
            // A processor an app implements cannot cancel a reservation, which then counts as refused.
            PaymentProcessorCall.CancelReservation => paymentProcessor is IPaymentAttemptProcessor attemptProcessor
                && await attemptProcessor.CancelReservation(instance, payment, cancellationToken),
            _ => throw new UnreachableException($"Unknown payment processor call {call}."),
        };

    /// <inheritdoc/>
    public async Task RefreshUnpaidPayment(
        IInstanceDataMutator dataMutator,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        CancellationToken cancellationToken = default
    )
    {
        StoredPaymentInformation? storedPayment = await StoredPaymentInformation.Read(
            dataMutator,
            paymentConfiguration.PaymentDataType
        );
        if (
            storedPayment?.PaymentInformation
            is not { Status: not PaymentStatus.Paid, PaymentDetails: { } details } payment
        )
        {
            return;
        }

        (payment.Status, payment.PaymentDetails) = await GetPaymentProcessor(payment)
            .GetPaymentStatus(
                dataMutator.Instance,
                details.PaymentId,
                payment.OrderDetails.TotalPriceIncVat,
                payment.Language,
                cancellationToken
            );
        storedPayment.UpdateIfChanged(dataMutator);
    }

    /// <inheritdoc/>
    public async Task<PaymentInformation> GetPaymentInformation(
        Instance instance,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        string taskId,
        string? language,
        CancellationToken cancellationToken = default
    )
    {
        (Guid _, PaymentInformation? paymentInformation) = await _dataService.GetByType<PaymentInformation>(
            instance,
            paymentConfiguration.PaymentDataType,
            cancellationToken: cancellationToken
        );
        if (paymentInformation is not null)
        {
            return paymentInformation;
        }

        return new PaymentInformation
        {
            TaskId = taskId,
            Status = PaymentStatus.Uninitialized,
            OrderDetails = await CalculateOrderDetails(instance, language, cancellationToken),
        };
    }

    /// <inheritdoc/>
    public async Task<PaymentStatus> GetProcessorStatus(
        Instance instance,
        PaymentInformation paymentInformation,
        CancellationToken cancellationToken = default
    )
    {
        (PaymentStatus status, PaymentDetails _) = await GetPaymentProcessor(paymentInformation)
            .GetPaymentStatus(
                instance,
                GetPaymentDetails(paymentInformation).PaymentId,
                paymentInformation.OrderDetails.TotalPriceIncVat,
                paymentInformation.Language,
                cancellationToken
            );
        return status;
    }

    /// <inheritdoc/>
    public async Task<PaymentInformation?> FindPaymentRecord(
        Instance instance,
        string paymentId,
        CancellationToken cancellationToken = default
    )
    {
        IEnumerable<string> paymentDataTypes = _processReader
            .GetProcessTasks()
            .Select(task => task.ExtensionElements?.TaskExtension?.PaymentConfiguration?.PaymentDataType)
            .OfType<string>()
            .Distinct(StringComparer.Ordinal);
        foreach (string paymentDataType in paymentDataTypes)
        {
            (Guid _, PaymentInformation? paymentInformation) = await _dataService.GetByType<PaymentInformation>(
                instance,
                paymentDataType,
                StorageAuthenticationMethod.ServiceOwner(),
                cancellationToken
            );
            if (paymentInformation?.PaymentDetails?.PaymentId == paymentId)
            {
                return paymentInformation;
            }
        }

        return null;
    }

    private async Task<OrderDetails> CalculateOrderDetails(
        Instance instance,
        string? language,
        CancellationToken cancellationToken
    )
    {
        IOrderDetailsCalculator orderDetailsCalculator =
            _appImplementationFactory.Get<IOrderDetailsCalculator>()
            ?? throw new PaymentException(
                "You must add an implementation of the IOrderDetailsCalculator interface to the DI container. See payment related documentation."
            );
        using var activity = _telemetry?.StartCalculateOrderDetailsActivity(orderDetailsCalculator);
        try
        {
            return await orderDetailsCalculator.CalculateOrderDetails(instance, language, cancellationToken);
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<bool> PrepareAbandon(
        IInstanceDataMutator dataMutator,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        CancellationToken cancellationToken = default
    )
    {
        Instance instance = dataMutator.Instance;
        StoredPaymentInformation? storedPayment = await StoredPaymentInformation.Read(
            dataMutator,
            paymentConfiguration.PaymentDataType
        );
        if (storedPayment is null)
        {
            return false;
        }

        PaymentInformation paymentInformation = storedPayment.PaymentInformation;
        if (paymentInformation.Status == PaymentStatus.Paid)
        {
            _logger.LogInformation(
                "Payment for instance {InstanceId} is already paid. The payment task cannot be abandoned.",
                instance.Id
            );
            return true;
        }

        if (paymentInformation.Status.IsClosed())
        {
            return false;
        }

        PaymentStatus reported = await TerminateOrRefreshStatus(
            GetPaymentProcessor(paymentInformation),
            instance,
            paymentInformation,
            GetPaymentDetails(paymentInformation),
            dataMutator.Language,
            cancellationToken
        );

        if (reported.HasGoneThrough())
        {
            storedPayment.UpdateIfChanged(dataMutator);
            return true;
        }

        if (reported.IsClosed())
        {
            storedPayment.UpdateIfChanged(dataMutator);
            return false;
        }

        throw new PaymentException(
            $"Unable to cancel existing {paymentInformation.OrderDetails.PaymentProcessorId} payment with ID: {paymentInformation.PaymentDetails?.PaymentId}."
        );
    }

    private IPaymentProcessor GetPaymentProcessor(PaymentInformation paymentInformation) =>
        GetPaymentProcessor(paymentInformation.OrderDetails.PaymentProcessorId);

    private IPaymentProcessor GetPaymentProcessor(string paymentProcessorId) =>
        _appImplementationFactory
            .GetAll<IPaymentProcessor>()
            .FirstOrDefault(pp => pp.PaymentProcessorId == paymentProcessorId)
        ?? throw new PaymentException($"Payment processor with ID '{paymentProcessorId}' not found.");

    private static PaymentDetails GetPaymentDetails(PaymentInformation paymentInformation) =>
        paymentInformation.PaymentDetails
        ?? throw new PaymentException("Payment details unexpectedly missing from payment information.");

    private static string GetTaskId(IInstanceDataAccessor dataAccessor) =>
        dataAccessor.TaskId
        ?? dataAccessor.Instance.Process?.CurrentTask?.ElementId
        ?? throw new InvalidOperationException("A payment attempt requires a current task id.");

    /// <summary>
    /// Asks the payment processor to terminate a payment, and sets the status of <paramref name="paymentInformation"/>
    /// to <see cref="PaymentStatus.Cancelled"/> when it does. A processor refuses to terminate a payment whose checkout
    /// has completed, or that is already terminated, so on a refusal the status and payment details are set to what
    /// the processor reports.
    /// </summary>
    /// <returns>The status the payment has at the processor now.</returns>
    private async Task<PaymentStatus> TerminateOrRefreshStatus(
        IPaymentProcessor paymentProcessor,
        Instance instance,
        PaymentInformation paymentInformation,
        PaymentDetails paymentDetails,
        string? language,
        CancellationToken cancellationToken
    )
    {
        if (await paymentProcessor.TerminatePayment(instance, paymentInformation, cancellationToken))
        {
            _logger.LogDebug(
                "Payment {PaymentId} cancelled for instance {InstanceId}.",
                paymentDetails.PaymentId,
                instance.Id
            );
            paymentInformation.Status = PaymentStatus.Cancelled;
            return PaymentStatus.Cancelled;
        }

        (PaymentStatus paymentStatus, PaymentDetails updatedPaymentDetails) = await paymentProcessor.GetPaymentStatus(
            instance,
            paymentDetails.PaymentId,
            paymentInformation.OrderDetails.TotalPriceIncVat,
            language,
            cancellationToken
        );

        _logger.LogInformation(
            "{PaymentProcessorId} refused to cancel payment {PaymentId} for instance {InstanceId}, and reports its status as {Status}.",
            paymentProcessor.PaymentProcessorId,
            paymentDetails.PaymentId,
            instance.Id,
            paymentStatus.ToString()
        );

        paymentInformation.Status = paymentStatus;
        paymentInformation.PaymentDetails = updatedPaymentDetails;
        return paymentStatus;
    }
}
