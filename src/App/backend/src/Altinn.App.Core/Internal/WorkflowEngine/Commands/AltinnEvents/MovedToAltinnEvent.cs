using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Events;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.AltinnEvents;

internal sealed class MovedToAltinnEvent : IWorkflowEngineCommand
{
    public static string Key => "MovedToAltinnEvent";

    public string GetKey() => Key;

    private readonly IEventsClient _eventsClient;

    public MovedToAltinnEvent(IEventsClient eventsClient)
    {
        _eventsClient = eventsClient;
    }

    public async Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext parameters)
    {
        Instance instance = parameters.InstanceDataMutator.Instance;

        try
        {
            if (string.IsNullOrWhiteSpace(instance.Process?.CurrentTask?.ElementId))
                throw new InvalidOperationException(
                    "Current task is not set on instance process. Cannot raise movedTo event."
                );

            await _eventsClient.AddEvent(
                $"app.instance.process.movedTo.{instance.Process.CurrentTask.ElementId}",
                instance,
                StorageAuthenticationMethod.ServiceOwner()
            );

            return new SuccessfulProcessEngineCommandResult();
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }
}
