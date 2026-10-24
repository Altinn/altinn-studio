using Altinn.App.Core.Features.Payment.Exceptions;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Processors;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Features.Payment.Services;

/// <summary>
/// Service that wraps most payment related features
/// </summary>
internal class PaymentService : IPaymentService
{
    // Nexi wants its webhook answered within 10 seconds, and calls again minutes later otherwise. Every wait in one
    // webhook call ends this long after the call reaches this service, and nothing starts over after that. The rest of
    // the 10 seconds is for the instance read before this service and the one after the last wait, a call to Nets or
    // Storage still under way at the deadline, and the network between Nexi and the app. A transition usually starts
    // well within a second.
    private static readonly TimeSpan _webhookTimeBudget = TimeSpan.FromSeconds(8);

    private readonly IDataService _dataService;
    private readonly ILogger<PaymentService> _logger;
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly AppIdentifier _app;
    private readonly IInstanceClientWithStorageMetadata _instanceClient;
    private readonly InstanceDataUnitOfWorkInitializer _instanceDataUnitOfWorkInitializer;
    private readonly IProcessEngine _processEngine;
    private readonly Telemetry? _telemetry;
    private readonly TimeProvider _timeProvider;

    /// <summary>
    /// Initializes a new instance of the <see cref="PaymentService"/> class.
    /// </summary>
    public PaymentService(
        IDataService dataService,
        ILogger<PaymentService> logger,
        AppImplementationFactory appImplementationFactory,
        AppIdentifier app,
        IInstanceClientWithStorageMetadata instanceClient,
        InstanceDataUnitOfWorkInitializer instanceDataUnitOfWorkInitializer,
        IProcessEngine processEngine,
        Telemetry? telemetry = null,
        TimeProvider? timeProvider = null
    )
    {
        _dataService = dataService;
        _logger = logger;
        _appImplementationFactory = appImplementationFactory;
        _app = app;
        _instanceClient = instanceClient;
        _instanceDataUnitOfWorkInitializer = instanceDataUnitOfWorkInitializer;
        _processEngine = processEngine;
        _telemetry = telemetry;
        _timeProvider = timeProvider ?? TimeProvider.System;
    }

