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
}
