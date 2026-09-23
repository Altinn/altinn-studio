using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Events;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.AltinnEvents;

internal sealed class CompletedAltinnEvent : IWorkflowEngineCommand
{
    public static string Key => "CompletedAltinnEvent";

    public string GetKey() => Key;

    private readonly IEventsClient _eventsClient;
    private readonly Telemetry? _telemetry;

    public CompletedAltinnEvent(IEventsClient eventsClient, Telemetry? telemetry = null)
    {
        _eventsClient = eventsClient;
        _telemetry = telemetry;
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

            using (_telemetry?.StartProcessRegisterEventActivity(instance))
            {
                // The engine's step id is stable across every attempt of this step, so a retried
                // registration presents Events the same key and cannot raise the event twice.
                await _eventsClient.AddEvent(
                    "app.instance.process.completed",
                    instance,
                    StorageAuthenticationMethod.ServiceOwner(),
                    parameters.Payload.StepId,
                    parameters.CancellationToken
                );
            }

            return new SuccessfulProcessEngineCommandResult();
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }
}
