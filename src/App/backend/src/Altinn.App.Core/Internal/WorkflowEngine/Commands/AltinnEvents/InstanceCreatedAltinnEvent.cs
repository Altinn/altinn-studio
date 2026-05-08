using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Events;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.AltinnEvents;

internal sealed class InstanceCreatedAltinnEvent : IWorkflowEngineCommand
{
    public static string Key => "InstanceCreatedAltinnEvent";

    public string GetKey() => Key;

    private readonly IEventsClient _eventsClient;

    public InstanceCreatedAltinnEvent(IEventsClient eventsClient)
    {
        _eventsClient = eventsClient;
    }

    public async Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext parameters)
    {
        Instance instance = parameters.InstanceDataMutator.Instance;

        try
        {
            await _eventsClient.AddEvent("app.instance.created", instance, StorageAuthenticationMethod.ServiceOwner());

            return new SuccessfulProcessEngineCommandResult();
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }
}
