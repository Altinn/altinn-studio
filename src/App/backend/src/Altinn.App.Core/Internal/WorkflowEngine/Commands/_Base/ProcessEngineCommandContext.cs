using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
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
    /// The non-data bookkeeping this callback's state blob is carrying (today: the mailbox the task's
    /// declaring stage opened). Restored from the incoming blob before the command runs and written
    /// back into the outgoing one after it succeeds, so a command that ignores it forwards it intact.
    /// <c>required</c>, unlike its neighbors: a command that records into it would otherwise throw a
    /// bare <see cref="NullReferenceException"/> on a context built without one, and the mailbox mint
    /// does exactly that. Cheaper to make every construction site say <c>new()</c> than to debug that.
    /// </summary>
    public required WorkflowCallbackStateCarry StateCarry { get; init; }
}
