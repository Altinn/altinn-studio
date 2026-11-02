using System.Globalization;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Notifications;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Models.Notifications.Future;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Request payload for NotifyInstanceOwnerOnInstantiation command.
/// Contains the notification configuration provided at instantiation time.
/// </summary>
internal sealed record NotifyInstanceOwnerOnInstantiationPayload(InstantiationNotification Notification)
    : CommandRequestPayload;

/// <summary>
/// Sends a notification to the instance owner after instantiation.
/// Runs as a post-commit step so the instance is fully persisted before sending, and as the first step of its own
/// auxiliary workflow: <see cref="AwaitInstantiationNotificationDelivery"/> follows it there and checks that the
/// notification arrived.
/// </summary>
internal sealed class NotifyInstanceOwnerOnInstantiation(
    INotificationService notificationService,
    IAltinnPartyClient altinnPartyClient
) : WorkflowEngineCommandBase<NotifyInstanceOwnerOnInstantiationPayload>
{
    public static string Key => "NotifyInstanceOwnerOnInstantiation";

    public override string GetKey() => Key;

    public override async Task<WorkflowEngineCommandResult> Execute(
        WorkflowEngineCommandContext context,
        NotifyInstanceOwnerOnInstantiationPayload payload
    )
    {
        Instance instance = context.InstanceDataMutator.Instance;

        if (!int.TryParse(instance.InstanceOwner.PartyId, CultureInfo.InvariantCulture, out int partyId))
        {
            return FailedWorkflowEngineCommandResult.Permanent(
                $"Invalid PartyId '{instance.InstanceOwner.PartyId}'. Instance: {instance.Id}",
                nameof(FormatException)
            );
        }

        try
        {
            Party? party = await altinnPartyClient.GetParty(
                partyId,
                StorageAuthenticationMethod.ServiceOwner(),
                context.CancellationToken
            );
            if (party is null)
            {
                return FailedWorkflowEngineCommandResult.Permanent(
                    $"Party not found for partyId {partyId}. Instance: {instance.Id}"
                );
            }

            if (notificationService is NotificationService builtIn)
            {
                // Recorded for AwaitInstantiationNotificationDelivery, the next step of this workflow. A retry places
                // the same order again: Notifications returns the existing one for a repeated idempotency id.
                InstantiationNotificationOrder order = await builtIn.OrderInstantiationNotification(
                    instance,
                    party,
                    payload.Notification,
                    context.CancellationToken
                );
                context.StateCarry.RecordNotificationShipment(order.ShipmentId, order.RequestedSendTime);
            }
            else
            {
                // An app that replaced the notification service sends its own way, and there is no shipment to check.
                await notificationService.NotifyInstanceOwnerOnInstantiation(
                    instance,
                    party,
                    payload.Notification,
                    context.CancellationToken
                );
            }

            return new SuccessfulWorkflowEngineCommandResult();
        }
        catch (Exception ex) when (ex is InvalidOperationException or ServiceException)
        {
            return FailedWorkflowEngineCommandResult.Permanent(ex.Message, ex.GetType().Name);
        }
        catch (Exception ex)
        {
            return FailedWorkflowEngineCommandResult.Retryable(ex);
        }
    }
}
