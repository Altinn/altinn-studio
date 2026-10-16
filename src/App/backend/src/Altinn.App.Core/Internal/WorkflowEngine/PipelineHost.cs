using System.Diagnostics;
using System.Globalization;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// What a pipeline runs for: a service task, which holds up the process until the pipeline concludes and then
/// moves it on, or a side effect, which runs beside the process and whose conclusion ends it alone. Everything
/// that expands, dispatches and relays a pipeline is the same for both; this is where they differ.
/// </summary>
internal abstract record PipelineHost
{
    private PipelineHost() { }

    /// <summary>A service task, identified by its type.</summary>
    internal sealed record ServiceTask(string Type) : PipelineHost;

    /// <summary>A side effect, identified by its name, with the input every step of it carries.</summary>
    internal sealed record SideEffect(string Name, string? Input) : PipelineHost;

    /// <summary>How messages name the pipeline, for example <c>Service task 'pdf'</c>.</summary>
    public string Description =>
        this switch
        {
            ServiceTask task => $"Service task '{task.Type}'",
            SideEffect sideEffect => $"Side effect '{sideEffect.Name}'",
            _ => throw new UnreachableException(),
        };

    /// <summary>What operators see the pipeline as in operation ids: the task type or the side effect name.</summary>
    public string DisplayName =>
        this switch
        {
            ServiceTask task => task.Type,
            SideEffect sideEffect => sideEffect.Name,
            _ => throw new UnreachableException(),
        };

    /// <summary>The key the pipeline's values travel under in the workflow state carry.</summary>
    public string ValuesKey =>
        this switch
        {
            ServiceTask task => WorkflowCallbackStateCarry.ServiceTaskValuesKey(task.Type),
            SideEffect sideEffect => WorkflowCallbackStateCarry.SideEffectValuesKey(sideEffect.Name),
            _ => throw new UnreachableException(),
        };

    /// <summary>The owner bound into every message forwarded to a mailbox this pipeline opens.</summary>
    public MailboxOwner MailboxOwner =>
        this switch
        {
            ServiceTask task => MailboxOwner.ServiceTask(task.Type),
            SideEffect sideEffect => MailboxOwner.SideEffect(sideEffect.Name),
            _ => throw new UnreachableException(),
        };

    /// <summary>
    /// Whether the workflows the pipeline continues in hold up the process: a service task's are collection heads
    /// the process waits on, a side effect's are independent workflows nothing waits on.
    /// </summary>
    public bool HoldsUpProcess => this is ServiceTask;

    /// <summary>Reason code for every failure the pipeline's own code reported. Operator-visible.</summary>
    public string FailedReasonCode =>
        this is ServiceTask ? ExecuteServiceTask.FailedReasonCode : ExecuteSideEffect.FailedReasonCode;

    /// <summary>The sentence a failure the pipeline's own code reported is reported as.</summary>
    public string FailedMessage(string errorMessage) => $"{Description} failed: {errorMessage}";

    /// <summary>
    /// The engine step one item of the pipeline runs as. The item's index is the step's identity: it travels in
    /// the payload, which dispatch reads, and in the OperationId. A service task's step also carries the index on
    /// <see cref="StepRequest.ServiceTaskItemIndex"/>, which its options are resolved by; a side effect's step
    /// carries the item's own options on <see cref="StepRequest.StageOptions"/> instead.
    /// </summary>
    public StepRequest CreateItemStep(int itemIndex, ProcessStepOptions? itemOptions) =>
        this switch
        {
            ServiceTask task => CreateStep(
                ExecuteServiceTask.Key,
                new ExecuteServiceTaskPayload(task.Type, ItemIndex: itemIndex),
                $"{ExecuteServiceTask.Key}: {itemIndex.ToString(CultureInfo.InvariantCulture)}",
                serviceTaskItemIndex: itemIndex,
                stageOptions: null
            ),
            SideEffect sideEffect => CreateStep(
                ExecuteSideEffect.Key,
                new ExecuteSideEffectPayload(sideEffect.Name, itemIndex, sideEffect.Input),
                $"{ExecuteSideEffect.Key}: {itemIndex.ToString(CultureInfo.InvariantCulture)}",
                serviceTaskItemIndex: null,
                stageOptions: itemOptions
            ),
            _ => throw new UnreachableException(),
        };

    /// <summary>The step that mints the mailbox the stage at <paramref name="stageIndex"/> opens.</summary>
    public StepRequest CreateMintStep(int stageIndex) =>
        CreateStep(
            MintMailbox.Key,
            this switch
            {
                ServiceTask task => new MintMailboxPayload(task.Type, stageIndex),
                SideEffect sideEffect => new MintMailboxPayload(ServiceTaskType: null, stageIndex, sideEffect.Name),
                _ => throw new UnreachableException(),
            },
            $"{MintMailbox.Key}: {stageIndex.ToString(CultureInfo.InvariantCulture)}",
            // No item index and no options: the mint must not inherit the options of the stage it precedes.
            serviceTaskItemIndex: null,
            stageOptions: null
        );

    private static StepRequest CreateStep(
        string commandKey,
        CommandRequestPayload payload,
        string operationId,
        int? serviceTaskItemIndex,
        ProcessStepOptions? stageOptions
    ) =>
        new()
        {
            OperationId = operationId,
            Command = CommandDefinition.Create(
                "app",
                new AppCommandData { CommandKey = commandKey, Payload = CommandPayloadSerializer.Serialize(payload) }
            ),
            CommandKey = commandKey,
            ServiceTaskItemIndex = serviceTaskItemIndex,
            StageOptions = stageOptions,
        };
}
