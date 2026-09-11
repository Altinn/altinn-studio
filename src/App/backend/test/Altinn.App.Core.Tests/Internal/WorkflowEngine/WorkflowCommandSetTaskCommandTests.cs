using System.Text.Json;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskAbandon;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

/// <summary>Task declarations keep lifecycle ordering while running as ordinary named commands.</summary>
public class WorkflowCommandSetTaskCommandTests
{
    private static List<string> Keys(IReadOnlyList<StepRequest> steps) =>
        steps.Select(s => JsonSerializer.Deserialize<AppCommandData>(s.Command.Data!.Value)!.CommandKey).ToList();

    [Fact]
    public void GetTaskStartSteps_DeclaredCommands_BecomeOneStepEachAfterCommonInitialization()
    {
        WorkflowCommandSet commandSet = WorkflowCommandSet.GetTaskStartSteps(
            new TaskStartContext
            {
                TaskId = "Task_1",
                ServiceTask = null,
                StartCommands =
                [
                    new WorkflowCommandRef("ResolveSignees"),
                    new WorkflowCommandRef("NotifySignees", "{\"batch\":2}"),
                ],
                IsInitialTaskStart = false,
                RegisterEvents = false,
            }
        );

        Assert.Equal(
            [
                UnlockTaskData.Key,
                CleanupGeneratedFromTask.Key,
                OnTaskStartingHook.Key,
                CommonTaskInitialization.Key,
                "ResolveSignees",
                "NotifySignees",
            ],
            Keys(commandSet.Commands)
        );

        StepRequest resolve = commandSet.Commands[4];
        Assert.Equal("ResolveSignees", resolve.OperationId);
        Assert.Equal("ResolveSignees", resolve.CommandKey);
        Assert.Null(resolve.ServiceTaskItemIndex);
        Assert.Null(JsonSerializer.Deserialize<AppCommandData>(resolve.Command.Data!.Value)!.Payload);

        StepRequest notify = commandSet.Commands[5];
        Assert.Equal("NotifySignees", notify.OperationId);
        Assert.Equal("NotifySignees", notify.CommandKey);
        Assert.Null(notify.ServiceTaskItemIndex);
        Assert.Equal("{\"batch\":2}", JsonSerializer.Deserialize<AppCommandData>(notify.Command.Data!.Value)!.Payload);

        Assert.Empty(commandSet.CriticalPostCommitCommands);
    }

    [Fact]
    public void GetTaskStartSteps_NoDeclaredCommands_HasNoTaskStep()
    {
        WorkflowCommandSet commandSet = WorkflowCommandSet.GetTaskStartSteps(
            new TaskStartContext
            {
                TaskId = "Task_1",
                ServiceTask = null,
                IsInitialTaskStart = false,
                RegisterEvents = false,
            }
        );

        Assert.Equal(
            [UnlockTaskData.Key, CleanupGeneratedFromTask.Key, OnTaskStartingHook.Key, CommonTaskInitialization.Key],
            Keys(commandSet.Commands)
        );
    }

    [Fact]
    public void GetTaskEndSteps_DeclaredCommands_RunBeforeCommonFinalization()
    {
        WorkflowCommandSet commandSet = WorkflowCommandSet.GetTaskEndSteps(
            "Task_1",
            [new WorkflowCommandRef("GenerateSigningPdf"), new WorkflowCommandRef("RevokeSigneeRights")]
        );

        Assert.Equal(
            [
                "GenerateSigningPdf",
                "RevokeSigneeRights",
                CommonTaskFinalization.Key,
                OnTaskEndingHook.Key,
                LockTaskData.Key,
            ],
            Keys(commandSet.Commands)
        );
        Assert.Equal("GenerateSigningPdf", commandSet.Commands[0].OperationId);
        Assert.Equal("RevokeSigneeRights", commandSet.Commands[1].OperationId);
    }

    [Fact]
    public void GetTaskAbandonSteps_DeclaredCommands_RunBeforeAbandonHook()
    {
        WorkflowCommandSet commandSet = WorkflowCommandSet.GetTaskAbandonSteps(
            "Task_1",
            [new WorkflowCommandRef("AbortRuntimeDelegatedSigning")]
        );

        Assert.Equal(["AbortRuntimeDelegatedSigning", OnTaskAbandonHook.Key], Keys(commandSet.Commands));
        Assert.Equal("AbortRuntimeDelegatedSigning", commandSet.Commands[0].CommandKey);
    }
}
