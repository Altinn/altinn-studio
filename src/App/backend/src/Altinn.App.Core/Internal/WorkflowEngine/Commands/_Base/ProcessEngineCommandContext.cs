using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

internal struct ProcessEngineCommandContext
{
    public AppIdentifier AppId { get; init; }
    public InstanceIdentifier InstanceId { get; init; }

    public IInstanceDataMutator InstanceDataMutator { get; init; }
    public CancellationToken CancellationToken { get; init; }
    public AppCallbackPayload Payload { get; init; }

    /// <summary>
    /// The staged-service-task handoff value carried in the restored callback state: the output of
    /// the previous pipeline step, destined for the step this callback executes. Null for every
    /// command other than a staged ExecuteServiceTask step with an input.
    /// </summary>
    public JsonElement? ServiceTaskBaton { get; init; }
}
