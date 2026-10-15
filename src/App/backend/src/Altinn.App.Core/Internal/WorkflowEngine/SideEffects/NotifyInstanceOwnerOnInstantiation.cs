using System.Globalization;
using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Notifications;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Models.Notifications.Future;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.SideEffects;

/// <summary>
/// Sends the notification the instantiation asked for to the instance owner. A side effect, so it runs once the
/// instance is created and committed, and never holds up the process.
/// </summary>
internal sealed class NotifyInstanceOwnerOnInstantiation(
    INotificationService notificationService,
    IAltinnPartyClient altinnPartyClient
) : ISideEffectPipeline
{
    /// <summary>The side effect's name, which its workflow's operation id ends with.</summary>
    public const string SideEffectName = "NotifyInstanceOwnerOnInstantiation";

    public string Name => SideEffectName;

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) => pipeline.Finally(Send);

    /// <summary>The side effect's input, as every step of its workflow carries it.</summary>
    internal static string SerializeArguments(InstantiationNotification notification) =>
        JsonSerializer.Serialize(notification, CommandPayloadJsonContext.Default.InstantiationNotification);

    private async Task<ServiceTaskResult> Send(ServiceTaskContext context)
    {
        if (ReadNotification(context.Arguments) is not { } notification)
        {
            return ServiceTaskResult.FailedPermanent(
                "The side effect was enqueued without a readable notification to send."
            );
        }

        Instance instance = context.InstanceDataMutator.Instance;
        if (!int.TryParse(instance.InstanceOwner.PartyId, CultureInfo.InvariantCulture, out int partyId))
        {
            return ServiceTaskResult.FailedPermanent(
                $"Invalid PartyId '{instance.InstanceOwner.PartyId}'. Instance: {instance.Id}"
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
                return ServiceTaskResult.FailedPermanent(
                    $"Party not found for partyId {partyId}. Instance: {instance.Id}"
                );
            }

            await notificationService.NotifyInstanceOwnerOnInstantiation(
                instance,
                party,
                notification,
                context.CancellationToken
            );

            return ServiceTaskResult.Success();
        }
        // Anything else is thrown on, and retried.
        catch (Exception ex) when (ex is InvalidOperationException or ServiceException)
        {
            return ServiceTaskResult.FailedPermanent(ex.Message);
        }
    }

    private static InstantiationNotification? ReadNotification(string? arguments)
    {
        if (arguments is null)
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize(arguments, CommandPayloadJsonContext.Default.InstantiationNotification);
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