    /// <inheritdoc/>
    public async Task<(PaymentInformation paymentInformation, bool alreadyPaid)> StartPayment(
        Instance instance,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        string? language,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = _telemetry?.StartPaymentServiceActivity();
        try
        {
            _logger.LogInformation("Starting payment for instance {InstanceId}.", instance.Id);

            IOrderDetailsCalculator orderDetailsCalculator = GetOrderDetailsCalculator();
            string dataTypeId = paymentConfiguration.PaymentDataType;
            string taskId = instance.Process.CurrentTask.ElementId;

            // Read on the instance as the caller read it, so that what the processor reports about an existing payment
            // is only stored over that same record.
            InstanceDataUnitOfWork dataMutator = await _instanceDataUnitOfWorkInitializer.Init(
                instance,
                StorageVersionMetadata.Empty,
                taskId,
                language
            );
            StoredPaymentInformation? existingPayment = await StoredPaymentInformation.Read(dataMutator, dataTypeId);

            if (
                existingPayment is not null
                && await ReplaceExistingPayment(instance, dataMutator, existingPayment, language, cancellationToken)
            )
            {
                return (existingPayment.PaymentInformation, true);
            }

            OrderDetails orderDetails;
            using (var orderDetailsActivity = _telemetry?.StartCalculateOrderDetailsActivity(orderDetailsCalculator))
            {
                try
                {
                    orderDetails = await orderDetailsCalculator.CalculateOrderDetails(
                        instance,
                        language,
                        cancellationToken
                    );
                }
                catch (Exception ex)
                {
                    orderDetailsActivity?.Errored(ex);
                    throw;
                }
            }
            var paymentProcessors = _appImplementationFactory.GetAll<IPaymentProcessor>();
            IPaymentProcessor paymentProcessor =
                paymentProcessors.FirstOrDefault(p => p.PaymentProcessorId == orderDetails.PaymentProcessorId)
                ?? throw new PaymentException(
                    $"Payment processor with ID '{orderDetails.PaymentProcessorId}' not found for instance {instance.Id}."
                );

            //If the sum of the order is 0, we can skip invoking the payment processor.
            PaymentDetails? startedPayment =
                orderDetails.TotalPriceIncVat > 0
                    ? await paymentProcessor.StartPayment(instance, orderDetails, language, cancellationToken)
                    : null;

            _logger.LogInformation(
                startedPayment != null
                    ? "Payment started successfully using {PaymentProcessorId} for instance {InstanceId}."
                    : "Skipping starting payment using {PaymentProcessorId} since order sum is zero for instance {InstanceId}.",
                paymentProcessor.PaymentProcessorId,
                instance.Id
            );

            PaymentInformation paymentInformation = new()
            {
                TaskId = taskId,
                Status = startedPayment != null ? PaymentStatus.Created : PaymentStatus.Skipped,
                OrderDetails = orderDetails,
                PaymentDetails = startedPayment,
                Language = language,
            };

            // The payment now exists at the processor, so storing its reference must not be cut short by the
            // request ending: without the stored payment ID nothing could ever terminate or verify it.
            await _dataService.InsertJsonObject(
                new InstanceIdentifier(instance),
                dataTypeId,
                paymentInformation,
                cancellationToken: CancellationToken.None
            );
            return (paymentInformation, false);
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<PaymentInformation> CheckAndStorePaymentStatus(
        InstanceWithStorageMetadata fetchedInstance,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        string? language,
        CancellationToken cancellationToken = default
    )
    {
        Instance instance = fetchedInstance.Instance;
        string taskId =
            instance.Process?.CurrentTask?.ElementId ?? throw new PaymentException("Instance has no current task.");
        _logger.LogInformation("Checking payment status for instance {InstanceId}.", instance.Id);
        IOrderDetailsCalculator orderDetailsCalculator = GetOrderDetailsCalculator();

        try
        {
            InstanceDataUnitOfWork dataMutator = await _instanceDataUnitOfWorkInitializer.Init(
                instance,
                fetchedInstance.Metadata,
                taskId,
                language
            );
            StoredPaymentInformation? storedPayment = await StoredPaymentInformation.Read(
                dataMutator,
                paymentConfiguration.PaymentDataType
            );
            if (storedPayment is null)
            {
                return await CreateUninitializedPaymentInformation(
                    orderDetailsCalculator,
                    instance,
                    taskId,
                    language,
                    cancellationToken
                );
            }

            PaymentInformation paymentInformation = storedPayment.PaymentInformation;
            if (await RefreshStatusUnlessSkipped(instance, paymentInformation, language, cancellationToken))
            {
                // The form asks again and again while a payment is being processed, so most calls change nothing and
                // save nothing. The save fails if the record or the process changed since the instance was read.
                if (storedPayment.UpdateIfChanged(dataMutator))
                {
                    await dataMutator.SaveChanges(dataMutator.GetDataElementChanges(initializeAltinnRowId: false));
                }
            }

            return paymentInformation;
        }
        catch (Exception exception) when (IsInstanceChangedConflict(exception))
        {
            // Something else, such as the payment processor's webhook, stored the payment or moved the process on after
            // this request read the instance. What is stored now is newer than this request's answer from the processor.
            _logger.LogInformation(
                exception,
                "The instance {InstanceId} changed while checking the payment status. Returning the stored status.",
                instance.Id
            );
            InstanceWithStorageMetadata currentInstance = await _instanceClient.GetInstanceWithStorageMetadata(
                instance,
                authenticationMethod: null,
                cancellationToken
            );
            (Guid _, PaymentInformation? storedPaymentInformation) = await _dataService.GetByType<PaymentInformation>(
                currentInstance.Instance,
                paymentConfiguration.PaymentDataType,
                cancellationToken: cancellationToken
            );
            return storedPaymentInformation
                ?? await CreateUninitializedPaymentInformation(
                    orderDetailsCalculator,
                    currentInstance.Instance,
                    taskId,
                    language,
                    cancellationToken
                );
        }
    }

    /// <inheritdoc/>
    public async Task<PaymentInformation> CheckPaymentStatus(
        Instance instance,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        string taskId,
        string? language,
        CancellationToken cancellationToken = default
    )
    {
        _logger.LogInformation("Checking payment status for instance {InstanceId}.", instance.Id);
        IOrderDetailsCalculator orderDetailsCalculator = GetOrderDetailsCalculator();

        (Guid _, PaymentInformation? paymentInformation) = await _dataService.GetByType<PaymentInformation>(
            instance,
            paymentConfiguration.PaymentDataType,
            cancellationToken: cancellationToken
        );
        if (paymentInformation is null)
        {
            return await CreateUninitializedPaymentInformation(
                orderDetailsCalculator,
                instance,
                taskId,
                language,
                cancellationToken
            );
        }

        await RefreshStatusUnlessSkipped(instance, paymentInformation, language, cancellationToken);
        return paymentInformation;
    }

    private IOrderDetailsCalculator GetOrderDetailsCalculator() =>
        _appImplementationFactory.Get<IOrderDetailsCalculator>()
        ?? throw new PaymentException(
            "You must add an implementation of the IOrderDetailsCalculator interface to the DI container. See payment related documentation."
        );

    private async Task<PaymentInformation> CreateUninitializedPaymentInformation(
        IOrderDetailsCalculator orderDetailsCalculator,
        Instance instance,
        string taskId,
        string? language,
        CancellationToken cancellationToken
    )
    {
        _logger.LogInformation(
            "No payment information stored yet for instance {InstanceId}. Returning uninitialized result.",
            instance.Id
        );

        return new PaymentInformation
        {
            TaskId = taskId,
            Status = PaymentStatus.Uninitialized,
            OrderDetails = await orderDetailsCalculator.CalculateOrderDetails(instance, language, cancellationToken),
        };
    }

    /// <summary>
    /// Asks the payment processor for the status of the payment, and sets the status and payment details of
    /// <paramref name="paymentInformation"/> to what it reports, unless the payment was skipped.
    /// </summary>
    /// <returns>False when the payment was skipped, so the payment processor was not asked.</returns>
    private async Task<bool> RefreshStatusUnlessSkipped(
        Instance instance,
        PaymentInformation paymentInformation,
        string? language,
        CancellationToken cancellationToken
    )
    {
        if (paymentInformation.Status == PaymentStatus.Skipped)
        {
            _logger.LogInformation(
                "Payment status is '{Skipped}' for instance {InstanceId}. Won't ask payment processor for status.",
                PaymentStatus.Skipped.ToString(),
                instance.Id
            );
            return false;
        }

        IPaymentProcessor paymentProcessor = GetPaymentProcessor(paymentInformation);
        PaymentDetails paymentDetails = GetPaymentDetails(paymentInformation);
        (PaymentStatus paymentStatus, PaymentDetails updatedPaymentDetails) = await paymentProcessor.GetPaymentStatus(
            instance,
            paymentDetails.PaymentId,
            paymentInformation.OrderDetails.TotalPriceIncVat,
            language,
            cancellationToken
        );

        paymentInformation.Status = paymentStatus;
        paymentInformation.PaymentDetails = updatedPaymentDetails;

        _logger.LogInformation(
            "Updated payment status is {Status} for instance {InstanceId}.",
            paymentInformation.Status.ToString(),
            instance.Id
        );
        return true;
    }

    /// <inheritdoc/>
    public async Task<string> HandlePaymentCompletedWebhook(
        InstanceWithStorageMetadata fetchedInstance,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        CancellationToken cancellationToken = default
    )
    {
        DateTimeOffset deadline = _timeProvider.GetUtcNow() + _webhookTimeBudget;
        try
        {
            return await SettlePaymentAndMoveOn(fetchedInstance, paymentConfiguration, deadline, cancellationToken);
        }
        catch (Exception exception) when (IsInstanceChangedConflict(exception) && HasTimeLeft(deadline))
        {
            // Something else, such as the processor's other webhook, changed the instance first. The status comes
            // from the payment processor every time, so starting over from a fresh read is safe. Without time left,
            // the conflict is the answer, and the processor calls again.
            _logger.LogInformation(
                exception,
                "The instance {InstanceId} changed while storing the payment status. Starting over.",
                fetchedInstance.Instance.Id
            );
        }

        InstanceWithStorageMetadata refetchedInstance = await _instanceClient.GetInstanceWithStorageMetadata(
            fetchedInstance.Instance,
            StorageAuthenticationMethod.ServiceOwner(),
            cancellationToken
        );
        return await SettlePaymentAndMoveOn(refetchedInstance, paymentConfiguration, deadline, cancellationToken);
    }

    /// <summary>
    /// Stores the status the payment processor reports, on condition that nothing has changed since
    /// <paramref name="fetchedInstance"/> was read, and moves the process on when the payment is paid, waiting for the
    /// transition to start until <paramref name="deadline"/> at the latest.
    /// </summary>
    private async Task<string> SettlePaymentAndMoveOn(
        InstanceWithStorageMetadata fetchedInstance,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        DateTimeOffset deadline,
        CancellationToken cancellationToken
    )
    {
        Instance instance = fetchedInstance.Instance;
        _logger.LogInformation("Checking payment status for instance {InstanceId}.", instance.Id);

        InstanceDataUnitOfWork dataMutator = await _instanceDataUnitOfWorkInitializer.Init(
            instance,
            fetchedInstance.Metadata,
            instance.Process?.CurrentTask?.ElementId,
            language: null,
            StorageAuthenticationMethod.ServiceOwner()
        );
        StoredPaymentInformation? storedPayment = await StoredPaymentInformation.Read(
            dataMutator,
            paymentConfiguration.PaymentDataType
        );

        if (storedPayment is null)
        {
            _logger.LogWarning(
                "No payment information stored yet for instance {InstanceId}. Returning uninitialized result.",
                instance.Id
            );

            return $"No payment information stored yet for instance {instance.Id}. Returning uninitialized result.";
        }

        PaymentInformation paymentInformation = storedPayment.PaymentInformation;
        if (!IsOnPaymentTask(fetchedInstance, paymentInformation))
        {
            // The task is over, and so is its payment: confirm needs it paid, and reject cancels it.
            return $"The process of instance {instance.Id} has moved on from payment task {paymentInformation.TaskId}.";
        }

        // In the language the user paid in, as when the user asks, so that the redirect URL stays the same.
        if (
            !await RefreshStatusUnlessSkipped(
                instance,
                paymentInformation,
                paymentInformation.Language,
                cancellationToken
            )
        )
        {
            return $"Payment status is 'Skipped' for instance {instance.Id}. Won't ask payment processor for status.";
        }

        // The save fails if the record or the process changed since the instance was read, or while a transition
        // holds the instance, so an older answer from the processor can never replace a newer one.
        InstanceWithStorageMetadata currentInstance = fetchedInstance;
        if (storedPayment.UpdateIfChanged(dataMutator))
        {
            currentInstance = await dataMutator.SaveChangesAndRefetch(
                dataMutator.GetDataElementChanges(initializeAltinnRowId: false),
                StorageAuthenticationMethod.ServiceOwner(),
                cancellationToken
            );
        }

        if (paymentInformation.Status != PaymentStatus.Paid || !IsOnPaymentTask(currentInstance, paymentInformation))
        {
            return $"Payment status is {paymentInformation.Status} for instance {instance.Id}.";
        }

        return await MoveOnFromPaidPayment(
            currentInstance,
            paymentInformation,
            paymentConfiguration,
            deadline,
            cancellationToken
        );
    }

    /// <summary>
    /// Confirms the payment task for the service owner, as the user who paid would, and returns once the transition
    /// has started. Starts it once more if a change to the instance stopped it from starting and
    /// <paramref name="deadline"/> has not passed.
    /// </summary>
    private async Task<string> MoveOnFromPaidPayment(
        InstanceWithStorageMetadata currentInstance,
        PaymentInformation paymentInformation,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        DateTimeOffset deadline,
        CancellationToken cancellationToken
    )
    {
        string instanceId = currentInstance.Instance.Id;
        var actor = new Actor { OrgId = _app.Org, Language = paymentInformation.Language ?? LanguageConst.Nb };

        ProcessChangeResult result = await _processEngine.EnqueueNextForApp(
            currentInstance.Instance,
            currentInstance.Metadata,
            "confirm",
            actor,
            deadline,
            cancellationToken
        );

        if (result is { ProcessNextState: ProcessNextState.InstanceChanged, MutatedInstance: { } changedInstance })
        {
            // Something wrote to the instance after it was read, such as the user's form, so the transition did not
            // start, and the instance is still idle on the payment task. Start over once from where it is now.
            (Guid _, PaymentInformation? storedPaymentInformation) = await _dataService.GetByType<PaymentInformation>(
                changedInstance,
                paymentConfiguration.PaymentDataType,
                StorageAuthenticationMethod.ServiceOwner(),
                cancellationToken
            );
            if (storedPaymentInformation?.Status != PaymentStatus.Paid)
            {
                return $"Payment status is {storedPaymentInformation?.Status.ToString() ?? "missing"} for instance {instanceId}.";
            }

            if (!HasTimeLeft(deadline))
            {
                throw new PaymentException(
                    $"The instance {instanceId} changed before the process could move on from the paid payment, and there is no time left to start over."
                );
            }

            _logger.LogInformation(
                "The instance {InstanceId} changed before the process could move on from the paid payment. Starting over.",
                instanceId
            );
            result = await _processEngine.EnqueueNextForApp(
                changedInstance,
                result.MutatedInstanceVersions,
                "confirm",
                actor,
                deadline,
                cancellationToken
            );
            if (result.ProcessNextState is ProcessNextState.InstanceChanged)
            {
                throw new PaymentException(
                    $"The instance {instanceId} changed twice before the process could move on from the paid payment."
                );
            }
        }

        if (result.Success)
        {
            _logger.LogInformation(
                "Payment for instance {InstanceId} is paid. The process moves on from the payment task.",
                instanceId
            );
            return $"Payment status is Paid for instance {instanceId}. The process moves on.";
        }

        if (result.BlockingProcessStatus is not null)
        {
            _logger.LogInformation(
                "Payment for instance {InstanceId} is paid, and a transition is already moving the process.",
                instanceId
            );
            return $"Payment status is Paid for instance {instanceId}. A transition is already moving the process.";
        }

        if (result.ProcessNextState is ProcessNextState.ConcurrentTransition)
        {
            // Another call, such as the user's confirm, started a transition from the same version of the instance.
            // Whether that one moves the process on is not known, so ask the processor to call again: by then the task
            // is over, or the webhook moves it on.
            _logger.LogInformation(
                "Payment for instance {InstanceId} is paid, but another call started a transition from the same version of the instance. Asking the payment processor to call again.",
                instanceId
            );
            throw new PaymentException(
                $"Payment for instance {instanceId} is paid, but another call started a transition from the same version of the instance."
            );
        }

        if (result.ValidationIssues is { Count: > 0 })
        {
            // Trying again cannot help: the user sees the issues when they try to move on themselves.
            _logger.LogWarning(
                "Payment for instance {InstanceId} is paid, but validation stopped the process from moving on: {ErrorMessage}",
                instanceId,
                result.ErrorMessage
            );
            return $"Payment status is Paid for instance {instanceId}, but validation stopped the process.";
        }

        throw new PaymentException(
            $"Failed to move the process of instance {instanceId} on after the payment completed: {result.ErrorTitle} {result.ErrorMessage}"
        );
    }

    /// <summary>
    /// Whether the instance is on the task <paramref name="paymentInformation"/> is for, rather than on another payment
    /// task or past the task.
    /// </summary>
    private static bool IsOnPaymentTask(InstanceWithStorageMetadata instance, PaymentInformation paymentInformation) =>
        instance.Instance.Process?.CurrentTask?.ElementId == paymentInformation.TaskId;

    /// <summary>
    /// Whether Storage refused a read or a save because the instance changed after it was read, or because a transition
    /// holds it.
    /// </summary>
    private static bool IsInstanceChangedConflict(Exception exception) =>
        exception is InstanceStateConflictException or StorageProcessStatusConflictException;

    /// <summary>
    /// Whether a webhook call can still start something over before <paramref name="deadline"/>.
    /// </summary>
    private bool HasTimeLeft(DateTimeOffset deadline) => _timeProvider.GetUtcNow() < deadline;

    /// <inheritdoc/>
    public async Task<PaymentStatus> GetPaymentStatus(
        Instance instance,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        CancellationToken cancellationToken = default
    )
    {
        string dataTypeId = paymentConfiguration.PaymentDataType;
        (Guid _, PaymentInformation? paymentInformation) = await _dataService.GetByType<PaymentInformation>(
            instance,
            dataTypeId,
            cancellationToken: cancellationToken
        );

        if (paymentInformation == null)
        {
            throw new PaymentException("Payment information not found.");
        }

        return paymentInformation.Status;
    }

    /// <inheritdoc/>
    public async Task<PaymentAbandonOutcome> PrepareAbandon(
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
            return PaymentAbandonOutcome.CanAbandon;
        }

        PaymentInformation paymentInformation = storedPayment.PaymentInformation;
        if (paymentInformation.Status == PaymentStatus.Paid)
        {
            _logger.LogInformation(
                "Payment for instance {InstanceId} is already paid. The payment task cannot be abandoned.",
                instance.Id
            );
            return PaymentAbandonOutcome.AlreadyPaid;
        }

        if (paymentInformation.Status.IsClosed())
        {
            return PaymentAbandonOutcome.CanAbandon;
        }

        // A configuration error is not the processor failing, so only the calls to the processor are caught.
        IPaymentProcessor paymentProcessor = GetPaymentProcessor(paymentInformation);
        PaymentDetails paymentDetails = GetPaymentDetails(paymentInformation);
        try
        {
            await TerminateOrRefreshStatus(
                paymentProcessor,
                instance,
                paymentInformation,
                paymentDetails,
                dataMutator.Language,
                cancellationToken
            );
        }
        catch (Exception ex) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogError(
                ex,
                "Unable to settle payment {PaymentId} for instance {InstanceId} with {PaymentProcessorId} before abandoning the payment task.",
                paymentInformation.PaymentDetails?.PaymentId,
                instance.Id,
                paymentInformation.OrderDetails.PaymentProcessorId
            );
            return PaymentAbandonOutcome.PaymentProcessorFailed;
        }

        if (paymentInformation.Status.HasGoneThrough())
        {
            storedPayment.UpdateIfChanged(dataMutator);
            return PaymentAbandonOutcome.AlreadyPaid;
        }

        if (paymentInformation.Status.IsClosed())
        {
            storedPayment.UpdateIfChanged(dataMutator);
            return PaymentAbandonOutcome.CanAbandon;
        }

        return PaymentAbandonOutcome.NotTerminated;
    }

