using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Payment;
using Altinn.App.Core.Features.Payment.Exceptions;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Processors.Nets;
using Altinn.App.Core.Features.Payment.Processors.Nets.Models;
using Altinn.App.Core.Features.Payment.Services;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// Controller for handling payment operations.
/// </summary>
[AutoValidateAntiforgeryTokenIfAuthCookie]
[ApiController]
[Route("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/payment")]
public class PaymentController : ControllerBase
{
    private readonly IInstanceClient _instanceClient;
    private readonly IProcessReader _processReader;
    private readonly IPaymentService _paymentService;
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly ILogger<PaymentController> _logger;
    private readonly INetsWebhookSecretProvider? _netsWebhookSecretProvider;

    /// <summary>
    /// Initializes a new instance of the <see cref="PaymentController"/> class.
    /// </summary>
    public PaymentController(
        IInstanceClient instanceClient,
        IProcessReader processReader,
        ILogger<PaymentController> logger,
        IServiceProvider serviceProvider
    )
    {
        _instanceClient = instanceClient;
        _processReader = processReader;
        _logger = logger;
        _netsWebhookSecretProvider = serviceProvider.GetService<INetsWebhookSecretProvider>();
        _paymentService = serviceProvider.GetRequiredService<IPaymentService>();
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
    }

    /// <summary>
    /// Get updated payment information for the instance. Will contact the payment processor to check the status of the payment. Current task must be a payment task, or a payment task ID must be supplied via the <c>taskId</c> query parameter. See payment related documentation.
    /// </summary>
    /// <param name="org">unique identifier of the organisation responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organisation</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that this the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <param name="language">The currently used language by the user (or null if not available)</param>
    /// <param name="taskId">If payment information should be loaded for a different task than the current one. Useful for retrieving payment information for a completed payment task. Updates from the processor are not persisted when this is set.</param>
    /// <returns>An object containing updated payment information</returns>
    [HttpGet]
    [ProducesResponseType(typeof(PaymentInformation), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetPaymentInformation(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromQuery] string? language = null,
        [FromQuery] string? taskId = null
    )
    {
        Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);

        string? finalTaskId = taskId ?? instance.Process?.CurrentTask?.ElementId;
        AltinnPaymentConfiguration? paymentConfiguration = finalTaskId is null
            ? null
            : _processReader.GetAltinnTaskExtension(finalTaskId)?.PaymentConfiguration;

        if (finalTaskId is null || paymentConfiguration is null)
        {
            return NotPaymentTask();
        }

        var validPaymentConfiguration = paymentConfiguration.Validate();

        // Persist updates only when the requested task is still the instance's current task.
        // After the webhook advances the process, the frontend may still poll with the (now historical) payment task id —
        // we want to return its status without overwriting payment data that no longer belongs to the current task.
        bool isCurrentTask = finalTaskId == instance.Process?.CurrentTask?.ElementId;

        PaymentInformation paymentInformation;
        if (isCurrentTask)
        {
            try
            {
                paymentInformation = await _paymentService.CheckAndStorePaymentStatus(
                    instance,
                    validPaymentConfiguration,
                    language
                );
            }
            catch (Exception ex)
            {
                // The persisting path can race with a concurrent webhook callback that advances the process past
                // finalTaskId after our GetInstance above. Re-fetch to confirm; if the task has moved, fall back to
                // a read-only result rather than surface a 5xx — the next poll will reconcile.
                if (!await CurrentTaskMovedAwayFrom(app, org, instanceOwnerPartyId, instanceGuid, finalTaskId))
                {
                    throw;
                }
                _logger.LogInformation(
                    ex,
                    "Storing payment status failed because the process advanced past task {TaskId} during the request. Returning read-only status.",
                    LogSanitizer.Sanitize(finalTaskId)
                );
                paymentInformation = await _paymentService.CheckPaymentStatus(
                    instance,
                    validPaymentConfiguration,
                    finalTaskId,
                    language
                );
            }
        }
        else
        {
            paymentInformation = await _paymentService.CheckPaymentStatus(
                instance,
                validPaymentConfiguration,
                finalTaskId,
                language
            );
        }

        return Ok(paymentInformation);
    }

    private async Task<bool> CurrentTaskMovedAwayFrom(
        string app,
        string org,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        string expectedTaskId
    )
    {
        try
        {
            Instance refreshed = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
            return refreshed.Process?.CurrentTask?.ElementId != expectedTaskId;
        }
        catch (Exception)
        {
            // Can't verify — assume the original failure was unrelated and let it surface.
            return false;
        }
    }

