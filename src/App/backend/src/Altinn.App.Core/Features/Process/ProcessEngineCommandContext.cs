using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Process;

/// <summary>
/// The data and durable identity available to an ordinary workflow command.
/// </summary>
public struct ProcessEngineCommandContext
{
    /// <summary>Access to the instance and its data. Changes are saved after successful execution.</summary>
    public required IInstanceDataMutator InstanceDataMutator { get; init; }

    /// <summary>The workflow ID, stable across retries and resume of the same transition.</summary>
    public Guid WorkflowId { get; init; }

    /// <summary>The step ID, stable across retries and resume and suitable for outbound idempotency keys.</summary>
    public Guid StepId { get; init; }

    /// <summary>
    /// The declaring task's serialized input, unchanged across retries. The command owns its format.
    /// Task-specific commands should carry the explicit BPMN task ID in this input.
    /// </summary>
    public string? CommandPayload { get; init; }

    /// <summary>Cancellation requested for this attempt.</summary>
    public CancellationToken CancellationToken { get; init; }

    internal AppIdentifier AppId { get; init; }
    internal InstanceIdentifier InstanceId { get; init; }
    internal AppCallbackPayload Payload { get; init; }
    internal WorkflowCallbackStateCarry StateCarry { get; init; }
}
