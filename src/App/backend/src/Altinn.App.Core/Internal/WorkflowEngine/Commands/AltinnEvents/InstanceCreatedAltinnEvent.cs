using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Events;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.AltinnEvents;

internal sealed class InstanceCreatedAltinnEvent : IWorkflowEngineCommand
{
    public static string Key => "InstanceCreatedAltinnEvent";

    public string GetKey() => Key;

    private readonly IEventsClient _eventsClient;
    private readonly Telemetry? _telemetry;

    public InstanceCreatedAltinnEvent(IEventsClient eventsClient, Telemetry? telemetry = null)
    {
        _eventsClient = eventsClient;
        _telemetry = telemetry;
    }

    public async Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext parameters)
    {
        Instance instance = parameters.InstanceDataMutator.Instance;

        try
        {
            using (_telemetry?.StartProcessRegisterEventActivity(instance))
            {
                await _eventsClient.AddEvent(
                    "app.instance.created",
                    instance,
                    StorageAuthenticationMethod.ServiceOwner()
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
