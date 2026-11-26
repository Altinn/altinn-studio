using System.Diagnostics;
using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Payment;
using Altinn.App.Core.Features.Payment.Exceptions;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Processors.Nets;
using Altinn.App.Core.Features.Payment.Processors.Nets.Models;
using Altinn.App.Core.Features.Payment.Services;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using IAuthorizationService = Altinn.App.Core.Internal.Auth.IAuthorizationService;

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
    private readonly PaymentAttemptRequests _attemptRequests;
    private readonly IAuthorizationService _authorizationService;
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
        _attemptRequests = serviceProvider.GetRequiredService<PaymentAttemptRequests>();
        _authorizationService = serviceProvider.GetRequiredService<IAuthorizationService>();
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
    }

    /// <summary>
    /// Get the stored payment information for the instance. Current task must be a payment task, or a payment task ID must be supplied via the <c>taskId</c> query parameter. Without stored payment information, it returns the status <c>Uninitialized</c> with the calculated order details. See payment related documentation.
    /// </summary>
    /// <param name="org">unique identifier of the organization responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organization</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that this the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <param name="language">The currently used language by the user (or null if not available)</param>
    /// <param name="taskId">If payment information should be loaded for a different task than the current one. Useful for retrieving payment information for a completed payment task.</param>
    /// <param name="cancellationToken">Cancellation token, populated by the framework</param>
    /// <returns>The stored payment information</returns>
    [HttpGet]
    [Authorize]
    [ProducesResponseType(typeof(PaymentInformation), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetPaymentInformation(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        CancellationToken cancellationToken,
        [FromQuery] string? language = null,
        [FromQuery] string? taskId = null
    )
    {
        Instance instance = await _instanceClient.GetInstance(
            app,
            org,
            instanceOwnerPartyId,
            instanceGuid,
            authenticationMethod: null,
            cancellationToken
        );

        if (GetPaymentTask(taskId ?? instance.Process?.CurrentTask?.ElementId) is not { } paymentTask)
        {
            return NotPaymentTask();
        }

        return Ok(
            await _paymentService.GetPaymentInformation(
                instance,
                paymentTask.Configuration,
                paymentTask.Id,
                language,
                cancellationToken
            )
        );
    }

    /// <summary>
    /// Cancels the payment attempt that holds the current payment task, for Back while the user is paying. Moves the
    /// process back, or on when the payment has gone through, or releases the task when the process has no way back.
    /// </summary>
    /// <param name="org">unique identifier of the organization responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organization</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that this the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <param name="language">The currently used language by the user (or null if not available)</param>
    /// <param name="cancellationToken">Cancellation token, populated by the framework</param>
    /// <returns>The payment information stored once the cancel was handled</returns>
    [HttpPost("cancel")]
    [Authorize]
    [ProducesResponseType(typeof(PaymentInformation), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status504GatewayTimeout)]
    public async Task<IActionResult> CancelPaymentAttempt(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        CancellationToken cancellationToken,
        [FromQuery] string? language = null
    )
    {
        Instance instance = await _instanceClient.GetInstance(
            app,
            org,
            instanceOwnerPartyId,
            instanceGuid,
            authenticationMethod: null,
            cancellationToken
        );
        if (GetPaymentTask(instance.Process?.CurrentTask?.ElementId) is not { } paymentTask)
        {
            return NotPaymentTask();
        }

        if (!await AuthorizeAction(instance, "reject", paymentTask.Id, cancellationToken))
        {
            return Forbid();
        }

        return ToResult(
            await _attemptRequests.Cancel(
                instance,
                paymentTask.Id,
                paymentTask.Configuration,
                language,
                cancellationToken
            )
        );
    }

    /// <summary>
    /// Checks the payment of the attempt that holds the current payment task with the payment processor, and tells
    /// the attempt when its status changed, so a payment completes without the processor's webhook. Call it each time
    /// the payment page loads while the attempt is open.
    /// </summary>
    /// <param name="org">unique identifier of the organization responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organization</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that this the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <param name="language">The currently used language by the user (or null if not available)</param>
    /// <param name="cancellationToken">Cancellation token, populated by the framework</param>
    /// <returns>The payment information stored once any change was handled</returns>
    [HttpPost("check")]
    [Authorize]
    [ProducesResponseType(typeof(PaymentInformation), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status502BadGateway)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status504GatewayTimeout)]
    public async Task<IActionResult> CheckPaymentAttempt(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        CancellationToken cancellationToken,
        [FromQuery] string? language = null
    )
    {
        Instance instance = await _instanceClient.GetInstance(
            app,
            org,
            instanceOwnerPartyId,
            instanceGuid,
            authenticationMethod: null,
            cancellationToken
        );
        if (GetPaymentTask(instance.Process?.CurrentTask?.ElementId) is not { } paymentTask)
        {
            return NotPaymentTask();
        }

        if (!await AuthorizeAction(instance, PaymentProcessTask.PayAction, paymentTask.Id, cancellationToken))
        {
            return Forbid();
        }

        return ToResult(
            await _attemptRequests.Check(
                instance,
                paymentTask.Id,
                paymentTask.Configuration,
                language,
                cancellationToken
            )
        );
    }

    /// <summary>
    /// Run order details calculations and return the result. Does not require the current task to be a payment task.
    /// </summary>
    /// <param name="org">unique identifier of the organization responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organization</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that this the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <param name="language">The currently used language by the user (or null if not available)</param>
    /// <param name="cancellationToken">Cancellation token, populated by the framework</param>
    /// <returns>An object containing updated payment information</returns>
    [HttpGet("order-details")]
    [ProducesResponseType(typeof(OrderDetails), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetOrderDetails(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        CancellationToken cancellationToken,
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
            cancellationToken
        );
        OrderDetails orderDetails = await orderDetailsCalculator.CalculateOrderDetails(
            instance,
            language,
            cancellationToken
        );

        return Ok(orderDetails);
    }

    /// <summary>
    /// Endpoint to receive payment webhooks from the payment processor. Forwards the event to the payment attempt
    /// whose mailbox the URL names, or, for a payment created without one, the mailbox its stored payment names.
    /// </summary>
    /// <param name="org">unique identifier of the organization responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organization</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that this the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <param name="mailboxId">The mailbox of the payment attempt that created the payment</param>
    /// <param name="webhookPayload">The webhook payload from nets</param>
    /// <param name="authorizationHeader"></param>
    /// <param name="cancellationToken">Cancellation token, populated by the framework</param>
    /// <returns>Acknowledgement of the webhook</returns>
    [HttpPost("nets-webhook-listener/{mailboxId:guid?}")]
    [ApiExplorerSettings(IgnoreApi = true)]
    [AllowAnonymous] // Authorization is handled via a shared secret in the header, not via middleware
    public async Task<IActionResult> PaymentWebhookListener(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromRoute] Guid? mailboxId,
        [FromBody] NetsCompleteWebhookPayload webhookPayload,
        [FromHeader(Name = "Authorization")] string authorizationHeader,
        CancellationToken cancellationToken
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
            "Received valid Nets webhook callback {EventName} for instance {InstanceGuid} for {Payment}",
            webhookPayload.EventName,
            instanceGuid,
            webhookPayload.Data.PaymentId
        );
        await _attemptRequests.ForwardNetsEvent(
            new AppIdentifier(org, app),
            new InstanceIdentifier(instanceOwnerPartyId, instanceGuid),
            mailboxId,
            webhookPayload,
            cancellationToken
        );
        return Ok();
    }

    private IActionResult ToResult(PaymentAttemptAnswer answer) =>
        answer switch
        {
            PaymentAttemptAnswer.Record record => Ok(record.Payment),
            PaymentAttemptAnswer.NotOpen => PaymentProblem(
                StatusCodes.Status409Conflict,
                "payment-attempt-not-open",
                "No payment attempt holds the task.",
                "Move the process with process/next instead."
            ),
            PaymentAttemptAnswer.Reserved => PaymentProblem(
                StatusCodes.Status409Conflict,
                "payment-authorized",
                "The payment is reserved.",
                "The payment has gone through at the payment processor and can no longer be cancelled."
            ),
            PaymentAttemptAnswer.ProcessorUnavailable => PaymentProblem(
                StatusCodes.Status502BadGateway,
                "payment-processor-unavailable",
                "The payment processor could not be asked.",
                "Nothing was sent to the payment attempt. Try again later."
            ),
            PaymentAttemptAnswer.EngineUnavailable => PaymentProblem(
                StatusCodes.Status503ServiceUnavailable,
                "workflow-engine-unavailable",
                "The message could not be sent to the payment attempt.",
                "Try again."
            ),
            PaymentAttemptAnswer.MessageLimit => PaymentProblem(
                StatusCodes.Status409Conflict,
                "payment-attempt-message-limit",
                "The payment attempt takes no more messages.",
                "Wait until the payment attempt ends."
            ),
            PaymentAttemptAnswer.Refused refused => ProcessController.CreateErrorResult(
                refused.Result,
                _logger,
                workflowFailureTitle: "Something went wrong while the payment attempt handled the request."
            ),
            _ => throw new UnreachableException($"Unknown payment attempt answer {answer.GetType().Name}."),
        };

    private Task<bool> AuthorizeAction(
        Instance instance,
        string action,
        string taskId,
        CancellationToken cancellationToken
    ) =>
        _authorizationService.AuthorizeAction(
            new AppIdentifier(instance),
            new InstanceIdentifier(instance),
            HttpContext.User,
            action,
            taskId,
            cancellationToken
        );

    private PaymentTask? GetPaymentTask(string? taskId) =>
        taskId is not null && _processReader.GetAltinnTaskExtension(taskId)?.PaymentConfiguration is { } configuration
            ? new PaymentTask(taskId, configuration.Validate())
            : null;

    private static JsonResult PaymentProblem(int status, string type, string title, string detail) =>
        ProcessStatusProblemResult.Create(
            new ProblemDetails
            {
                Type = type,
                Title = title,
                Detail = detail,
                Status = status,
            }
        );

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

    private sealed record PaymentTask(string Id, ValidAltinnPaymentConfiguration Configuration);
}