    private IPaymentProcessor GetPaymentProcessor(PaymentInformation paymentInformation)
    {
        string paymentProcessorId = paymentInformation.OrderDetails.PaymentProcessorId;
        return _appImplementationFactory
                .GetAll<IPaymentProcessor>()
                .FirstOrDefault(pp => pp.PaymentProcessorId == paymentProcessorId)
            ?? throw new PaymentException($"Payment processor with ID '{paymentProcessorId}' not found.");
    }

    private static PaymentDetails GetPaymentDetails(PaymentInformation paymentInformation) =>
        paymentInformation.PaymentDetails
        ?? throw new PaymentException("Payment details unexpectedly missing from payment information.");

    /// <summary>
    /// Makes way for a new payment by removing the existing payment record, after terminating the payment if it could
    /// still complete.
    /// </summary>
    /// <returns>True when the existing payment has gone through.</returns>
    private async Task<bool> ReplaceExistingPayment(
        Instance instance,
        InstanceDataUnitOfWork dataMutator,
        StoredPaymentInformation existingPayment,
        string? language,
        CancellationToken cancellationToken
    )
    {
        PaymentInformation paymentInformation = existingPayment.PaymentInformation;
        string paymentId = paymentInformation.PaymentDetails?.PaymentId ?? "missing";
        if (paymentInformation.Status == PaymentStatus.Paid)
        {
            _logger.LogWarning(
                "Payment with payment id {PaymentId} already paid for instance {InstanceId}. Cannot start new payment.",
                paymentId,
                instance.Id
            );

            return true;
        }

        if (!paymentInformation.Status.IsClosed())
        {
            _logger.LogWarning(
                "Payment with payment id {PaymentId} already started for instance {InstanceId}. Trying to cancel before creating new payment.",
                paymentId,
                instance.Id
            );

            await TerminateOrRefreshStatus(
                GetPaymentProcessor(paymentInformation),
                instance,
                paymentInformation,
                GetPaymentDetails(paymentInformation),
                language,
                cancellationToken
            );

            if (paymentInformation.Status.HasGoneThrough())
            {
                _logger.LogWarning(
                    "Payment with payment id {PaymentId} has gone through for instance {InstanceId}. Cannot start new payment.",
                    paymentId,
                    instance.Id
                );

                // The save is not cut short by the request ending. It fails if the record changed since the instance
                // was read, such as when the processor's webhook stored a newer status, which then stays.
                if (existingPayment.UpdateIfChanged(dataMutator))
                {
                    try
                    {
                        await dataMutator.SaveChanges(dataMutator.GetDataElementChanges(initializeAltinnRowId: false));
                    }
                    catch (Exception exception) when (IsInstanceChangedConflict(exception))
                    {
                        _logger.LogInformation(
                            exception,
                            "The payment record of instance {InstanceId} changed after it was read. Keeping the newer record.",
                            instance.Id
                        );
                    }
                }
                return true;
            }

            if (!paymentInformation.Status.IsClosed())
            {
                throw new PaymentException(
                    $"Unable to cancel existing {paymentInformation.OrderDetails.PaymentProcessorId} payment with ID: {paymentId}."
                );
            }
        }

        // A payment that can no longer complete leaves a stale record, which must go regardless of the request's fate:
        // left behind, the next attempt would find it again.
        await _dataService.DeleteById(
            new InstanceIdentifier(instance),
            Guid.Parse(existingPayment.DataElement.Id),
            cancellationToken: CancellationToken.None
        );
        _logger.LogDebug("Payment information deleted for instance {InstanceId}.", instance.Id);
        return false;
    }

    /// <summary>
    /// Asks the payment processor to terminate a payment, and sets the status of <paramref name="paymentInformation"/>
    /// to <see cref="PaymentStatus.Cancelled"/> when it does. A processor refuses to terminate a payment whose checkout
    /// has completed, or that is already terminated, so on a refusal the status and payment details are set to what
    /// the processor reports.
    /// </summary>
    private async Task TerminateOrRefreshStatus(
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
            return;
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
    }
}
