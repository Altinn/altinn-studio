using System.Globalization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process.EventHandlers;

/// <summary>
/// This event handler is responsible for handling the end event for a process.
/// </summary>
public class EndEventEventHandler : IEndEventEventHandler
{
    private readonly IAppEvents _appEvents;
    private readonly IInstanceClient _instanceClient;
    private readonly IAppMetadata _appMetadata;

    /// <summary>
    /// This event handler is responsible for handling the end event for a process.
    /// </summary>
    public EndEventEventHandler(IAppEvents appEvents, IInstanceClient instanceClient, IAppMetadata appMetadata)
    {
        _appEvents = appEvents;
        _instanceClient = instanceClient;
        _appMetadata = appMetadata;
    }

    /// <summary>
    /// Execute the event handler logic.
    /// </summary>
    public async Task Execute(InstanceEvent instanceEvent, Instance instance)
    {
        string? endEvent = instanceEvent.ProcessInfo?.EndEvent;

        if (string.IsNullOrEmpty(endEvent))
        {
            throw new ArgumentException(
                $"End event is not set for instance event {instanceEvent.EventType} {instanceEvent.Id} on instance {instance.Id}."
            );
        }

        await _appEvents.OnEndAppEvent(endEvent, instance);
        await AutoDeleteOnProcessEndIfEnabled(instance);
    }

    private async Task AutoDeleteOnProcessEndIfEnabled(Instance instance)
    {
        InstanceIdentifier instanceIdentifier = new(instance);
        ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();
        if (applicationMetadata.AutoDeleteOnProcessEnd && instance.Process?.Ended != null)
        {
            int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId, CultureInfo.InvariantCulture);
            await _instanceClient.DeleteInstance(instanceOwnerPartyId, instanceIdentifier.InstanceGuid, true);
        }
    }
}
