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
/// Runs as a post-commit command so the instance is fully persisted before sending.
/// </summary>
internal sealed class NotifyInstanceOwnerOnInstantiation(
    INotificationService notificationService,
    IAltinnPartyClient altinnPartyClient
) : WorkflowEngineCommandBase<NotifyInstanceOwnerOnInstantiationPayload>
{
    public static string Key => "NotifyInstanceOwnerOnInstantiation";

    public override string GetKey() => Key;

    public override async Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext context,
        NotifyInstanceOwnerOnInstantiationPayload payload
    )
    {
        Instance instance = context.InstanceDataMutator.Instance;

        if (!int.TryParse(instance.InstanceOwner.PartyId, CultureInfo.InvariantCulture, out int partyId))
        {
            return FailedProcessEngineCommandResult.Permanent(
                $"Invalid PartyId '{instance.InstanceOwner.PartyId}'. Instance: {instance.Id}",
                nameof(FormatException)
            );
        }

        try
        {
            Party? party = await altinnPartyClient.GetParty(partyId, StorageAuthenticationMethod.ServiceOwner());
            if (party is null)
            {
                return FailedProcessEngineCommandResult.Permanent(
                    $"Party not found for partyId {partyId}. Instance: {instance.Id}"
                );
            }

            await notificationService.NotifyInstanceOwnerOnInstantiation(
                instance,
                party,
                payload.Notification,
                context.CancellationToken
            );

            return new SuccessfulProcessEngineCommandResult();
        }
        catch (Exception ex) when (ex is InvalidOperationException or ServiceException)
        {
            return FailedProcessEngineCommandResult.Permanent(ex.Message, ex.GetType().Name);
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }
}
