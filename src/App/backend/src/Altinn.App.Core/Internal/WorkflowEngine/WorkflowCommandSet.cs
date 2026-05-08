using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.AltinnEvents;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskAbandon;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Defines a group of commands that should be executed for a process event.
/// </summary>
internal sealed class WorkflowCommandSet
{
    private readonly List<StepRequest> _commands = [];
    private readonly List<StepRequest> _postProcessNextCommittedCommands = [];

    /// <summary>
    /// Gets the main commands for this event. SaveProcessStateToStorage will be added after these.
    /// </summary>
    public IReadOnlyList<StepRequest> Commands => _commands;

    /// <summary>
    /// Gets the commands that execute after the ProcessNext has been committed to storage (e.g., MovedToAltinnEvent).
    /// </summary>
    public IReadOnlyList<StepRequest> PostProcessNextCommittedCommands => _postProcessNextCommittedCommands;

    /// <summary>
    /// Creates command group for task start events.
    /// </summary>
    public static WorkflowCommandSet GetTaskStartSteps(TaskStartContext context)
    {
        var group = new WorkflowCommandSet()
            .AddCommand(UnlockTaskData.Key)
            .AddCommand(StartTaskLegacyHook.Key, new StartTaskLegacyHookPayload(context.Prefill))
            .AddCommand(OnTaskStartingHook.Key)
            .AddCommand(CommonTaskInitialization.Key, new CommonTaskInitializationPayload(context.Prefill))
            .AddCommand(StartTask.Key);

        if (context.RegisterEvents)
        {
            group.AddPostProcessNextCommittedCommand(MovedToAltinnEvent.Key);
        }

        if (context.ServiceTaskType is not null)
        {
            group.AddPostProcessNextCommittedCommand(
                ExecuteServiceTask.Key,
                new ExecuteServiceTaskPayload(context.ServiceTaskType)
            );
        }

        if (context.IsInitialTaskStart && context.RegisterEvents)
        {
            group.AddPostProcessNextCommittedCommand(InstanceCreatedAltinnEvent.Key);

            if (context.Notification is not null)
            {
                group.AddPostProcessNextCommittedCommand(
                    NotifyInstanceOwnerOnInstantiation.Key,
                    new NotifyInstanceOwnerOnInstantiationPayload(context.Notification)
                );
            }
        }

        return group;
    }

    /// <summary>
    /// Creates command group for task end events.
    /// </summary>
    public static WorkflowCommandSet GetTaskEndSteps()
    {
        return new WorkflowCommandSet()
            .AddCommand(EndTask.Key)
            .AddCommand(CommonTaskFinalization.Key)
            .AddCommand(EndTaskLegacyHook.Key)
            .AddCommand(OnTaskEndingHook.Key)
            .AddCommand(LockTaskData.Key);
    }

    /// <summary>
    /// Creates command group for task abandon events.
    /// </summary>
    public static WorkflowCommandSet GetTaskAbandonSteps()
    {
        return new WorkflowCommandSet()
            .AddCommand(AbandonTask.Key)
            .AddCommand(OnTaskAbandonHook.Key)
            .AddCommand(AbandonTaskLegacyHook.Key);
    }

    /// <summary>
    /// Creates command group for process end events.
    /// </summary>
    public static WorkflowCommandSet GetProcessEndSteps(ProcessEndContext context)
    {
        // EndProcessLegacyHook runs post-commit because IProcessEnd.End reads instance.Process.EndEvent,
        // which is only set when the process state is persisted. This matches the old ProcessEngine behavior
        // where RunAppDefinedProcessEndHandlers ran after HandleEventsAndUpdateStorage.
        var group = new WorkflowCommandSet()
            .AddCommand(OnProcessEndingHook.Key)
            .AddPostProcessNextCommittedCommand(EndProcessLegacyHook.Key);

        if (context.HasAutoDeleteDataTypes)
        {
            group.AddPostProcessNextCommittedCommand(DeleteDataElementsIfConfigured.Key);
        }

        if (context.AutoDeleteInstanceOnProcessEnd)
        {
            group.AddPostProcessNextCommittedCommand(DeleteInstanceIfConfigured.Key);
        }

        if (context.RegisterEvents)
        {
            group.AddPostProcessNextCommittedCommand(CompletedAltinnEvent.Key);
        }

        return group;
    }

    /// <summary>
    /// Adds a command to the main sequence.
    /// </summary>
    private WorkflowCommandSet AddCommand(string commandKey, CommandRequestPayload? payload = null)
    {
        _commands.Add(CreateCommand(commandKey, payload));
        return this;
    }

    /// <summary>
    /// Adds a command that executes after the ProcessNext has been committed to storage via SaveProcessStateToStorage.
    /// </summary>
    private WorkflowCommandSet AddPostProcessNextCommittedCommand(
        string commandKey,
        CommandRequestPayload? payload = null
    )
    {
        _postProcessNextCommittedCommands.Add(CreateCommand(commandKey, payload));
        return this;
    }

    private static StepRequest CreateCommand(string commandKey, CommandRequestPayload? payload = null)
    {
        string? serializedPayload = CommandPayloadSerializer.Serialize(payload);
        return new StepRequest
        {
            OperationId = commandKey,
            Command = CommandDefinition.Create(
                "app",
                new AppCommandData { CommandKey = commandKey, Payload = serializedPayload }
            ),
        };
    }
}
