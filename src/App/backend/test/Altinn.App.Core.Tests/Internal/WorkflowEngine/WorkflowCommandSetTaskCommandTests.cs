using System.Text.Json;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskAbandon;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

/// <summary>
/// A process task's declared commands become one ExecuteProcessTaskCommand step each, in order, in the
/// phase's group, with the declared key travelling in the payload, the operation id and the step's
/// TaskCommandKey.
/// </summary>
public class WorkflowCommandSetTaskCommandTests
{
    private static List<string> Keys(IReadOnlyList<StepRequest> steps) =>
        steps.Select(s => JsonSerializer.Deserialize<AppCommandData>(s.Command.Data!.Value)!.CommandKey).ToList();

    private static ExecuteProcessTaskCommandPayload TaskCommandPayload(StepRequest step)
    {
        AppCommandData appCommand = JsonSerializer.Deserialize<AppCommandData>(step.Command.Data!.Value)!;
        return CommandPayloadSerializer.Deserialize<ExecuteProcessTaskCommandPayload>(appCommand.Payload)!;
    }

    [Fact]
    public void GetTaskStartSteps_DeclaredCommands_BecomeOneStepEachAfterCommonInitialization()
    {
        WorkflowCommandSet commandSet = WorkflowCommandSet.GetTaskStartSteps(
            new TaskStartContext
            {
                ServiceTask = null,
                StartCommands =
                [
                    new ProcessTaskCommandRef("ResolveSignees"),
                    new ProcessTaskCommandRef("NotifySignees", "{\"batch\":2}"),
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
                ExecuteProcessTaskCommand.Key,
                ExecuteProcessTaskCommand.Key,
            ],
            Keys(commandSet.Commands)
        );

        StepRequest resolve = commandSet.Commands[4];
        Assert.Equal("ExecuteProcessTaskCommand: ResolveSignees", resolve.OperationId);
        Assert.Equal(ExecuteProcessTaskCommand.Key, resolve.CommandKey);
        Assert.Equal("ResolveSignees", resolve.TaskCommandKey);
        Assert.Null(resolve.ServiceTaskItemIndex);
        Assert.Equal(new ExecuteProcessTaskCommandPayload("ResolveSignees"), TaskCommandPayload(resolve));

        StepRequest notify = commandSet.Commands[5];
        Assert.Equal("ExecuteProcessTaskCommand: NotifySignees", notify.OperationId);
        Assert.Equal("NotifySignees", notify.TaskCommandKey);
        Assert.Equal(
            new ExecuteProcessTaskCommandPayload("NotifySignees", "{\"batch\":2}"),
            TaskCommandPayload(notify)
        );

        Assert.Empty(commandSet.CriticalPostCommitCommands);
    }

    [Fact]
    public void GetTaskStartSteps_NoDeclaredCommands_HasNoTaskStep()
    {
        WorkflowCommandSet commandSet = WorkflowCommandSet.GetTaskStartSteps(
            new TaskStartContext
            {
                ServiceTask = null,
                IsInitialTaskStart = false,
                RegisterEvents = false,
            }
        );

        Assert.DoesNotContain(ExecuteProcessTaskCommand.Key, Keys(commandSet.Commands));
        Assert.DoesNotContain(StartTask.Key, Keys(commandSet.Commands));
    }

    [Fact]
    public void GetTaskEndSteps_DeclaredCommands_RunBeforeCommonFinalization()
    {
        WorkflowCommandSet commandSet = WorkflowCommandSet.GetTaskEndSteps([
            new ProcessTaskCommandRef("GenerateSigningPdf"),
            new ProcessTaskCommandRef("RevokeSigneeRights"),
        ]);

        Assert.Equal(
            [
                ExecuteProcessTaskCommand.Key,
                ExecuteProcessTaskCommand.Key,
                CommonTaskFinalization.Key,
                OnTaskEndingHook.Key,
                LockTaskData.Key,
            ],
            Keys(commandSet.Commands)
        );
        Assert.Equal("ExecuteProcessTaskCommand: GenerateSigningPdf", commandSet.Commands[0].OperationId);
        Assert.Equal("ExecuteProcessTaskCommand: RevokeSigneeRights", commandSet.Commands[1].OperationId);
        Assert.DoesNotContain(EndTask.Key, Keys(commandSet.Commands));
    }

    [Fact]
    public void GetTaskAbandonSteps_DeclaredCommands_RunBeforeAbandonHook()
    {
        WorkflowCommandSet commandSet = WorkflowCommandSet.GetTaskAbandonSteps([
            new ProcessTaskCommandRef("AbortRuntimeDelegatedSigning"),
        ]);

        Assert.Equal([ExecuteProcessTaskCommand.Key, OnTaskAbandonHook.Key], Keys(commandSet.Commands));
        Assert.Equal("AbortRuntimeDelegatedSigning", commandSet.Commands[0].TaskCommandKey);
        Assert.DoesNotContain(AbandonTask.Key, Keys(commandSet.Commands));
    }
}