    private static BadRequestObjectResult NotPaymentTask()
    {
        return new BadRequestObjectResult(
            new ProblemDetails
            {
                Title = "Not a payment task",
                Detail =
                    "This endpoint is only callable while the current task is a payment task, or when the taskId query param is set to a payment task's ID.",
                Status = StatusCodes.Status400BadRequest,
            }
        );
    }

    /// <summary>
    /// Run order details calculations and return the result. Does not require the current task to be a payment task.
    /// </summary>
    /// <param name="org">unique identifier of the organisation responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organisation</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that this the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <param name="language">The currently used language by the user (or null if not available)</param>
    /// <returns>An object containing updated payment information</returns>
    [HttpGet("order-details")]
    [ProducesResponseType(typeof(OrderDetails), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetOrderDetails(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromQuery] string? language = null
    )
    {
        var orderDetailsCalculator = _appImplementationFactory.Get<IOrderDetailsCalculator>();
        if (orderDetailsCalculator == null)
        {
            throw new PaymentException(
                "You must add an implementation of the IOrderDetailsCalculator interface to the DI container. See payment related documentation."
            );
        }

        Instance instance = await _instanceClient.GetInstance(
            app,
            org,
            instanceOwnerPartyId,
            instanceGuid,
            authenticationMethod: null,
            CancellationToken.None
        );
        OrderDetails orderDetails = await orderDetailsCalculator.CalculateOrderDetails(instance, language);

        return Ok(orderDetails);
    }

    /// <summary>
    /// Endpoint to receive payment webhooks from the payment processor.
    /// </summary>
    /// <param name="org">unique identifier of the organisation responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organisation</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that this the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <param name="webhookPayload">The webhook payload from nets</param>
    /// <param name="authorizationHeader"></param>
    /// <returns>Acknowledgement of the webhook</returns>
    [HttpPost("nets-webhook-listener")]
    [ApiExplorerSettings(IgnoreApi = true)]
    [AllowAnonymous] // Authorization is handled via a shared secret in the header, not via middleware
    public async Task<IActionResult> PaymentWebhookListener(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromBody] NetsCompleteWebhookPayload webhookPayload,
        [FromHeader(Name = "Authorization")] string authorizationHeader
    )
    {
        if (_netsWebhookSecretProvider is null)
        {
            throw new PaymentException(
                "No INetsWebhookSecretProvider is registered. Ensure the Nets payment provider is correctly configured."
            );
        }

        if (!_netsWebhookSecretProvider.IsValidIncomingSecret(authorizationHeader))
        {
            _logger.LogWarning(
                "Received Nets webhook callback with invalid authorization header. Ignoring the callback."
            );
            return Unauthorized("Invalid authorization header");
        }

        _logger.LogInformation(
            "Received valid Nets webhook callback for instance {InstanceGuid} for {Payment}",
            instanceGuid,
            webhookPayload.Data.PaymentId
        );

        var instance = await _instanceClient.GetInstance(
            app,
            org,
            instanceOwnerPartyId,
            instanceGuid,
            StorageAuthenticationMethod.ServiceOwner()
        );

        if (instance.Process?.CurrentTask?.ElementId == null)
        {
            _logger.LogWarning(
                "Instance has no current task. Cannot process Nets webhook callback for instance {InstanceGuid}",
                instanceGuid
            );
            return BadRequest("Instance has no current task");
        }

        AltinnPaymentConfiguration? paymentConfiguration = _processReader
            .GetAltinnTaskExtension(instance.Process.CurrentTask.ElementId)
            ?.PaymentConfiguration;

        if (paymentConfiguration == null)
        {
            _logger.LogInformation(
                "Payment configuration not found in AltinnTaskExtension for task {CurrentTask}. Cannot process Nets webhook callback for instance {InstanceId}. Likely the callback is for an old payment.",
                instance.Process.CurrentTask?.ElementId,
                instance.Id
            );
            // If the current task is not a payment task, just log and return OK with a ProblemDetails that nets ignore, but might be logged.
            return Ok(
                new ProblemDetails()
                {
                    Detail =
                        $"Payment configuration not found in AltinnTaskExtension for task {instance.Process.CurrentTask?.ElementId}",
                }
            );
        }

        var validPaymentConfiguration = paymentConfiguration.Validate();

        // Update payment status using ServiceOwner authentication
        var responsText = await _paymentService.HandlePaymentCompletedWebhook(
            instance,
            validPaymentConfiguration,
            StorageAuthenticationMethod.ServiceOwner()
        );

        return Ok(responsText);
    }
}
