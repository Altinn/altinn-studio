using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.Payment.Exceptions;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Processors;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Payment.Services;

/// <summary>
/// Service that wraps most payment related features
/// </summary>
internal class PaymentService : IPaymentService
{
    private readonly IDataService _dataService;
    private readonly ILogger<PaymentService> _logger;
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly GeneralSettings _generalSettings;
    private readonly AppIdentifier _app;
    private readonly IAuthenticationTokenResolver _authenticationTokenResolver;
    private readonly Telemetry? _telemtry;

    /// <summary>
    /// Initializes a new instance of the <see cref="PaymentService"/> class.
    /// </summary>
    public PaymentService(
        IDataService dataService,
        ILogger<PaymentService> logger,
        AppImplementationFactory appImplementationFactory,
        IHttpClientFactory httpClientFactory,
        IOptions<GeneralSettings> generalSettings,
        AppIdentifier app,
        IAuthenticationTokenResolver authenticationTokenResolver,
        Telemetry? telemtry = null
    )
    {
        _dataService = dataService;
        _logger = logger;
        _appImplementationFactory = appImplementationFactory;
        _httpClientFactory = httpClientFactory;
        _generalSettings = generalSettings.Value;
        _app = app;
        _authenticationTokenResolver = authenticationTokenResolver;
        _telemtry = telemtry;
    }

    /// <inheritdoc/>
    public async Task<(PaymentInformation paymentInformation, bool alreadyPaid)> StartPayment(
        Instance instance,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        string? language
    )
    {
        using var activity = _telemtry?.StartPaymentServiceActivity();
        try
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

            OrderDetails orderDetails;
            using (var orderDetailsActivity = _telemtry?.StartCalculateOrderDetailsActivity(orderDetailsCalculator))
            {
                try
                {
                    orderDetails = await orderDetailsCalculator.CalculateOrderDetails(instance, language);
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
        catch (Exception ex)
        {
            activity?.Errored(ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public Task<PaymentInformation> CheckAndStorePaymentStatus(
        Instance instance,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        string? language
    )
    {
        string taskId =
            instance.Process?.CurrentTask?.ElementId ?? throw new PaymentException("Instance has no current task.");
        return CheckPaymentStatusInternal(instance, paymentConfiguration, taskId, language, persistUpdates: true);
    }

    /// <inheritdoc/>
    public Task<PaymentInformation> CheckPaymentStatus(
        Instance instance,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        string taskId,
        string? language
    )
    {
        return CheckPaymentStatusInternal(instance, paymentConfiguration, taskId, language, persistUpdates: false);
    }

    private async Task<PaymentInformation> CheckPaymentStatusInternal(
        Instance instance,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        string taskId,
        string? language,
        bool persistUpdates
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
                TaskId = taskId,
                Status = PaymentStatus.Uninitialized,
                OrderDetails = await orderDetailsCalculator.CalculateOrderDetails(instance, language),
            };
        }

        if (paymentInformation.Status == PaymentStatus.Skipped)
        {
            _logger.LogInformation(
                "Payment status is '{Skipped}' for instance {InstanceId}. Won't ask payment processor for status.",
                PaymentStatus.Skipped.ToString(),
                instance.Id
            );

            return paymentInformation;
        }

        decimal totalPriceIncVat = paymentInformation.OrderDetails.TotalPriceIncVat;
        string paymentProcessorId = paymentInformation.OrderDetails.PaymentProcessorId;

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

        if (persistUpdates)
        {
            await _dataService.UpdateJsonObject(
                new InstanceIdentifier(instance),
                dataTypeId,
                dataElementId,
                paymentInformation
            );
        }

        return paymentInformation;
    }

    /// <inheritdoc/>
    public async Task<string> HandlePaymentCompletedWebhook(
        Instance instance,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        StorageAuthenticationMethod storageAuthenticationMethod
    )
    {
        _logger.LogInformation("Checking payment status for instance {InstanceId}.", instance.Id);

        string dataTypeId = paymentConfiguration.PaymentDataType;
        (Guid dataElementId, PaymentInformation? paymentInformation) = await _dataService.GetByType<PaymentInformation>(
            instance,
            dataTypeId,
            storageAuthenticationMethod
        );

        if (paymentInformation == null)
        {
            _logger.LogWarning(
                "No payment information stored yet for instance {InstanceId}. Returning uninitialized result.",
                instance.Id
            );

            return $"No payment information stored yet for instance {instance.Id}. Returning uninitialized result.";
        }

        decimal totalPriceIncVat = paymentInformation.OrderDetails.TotalPriceIncVat;
        string paymentProcessorId = paymentInformation.OrderDetails.PaymentProcessorId;

        if (paymentInformation.Status == PaymentStatus.Skipped)
        {
            _logger.LogWarning(
                "Payment status is 'Skipped' for instance {InstanceId}. Won't ask payment processor for status.",
                instance.Id
            );

            return $"Payment status is 'Skipped' for instance {instance.Id}. Won't ask payment processor for status.";
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
            language: null
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
            paymentInformation,
            storageAuthenticationMethod
        );

        if (
            paymentStatus == PaymentStatus.Paid
            && instance.Process.CurrentTask.AltinnTaskType == AltinnTaskTypes.Payment
        )
        {
            await RunProcessNext(instance, storageAuthenticationMethod);
        }
        return $"Payment status is {paymentStatus} for instance {instance.Id}.";
    }

    private async Task RunProcessNext(Instance instance, StorageAuthenticationMethod storageAuthenticationMethod)
    {
        JwtToken token = await _authenticationTokenResolver.GetAccessToken(storageAuthenticationMethod);
        using var client = _httpClientFactory.CreateClient();
        // Be reasonably generous with timeout since this involves process engine calls
        client.Timeout = TimeSpan.FromMinutes(5);
        client.BaseAddress = new Uri(_generalSettings.FormattedExternalAppBaseUrl(_app));
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(
            "Bearer",
            token.Value
        );

        using var content = new StringContent(
            """{"action":"confirm"}""",
            System.Text.Encoding.UTF8,
            "application/json"
        );
        var response = await client.PutAsync($"instances/{instance.Id}/process/next", content);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError(
                "Failed to advance process for instance {InstanceId} after payment completed webhook. Status code: {StatusCode}\n\n{content}",
                instance.Id,
                response.StatusCode,
                await response.Content.ReadAsStringAsync()
            );
            throw new PaymentException(
                $"Failed to advance process for instance {instance.Id} after payment completed webhook."
            );
        }
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
