using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Events;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.AltinnEvents;

internal sealed class CompletedAltinnEvent : IWorkflowEngineCommand
{
    public static string Key => "CompletedAltinnEvent";

    public string GetKey() => Key;

    private readonly IEventsClient _eventsClient;

    public CompletedAltinnEvent(IEventsClient eventsClient)
    {
        _eventsClient = eventsClient;
    }

    public async Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext parameters)
    {
        Instance instance = parameters.InstanceDataMutator.Instance;

        try
        {
            if (instance.Process?.EndEvent is null)
                throw new InvalidOperationException(
                    "End event is not set on instance process. Cannot raise completed event."
                );

            await _eventsClient.AddEvent(
                $"app.instance.process.completed",
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
