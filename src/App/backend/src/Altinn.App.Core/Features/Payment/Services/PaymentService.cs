using Altinn.App.Core.Features.Payment.Exceptions;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Processors;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Models;
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

    /// <summary>
    /// Initializes a new instance of the <see cref="PaymentService"/> class.
    /// </summary>
    public PaymentService(
        IDataService dataService,
        ILogger<PaymentService> logger,
        AppImplementationFactory appImplementationFactory
    )
    {
        _dataService = dataService;
        _logger = logger;
        _appImplementationFactory = appImplementationFactory;
    }

    /// <inheritdoc/>
    public async Task<(PaymentInformation paymentInformation, bool alreadyPaid)> StartPayment(
        Instance instance,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        string? language
    )
    {
        _logger.LogInformation("Starting payment for instance {InstanceId}.", instance.Id);

        var orderDetailsCalculator = _appImplementationFactory.Get<IOrderDetailsCalculator>();
        if (orderDetailsCalculator == null)
        {
            throw new PaymentException(
                "You must add an implementation of the IOrderDetailsCalculator interface to the DI container. See payment related documentation."
            );
        }

        string dataTypeId = paymentConfiguration.PaymentDataType;

        (Guid dataElementId, PaymentInformation? existingPaymentInformation) =
            await _dataService.GetByType<PaymentInformation>(instance, dataTypeId);

        if (existingPaymentInformation?.PaymentDetails != null)
        {
            if (existingPaymentInformation.Status == PaymentStatus.Paid)
            {
                _logger.LogWarning(
                    "Payment with payment id {PaymentId} already paid for instance {InstanceId}. Cannot start new payment.",
                    existingPaymentInformation.PaymentDetails.PaymentId,
                    instance.Id
                );

                return (existingPaymentInformation, true);
            }

            _logger.LogWarning(
                "Payment with payment id {PaymentId} already started for instance {InstanceId}. Trying to cancel before creating new payment.",
                existingPaymentInformation.PaymentDetails.PaymentId,
                instance.Id
            );

            await CancelAndDelete(instance, dataElementId, existingPaymentInformation);
        }

        OrderDetails orderDetails = await orderDetailsCalculator.CalculateOrderDetails(instance, language);
        var paymentProcessors = _appImplementationFactory.GetAll<IPaymentProcessor>();
        IPaymentProcessor paymentProcessor =
            paymentProcessors.FirstOrDefault(p => p.PaymentProcessorId == orderDetails.PaymentProcessorId)
            ?? throw new PaymentException(
                $"Payment processor with ID '{orderDetails.PaymentProcessorId}' not found for instance {instance.Id}."
            );

        //If the sum of the order is 0, we can skip invoking the payment processor.
        PaymentDetails? startedPayment =
            orderDetails.TotalPriceIncVat > 0
                ? await paymentProcessor.StartPayment(instance, orderDetails, language)
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
            TaskId = instance.Process.CurrentTask.ElementId,
            Status = startedPayment != null ? PaymentStatus.Created : PaymentStatus.Skipped,
            OrderDetails = orderDetails,
            PaymentDetails = startedPayment,
        };

        await _dataService.InsertJsonObject(new InstanceIdentifier(instance), dataTypeId, paymentInformation);
        return (paymentInformation, false);
    }

    /// <inheritdoc/>
    public async Task<PaymentInformation> CheckAndStorePaymentStatus(
        Instance instance,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        string? language
    )
    {
        _logger.LogInformation("Checking payment status for instance {InstanceId}.", instance.Id);

        var orderDetailsCalculator = _appImplementationFactory.Get<IOrderDetailsCalculator>();
        if (orderDetailsCalculator == null)
        {
            throw new PaymentException(
                "You must add an implementation of the IOrderDetailsCalculator interface to the DI container. See payment related documentation."
            );
        }

        string dataTypeId = paymentConfiguration.PaymentDataType;
        (Guid dataElementId, PaymentInformation? paymentInformation) = await _dataService.GetByType<PaymentInformation>(
            instance,
            dataTypeId
        );

        if (paymentInformation == null)
        {
            _logger.LogInformation(
                "No payment information stored yet for instance {InstanceId}. Returning uninitialized result.",
                instance.Id
            );

            return new PaymentInformation
            {
                TaskId = instance.Process.CurrentTask.ElementId,
                Status = PaymentStatus.Uninitialized,
                OrderDetails = await orderDetailsCalculator.CalculateOrderDetails(instance, language),
            };
        }

        decimal totalPriceIncVat = paymentInformation.OrderDetails.TotalPriceIncVat;
        string paymentProcessorId = paymentInformation.OrderDetails.PaymentProcessorId;

        if (paymentInformation.Status == PaymentStatus.Skipped)
        {
            _logger.LogInformation(
                "Payment status is '{Skipped}' for instance {InstanceId}. Won't ask payment processor for status.",
                PaymentStatus.Skipped.ToString(),
                instance.Id
            );

            return paymentInformation;
        }

        var paymentProcessors = _appImplementationFactory.GetAll<IPaymentProcessor>();
        IPaymentProcessor paymentProcessor =
            paymentProcessors.FirstOrDefault(p => p.PaymentProcessorId == paymentProcessorId)
            ?? throw new PaymentException($"Payment processor with ID '{paymentProcessorId}' not found.");

        PaymentDetails paymentDetails =
            paymentInformation.PaymentDetails
            ?? throw new PaymentException("Payment details unexpectedly missing from payment information.");

        (PaymentStatus paymentStatus, PaymentDetails updatedPaymentDetails) = await paymentProcessor.GetPaymentStatus(
            instance,
            paymentDetails.PaymentId,
            totalPriceIncVat,
            language
        );

        paymentInformation.Status = paymentStatus;
        paymentInformation.PaymentDetails = updatedPaymentDetails;

        _logger.LogInformation(
            "Updated payment status is {Status} for instance {InstanceId}.",
            paymentInformation.Status.ToString(),
            instance.Id
        );

        await _dataService.UpdateJsonObject(
            new InstanceIdentifier(instance),
            dataTypeId,
            dataElementId,
            paymentInformation
        );

        return paymentInformation;
    }

    /// <inheritdoc/>
    public async Task<PaymentStatus> GetPaymentStatus(
        Instance instance,
        ValidAltinnPaymentConfiguration paymentConfiguration
    )
    {
        string dataTypeId = paymentConfiguration.PaymentDataType;
        (Guid _, PaymentInformation? paymentInformation) = await _dataService.GetByType<PaymentInformation>(
            instance,
            dataTypeId
        );

        if (paymentInformation == null)
        {
            throw new PaymentException("Payment information not found.");
        }

        return paymentInformation.Status;
    }

    /// <inheritdoc/>
    public async Task CancelAndDeleteAnyExistingPayment(
        Instance instance,
        ValidAltinnPaymentConfiguration paymentConfiguration
    )
    {
        string dataTypeId = paymentConfiguration.PaymentDataType;
        (Guid dataElementId, PaymentInformation? paymentInformation) = await _dataService.GetByType<PaymentInformation>(
            instance,
            dataTypeId
        );

        if (paymentInformation == null)
            return;

        await CancelAndDelete(instance, dataElementId, paymentInformation);
    }

    private async Task CancelAndDelete(Instance instance, Guid dataElementId, PaymentInformation paymentInformation)
    {
        if (paymentInformation.Status == PaymentStatus.Paid)
        {
            _logger.LogDebug("Payment already paid for instance {InstanceId}. Aborting cancellation.", instance.Id);
            return;
        }

        if (paymentInformation.Status != PaymentStatus.Skipped)
        {
            string paymentProcessorId = paymentInformation.OrderDetails.PaymentProcessorId;
            var paymentProcessors = _appImplementationFactory.GetAll<IPaymentProcessor>();
            IPaymentProcessor paymentProcessor =
                paymentProcessors.FirstOrDefault(pp => pp.PaymentProcessorId == paymentProcessorId)
                ?? throw new PaymentException($"Payment processor with ID '{paymentProcessorId}' not found.");

            bool success = await paymentProcessor.TerminatePayment(instance, paymentInformation);
            string paymentId = paymentInformation.PaymentDetails?.PaymentId ?? "missing";

            if (!success)
            {
                throw new PaymentException(
                    $"Unable to cancel existing {paymentProcessorId} payment with ID: {paymentId}."
                );
            }

            _logger.LogDebug("Payment {PaymentId} cancelled for instance {InstanceId}.", paymentId, instance.Id);
        }

        await _dataService.DeleteById(new InstanceIdentifier(instance), dataElementId);
        _logger.LogDebug("Payment information for deleted for instance {InstanceId}.", instance.Id);
    }
}
