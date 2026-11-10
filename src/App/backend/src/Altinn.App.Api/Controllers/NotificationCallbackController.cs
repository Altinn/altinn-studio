using System.Net;
using System.Text.Json.Serialization;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Maskinporten.Exceptions;
using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.App.Core.Features.Notifications.Cancellation;
using Altinn.App.Core.Features.Notifications.SecretProvider;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Instances;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// Endpoint(s) for the Altinn Notification microservice callback
/// </summary>
[ApiController]
[AllowAnonymous]
[ApiExplorerSettings(IgnoreApi = true)]
[Route("{org}/{app}/api/v1/notification-webhook-listener")]
public class NotificationCallbackController(
    ILogger<NotificationCallbackController> logger,
    ICancelInstantiationNotification instantiationNotification,
    INotificationConditionCodeValidator validator,
    IInstanceClient instanceClient
) : ControllerBase
{
    /// <summary>
    /// Callback endpoint to check whether remaining notifications on application instantiation should be sent or not
    /// </summary>
    /// <returns><see cref="NotificationCallbackResponse"/></returns>
    [HttpGet("{instanceOwnerPartyId:int}/{instanceGuid:guid}")]
    [ProducesResponseType(typeof(NotificationCallbackResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<NotificationCallbackResponse>> NotificationCallback(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromQuery] string? code
    )
    {
        bool isValid = await validator.ValidateCode(code, instanceGuid);
        if (isValid is false)
        {
            logger.LogWarning(
                "Notification callback rejected: invalid or missing code for instance {InstanceGuid}.",
                instanceGuid
            );
            return Unauthorized();
        }

        Instance instance;
        try
        {
            instance = await instanceClient.GetInstance(
                app,
                org,
                instanceOwnerPartyId,
                instanceGuid,
                StorageAuthenticationMethod.ServiceOwner()
            );
        }
        catch (PlatformHttpException e) when (e.Response.StatusCode == HttpStatusCode.NotFound)
        {
            logger.LogInformation(
                "Instance {InstanceGuid} not found on notification callback - cancelling scheduled notification.",
                instanceGuid
            );
            return new NotificationCallbackResponse { SendNotification = false };
        }
        catch (Exception e) when (IsMaskinportenMisconfigured(e))
        {
            logger.LogError(
                e,
                "Unable to get instance {InstanceGuid} on notification callback: Maskinporten is not configured for the app, so scheduled notifications can never be cancelled.",
                instanceGuid
            );
            return StatusCode(StatusCodes.Status500InternalServerError);
        }
        catch (Exception e)
        {
            // Altinn Notifications retries a failed condition check, and sends the notification if the retry fails too.
            logger.LogWarning(e, "Unable to get instance {InstanceGuid} on notification callback.", instanceGuid);
            return StatusCode(StatusCodes.Status500InternalServerError);
        }

        if (instance.Status?.IsSoftDeleted is true || instance.Status?.IsHardDeleted is true)
        {
            return new NotificationCallbackResponse { SendNotification = false };
        }

        NotificationCallbackResponse response = new()
        {
            SendNotification = instantiationNotification.ShouldSend(instance),
        };
        return response;
    }

    private static bool IsMaskinportenMisconfigured(Exception e) =>
        e is MaskinportenConfigurationException
        || e is OptionsValidationException { OptionsType: var optionsType }
            && optionsType == typeof(MaskinportenSettings);
}

/// <summary>
/// Callback response indicating whether instantiation notifications should be sent or not
/// </summary>
public sealed class NotificationCallbackResponse
{
    /// <summary>
    /// True if the notification should be sent, false if it should be cancelled
    /// </summary>
    [JsonPropertyName("sendNotification")]
    public bool SendNotification { get; set; }
}
