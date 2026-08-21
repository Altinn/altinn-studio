using System.Text.Json;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.AltinnEvents;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskAbandon;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models.Notifications.Future;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

public class WorkflowCommandSetTests
{
    private static List<string> Keys(IReadOnlyList<StepRequest> steps) =>
        steps.Select(s => JsonSerializer.Deserialize<AppCommandData>(s.Command.Data!.Value)!.CommandKey).ToList();

    [Fact]
    public void GetTaskStartSteps_ServiceTaskInstantiation_RoutesCommandsToTheCorrectBuckets()
    {
        var commandSet = WorkflowCommandSet.GetTaskStartSteps(
            new TaskStartContext
            {
                ServiceTaskType = "pdf",
                IsInitialTaskStart = true,
                IsInstantiation = true,
                Notification = new InstantiationNotification(),
                RegisterEvents = true,
            }
        );

        Assert.Equal(
            [
                UnlockTaskData.Key,
                CleanupGeneratedFromTask.Key,
                OnTaskStartingHook.Key,
                CommonTaskInitialization.Key,
                StartTask.Key,
            ],
            Keys(commandSet.Commands)
        );

        // ExecuteServiceTask is critical - the next transition must wait on it.
        Assert.Equal([ExecuteServiceTask.Key], Keys(commandSet.CriticalPostCommitCommands));

        // Outbound events and notifications are fire-and-forget side effects.
        Assert.Equal(
            [MovedToAltinnEvent.Key, InstanceCreatedAltinnEvent.Key, NotifyInstanceOwnerOnInstantiation.Key],
            Keys(commandSet.SideEffectCommands)
        );
    }

    [Fact]
    public void GetTaskStartSteps_EventsDisabledNoServiceTask_HasNoPostCommitCommands()
    {
        var commandSet = WorkflowCommandSet.GetTaskStartSteps(
            new TaskStartContext
            {
                ServiceTaskType = null,
                IsInitialTaskStart = false,
                RegisterEvents = false,
            }
        );

        Assert.Empty(commandSet.CriticalPostCommitCommands);
        Assert.Empty(commandSet.SideEffectCommands);
    }

    [Fact]
    public void GetProcessEndSteps_AllFeaturesEnabled_RoutesCommandsToTheCorrectBuckets()
    {
        var commandSet = WorkflowCommandSet.GetProcessEndSteps(
            new ProcessEndContext
            {
                RegisterEvents = true,
                HasAutoDeleteDataTypes = true,
                AutoDeleteInstanceOnProcessEnd = true,
            }
        );

        Assert.Equal([OnProcessEndingHook.Key], Keys(commandSet.Commands));

        // App-authored end hook and storage mutations stay gated in Main.
        Assert.Equal(
            [EndProcessLegacyHook.Key, DeleteDataElementsIfConfigured.Key, DeleteInstanceIfConfigured.Key],
            Keys(commandSet.CriticalPostCommitCommands)
        );

        Assert.Equal([CompletedAltinnEvent.Key], Keys(commandSet.SideEffectCommands));
    }

    [Fact]
    public void GetTaskEndSteps_HasNoPostCommitCommands()
    {
        var commandSet = WorkflowCommandSet.GetTaskEndSteps();

        Assert.Equal(
            [EndTask.Key, CommonTaskFinalization.Key, OnTaskEndingHook.Key, LockTaskData.Key],
            Keys(commandSet.Commands)
        );
        Assert.Empty(commandSet.CriticalPostCommitCommands);
        Assert.Empty(commandSet.SideEffectCommands);
    }

    [Fact]
    public void GetTaskAbandonSteps_HasNoPostCommitCommands()
    {
        var commandSet = WorkflowCommandSet.GetTaskAbandonSteps();

        Assert.Equal([AbandonTask.Key, OnTaskAbandonHook.Key], Keys(commandSet.Commands));
        Assert.Empty(commandSet.CriticalPostCommitCommands);
        Assert.Empty(commandSet.SideEffectCommands);
    }
}
