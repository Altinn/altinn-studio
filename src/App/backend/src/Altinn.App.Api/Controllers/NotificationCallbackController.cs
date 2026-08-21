using System.Text.Json.Serialization;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Notifications.Cancellation;
using Altinn.App.Core.Features.Notifications.SecretProvider;
using Altinn.App.Core.Internal.Instances;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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

        Instance? instance = null;
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
        catch
        {
            logger.LogWarning(
                "Unable to get instance on notification callback - cannot cancel scheduled notification. Does the app support Maskinporten?"
            );
        }

        bool shouldSend = instance is null || instantiationNotification.ShouldSend(instance);

        NotificationCallbackResponse response = new() { SendNotification = shouldSend };
        return response;
    }
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
