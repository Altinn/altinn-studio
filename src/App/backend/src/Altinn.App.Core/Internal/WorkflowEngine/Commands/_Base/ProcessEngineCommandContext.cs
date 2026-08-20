using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

internal struct ProcessEngineCommandContext
{
    public AppIdentifier AppId { get; init; }
    public InstanceIdentifier InstanceId { get; init; }

    /// <summary>
    /// The unit of work every command reads and writes instance data through. <c>required</c> because a struct's
    /// fields default to <c>null</c> however non-nullable their type reads, so a construction site that forgets one
    /// would hand the command a <see cref="NullReferenceException"/> at first use instead of a compile error.
    /// </summary>
    public required IInstanceDataMutator InstanceDataMutator { get; init; }

    public CancellationToken CancellationToken { get; init; }

    /// <summary>
    /// The callback the engine sent. <c>required</c> for the reason given on
    /// <see cref="InstanceDataMutator"/>.
    /// </summary>
    public required AppCallbackPayload Payload { get; init; }

    /// <summary>
    /// The non-data bookkeeping this callback's state blob is carrying (today: the mailbox the task's declaring
    /// stage opened). Restored from the incoming blob before the command runs and written back into the outgoing one
    /// after it succeeds, so a command that ignores it forwards it intact. <c>required</c> for the reason given on
    /// <see cref="InstanceDataMutator"/>.
    /// </summary>
    public required WorkflowCallbackStateCarry StateCarry { get; init; }
}
