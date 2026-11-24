using System.Text.Json;
using Altinn.App.Core.Features.Process;
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
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

public class WorkflowStepSetTests
{
    private static List<string> Keys(IReadOnlyList<PlannedStep> steps) => steps.Select(s => s.CommandKey).ToList();

    /// <summary>The pipeline of a service task that does one thing: one stage.</summary>
    private static ServiceTaskPipeline SingleStageServiceTaskPipeline() =>
        new PipelineBuilder.ServiceTask().Stage(_ => Task.FromResult(ServiceTaskResult.Completed())).ToPipeline();

    /// <summary>The lifecycle pipeline every task type without its own definition forwards to.</summary>
    private static ProcessTaskPipeline SingleStagePipeline() =>
        new PipelineBuilder.Lifecycle().Stage(_ => Task.FromResult(StageResult.Completed())).ToPipeline();

    private static ProcessTaskPipeline ThreeStagePipeline(ProcessStepOptions? middleOptions = null) =>
        new PipelineBuilder.Lifecycle()
            .Stage(_ => Task.FromResult(StageResult.Completed()))
            .Stage(_ => Task.FromResult(StageResult.Completed()), middleOptions)
            .Stage(_ => Task.FromResult(StageResult.Completed()))
            .ToPipeline();

    [Fact]
    public void GetTaskStartSteps_ServiceTaskInstantiation_RoutesStepsToTheCorrectLists()
    {
        var stepSet = WorkflowStepSet.GetTaskStartSteps(
            new TaskStartContext
            {
                TaskId = "Task_1",
                StartPipeline = SingleStagePipeline(),
                ServiceTask = new ResolvedServiceTask("pdf", SingleStageServiceTaskPipeline()),
                StartingHook = Mock.Of<IOnTaskStartingHandler>(),
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
            Keys(stepSet.LifecycleSteps)
        );

        // ExecuteServiceTask is primary - the next transition must wait on it.
        Assert.Equal([ExecuteServiceTask.Key], Keys(stepSet.PrimaryPostCommitSteps));

        // Outbound events and notifications are auxiliary: they run beside the process.
        Assert.Equal(
            [MovedToAltinnEvent.Key, InstanceCreatedAltinnEvent.Key, NotifyInstanceOwnerOnInstantiation.Key],
            Keys(stepSet.AuxiliarySteps)
        );
    }

    [Fact]
    public void GetTaskStartSteps_EventsDisabledNoServiceTask_HasNoPostCommitSteps()
    {
        var stepSet = WorkflowStepSet.GetTaskStartSteps(
            new TaskStartContext
            {
                TaskId = "Task_1",
                StartPipeline = SingleStagePipeline(),
                ServiceTask = null,
                StartingHook = null,
                IsInitialTaskStart = false,
                RegisterEvents = false,
            }
        );

        Assert.Empty(stepSet.PrimaryPostCommitSteps);
        Assert.Empty(stepSet.AuxiliarySteps);
    }

    [Fact]
    public void GetProcessEndSteps_RunsTheEndedHookAndTheDataCleanupAfterTheCommit()
    {
        var stepSet = WorkflowStepSet.GetProcessEndSteps(
            new ProcessEndContext { ProcessEndedHook = Mock.Of<IOnProcessEndedHandler>(), RegisterEvents = true }
        );

        Assert.Empty(stepSet.LifecycleSteps);
        Assert.Equal([OnProcessEndedHook.Key, DeleteDataOnProcessEnd.Key], Keys(stepSet.PrimaryPostCommitSteps));
        Assert.Equal([CompletedAltinnEvent.Key], Keys(stepSet.AuxiliarySteps));
    }

    [Fact]
    public void GetTaskEndSteps_HasNoPostCommitSteps()
    {
        var stepSet = WorkflowStepSet.GetTaskEndSteps("Task_1", SingleStagePipeline(), Mock.Of<IOnTaskEndingHandler>());

        Assert.Equal(
            [EndTask.Key, CommonTaskFinalization.Key, OnTaskEndingHook.Key, LockTaskData.Key],
            Keys(stepSet.LifecycleSteps)
        );
        Assert.Empty(stepSet.PrimaryPostCommitSteps);
        Assert.Empty(stepSet.AuxiliarySteps);
    }

    [Fact]
    public void GetTaskAbandonSteps_HasNoPostCommitSteps()
    {
        var stepSet = WorkflowStepSet.GetTaskAbandonSteps(SingleStagePipeline(), Mock.Of<IOnTaskAbandoningHandler>());

        Assert.Equal([AbandonTask.Key, OnTaskAbandonHook.Key], Keys(stepSet.LifecycleSteps));
        Assert.Empty(stepSet.PrimaryPostCommitSteps);
        Assert.Empty(stepSet.AuxiliarySteps);
    }

    [Fact]
    public void HookSteps_WithoutAHandler_AreNotPlanned()
    {
        var start = WorkflowStepSet.GetTaskStartSteps(
            new TaskStartContext
            {
                TaskId = "Task_1",
                StartPipeline = SingleStagePipeline(),
                ServiceTask = null,
                StartingHook = null,
                IsInitialTaskStart = false,
            }
        );
        Assert.Equal(
            [UnlockTaskData.Key, CleanupGeneratedFromTask.Key, CommonTaskInitialization.Key, StartTask.Key],
            Keys(start.LifecycleSteps)
        );

        Assert.Equal(
            [EndTask.Key, CommonTaskFinalization.Key, LockTaskData.Key],
            Keys(WorkflowStepSet.GetTaskEndSteps("Task_1", SingleStagePipeline(), endingHook: null).LifecycleSteps)
        );
        Assert.Equal(
            [AbandonTask.Key],
            Keys(WorkflowStepSet.GetTaskAbandonSteps(SingleStagePipeline(), abandonHook: null).LifecycleSteps)
        );
        Assert.Equal(
            [DeleteDataOnProcessEnd.Key],
            Keys(
                WorkflowStepSet
                    .GetProcessEndSteps(new ProcessEndContext { ProcessEndedHook = null })
                    .PrimaryPostCommitSteps
            )
        );
    }

    [Fact]
    public void GetTaskStartSteps_SingleStagePipeline_PlansOneStepAtIndexZero()
    {
        var options = new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(2) };
        var stepSet = WorkflowStepSet.GetTaskStartSteps(
            new TaskStartContext
            {
                TaskId = "Task_1",
                StartPipeline = new PipelineBuilder.Lifecycle()
                    .Stage(_ => Task.FromResult(StageResult.Completed()), options)
                    .ToPipeline(),
                ServiceTask = null,
                StartingHook = null,
                IsInitialTaskStart = false,
            }
        );

        PlannedStep startStep = Assert.Single(stepSet.LifecycleSteps, step => step.CommandKey == StartTask.Key);
        Assert.Equal($"{StartTask.Key}: 0", startStep.OperationId);
        Assert.Equal(0, Assert.IsType<ProcessTaskStagePayload>(startStep.Payload).StageIndex);
        Assert.Same(options, startStep.DeclaredOptions);
    }

    [Fact]
    public void GetTaskStartSteps_MultiStagePipeline_PlansOneStepPerStage()
    {
        var middleOptions = new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(5) };
        var stepSet = WorkflowStepSet.GetTaskStartSteps(
            new TaskStartContext
            {
                TaskId = "Task_1",
                StartPipeline = ThreeStagePipeline(middleOptions),
                ServiceTask = null,
                StartingHook = Mock.Of<IOnTaskStartingHandler>(),
                IsInitialTaskStart = false,
            }
        );

        Assert.Equal(
            [
                UnlockTaskData.Key,
                CleanupGeneratedFromTask.Key,
                OnTaskStartingHook.Key,
                CommonTaskInitialization.Key,
                StartTask.Key,
                StartTask.Key,
                StartTask.Key,
            ],
            Keys(stepSet.LifecycleSteps)
        );

        List<PlannedStep> stageSteps = stepSet.LifecycleSteps.Where(step => step.CommandKey == StartTask.Key).ToList();
        Assert.Equal(["StartTask: 0", "StartTask: 1", "StartTask: 2"], stageSteps.Select(step => step.OperationId));
        Assert.Equal(
            [0, 1, 2],
            stageSteps.Select(step => Assert.IsType<ProcessTaskStagePayload>(step.Payload).StageIndex)
        );
        Assert.Equal([null, middleOptions, null], stageSteps.Select(step => step.DeclaredOptions));
    }

    [Fact]
    public void GetTaskEndAndAbandonSteps_MultiStagePipeline_PlanStagesBeforeTheHooks()
    {
        Assert.Equal(
            [EndTask.Key, EndTask.Key, EndTask.Key, CommonTaskFinalization.Key, OnTaskEndingHook.Key, LockTaskData.Key],
            Keys(
                WorkflowStepSet
                    .GetTaskEndSteps("Task_1", ThreeStagePipeline(), Mock.Of<IOnTaskEndingHandler>())
                    .LifecycleSteps
            )
        );
        Assert.Equal(
            [AbandonTask.Key, AbandonTask.Key, AbandonTask.Key, OnTaskAbandonHook.Key],
            Keys(
                WorkflowStepSet
                    .GetTaskAbandonSteps(ThreeStagePipeline(), Mock.Of<IOnTaskAbandoningHandler>())
                    .LifecycleSteps
            )
        );
    }

    [Fact]
    public void GetTaskStartSteps_EmptyPipeline_PlansNoStartStep()
    {
        var stepSet = WorkflowStepSet.GetTaskStartSteps(
            new TaskStartContext
            {
                TaskId = "Task_1",
                StartPipeline = new PipelineBuilder.Lifecycle().ToPipeline(),
                ServiceTask = null,
                StartingHook = null,
                IsInitialTaskStart = false,
            }
        );

        Assert.DoesNotContain(StartTask.Key, Keys(stepSet.LifecycleSteps));
    }

    // ---------------------------------------------------------------------------------------------
    // The item planner: every pipeline item in a workflow of its own, an external stage's send with its
    // mint, and each of its replies in a receive workflow.
    // ---------------------------------------------------------------------------------------------

    // ---------------------------------------------------------------------------------------------
    // Step names: a display label for the people following the task, never part of a step's identity.
    // ---------------------------------------------------------------------------------------------

    private static string? StepName(PlannedStep step) => step.StepName;

    private static Task<StageResult> StoreReceipt(StageContext context) => Task.FromResult(StageResult.Completed());

    private static Task<StageResult> RevokeSigneeRights(StageContext context) =>
        Task.FromResult(StageResult.Completed());

    [Fact]
    public void GetTaskEndSteps_StagesComposedFromNamedMethods_LabelEachStepWithTheMethodName()
    {
        ProcessTaskPipeline pipeline = new PipelineBuilder.Lifecycle()
            .Stage(StoreReceipt)
            .Stage(RevokeSigneeRights)
            .Stage(_ => Task.FromResult(StageResult.Completed()))
            .ToPipeline();

        List<PlannedStep> stageSteps = WorkflowStepSet
            .GetTaskEndSteps("Task_1", pipeline, endingHook: null)
            .LifecycleSteps.Where(step => step.CommandKey == EndTask.Key)
            .ToList();

        Assert.Equal(["Store receipt", "Revoke signee rights", null], stageSteps.Select(StepName));
        // The step's identity is untouched: the index, in the OperationId and the payload.
        Assert.Equal(["EndTask: 0", "EndTask: 1", "EndTask: 2"], stageSteps.Select(step => step.OperationId));
    }

    [Fact]
    public void PlanItem_ItemsComposedFromNamedMethods_GoByTheMethodNames()
    {
        ServiceTaskPipeline pipeline = new PipelineBuilder.ServiceTask()
            .ExternalStage(SendToArchive, OnArchiveReply, onTimeout: OnArchiveTimeout)
            .Stage(FinalWork)
            .ToPipeline();
        var archive = Assert.IsType<ServiceTaskItem.ExternalStage>(pipeline.Items[0]);

        // The step that mints the mailbox stays unnamed; the send goes by its method, and a receive step by both
        // handlers, since it runs one or the other.
        Assert.Equal([null, "Send to archive"], WorkflowStepSet.PlanItem("archiving", pipeline, 0).Select(StepName));
        Assert.Equal(
            "On archive reply / On archive timeout",
            StepName(WorkflowStepSet.PlanReceive("archiving", archive, 0))
        );
        Assert.Equal("Final work", StepName(Assert.Single(WorkflowStepSet.PlanItem("archiving", pipeline, 1))));
    }

    [Fact]
    public void PlanItem_UnnamedLambdas_CarryNoLabels()
    {
        ServiceTaskPipeline pipeline = new PipelineBuilder.ServiceTask()
            .Stage(_ => Task.FromResult(ServiceTaskResult.Completed()))
            .ExternalStage(
                (_, _) => Task.FromResult(ServiceTaskResult.Completed()),
                (_, _) => Task.FromResult(ServiceTaskReplyResult.Completed())
            )
            .ToPipeline();

        Assert.All(Workflows(pipeline).SelectMany(steps => steps), step => Assert.Null(step.StepName));
    }

    private static Task<ServiceTaskResult> PlainStage(StageContext context) =>
        Task.FromResult(ServiceTaskResult.Completed());

    private static Task<ServiceTaskResult> SendToArchive(StageContext context, ReplyAddress replyAddress) =>
        Task.FromResult(ServiceTaskResult.Completed());

    private static Task<ServiceTaskReplyResult> OnArchiveReply(StageContext context, ServiceTaskReply reply) =>
        Task.FromResult(ServiceTaskReplyResult.Completed());

    private static Task<ServiceTaskResult> OnArchiveTimeout(StageContext context) =>
        Task.FromResult(ServiceTaskResult.Completed());

    private static Task<ServiceTaskResult> FinalWork(StageContext context) =>
        Task.FromResult(ServiceTaskResult.Completed());

    private static List<string> OperationIds(IReadOnlyList<PlannedStep> steps) =>
        steps.Select(step => step.OperationId).ToList();

    /// <summary>The raw JSON of the steps' payloads, in order.</summary>
    private static List<string> StepPayloadJson(IReadOnlyList<PlannedStep> steps) =>
        steps.Select(step => CommandPayloadSerializer.Serialize(step.Payload) ?? "").ToList();

    /// <summary>
    /// Every workflow the pipeline runs when each item completes, in order: each item's own workflow, and after an
    /// external stage's send, the receive workflow its first reply runs in.
    /// </summary>
    private static List<IReadOnlyList<PlannedStep>> Workflows(ServiceTaskPipeline pipeline)
    {
        var workflows = new List<IReadOnlyList<PlannedStep>>();
        for (int index = 0; index < pipeline.Items.Count; index++)
        {
            workflows.Add(WorkflowStepSet.PlanItem("archiving", pipeline, index));
            if (pipeline.Items[index] is ServiceTaskItem.ExternalStage external)
            {
                workflows.Add([WorkflowStepSet.PlanReceive("archiving", external, index)]);
            }
        }
        return workflows;
    }

    [Fact]
    public void PlanItem_PutsEachItemsOwnOptionsOnItsSteps_AndNoneOnTheMint()
    {
        var stage = new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(1) };
        var external = new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(2) };
        var last = new ProcessStepOptions { WaitBudget = TimeSpan.FromHours(4) };
        ServiceTaskPipeline pipeline = new PipelineBuilder.ServiceTask()
            .Stage(PlainStage, stage)
            .ExternalStage(SendToArchive, OnArchiveReply, options: external)
            .Stage(FinalWork, last)
            .ToPipeline();

        List<IReadOnlyList<PlannedStep>> workflows = Workflows(pipeline);

        Assert.Equal(4, workflows.Count);
        Assert.Same(stage, Assert.Single(workflows[0]).DeclaredOptions);
        // The mint before the send carries nothing, so it inherits no options; the send and each reply carry the
        // external stage's.
        Assert.Equal([null, external], workflows[1].Select(step => step.DeclaredOptions));
        Assert.Same(external, Assert.Single(workflows[2]).DeclaredOptions);
        Assert.Same(last, Assert.Single(workflows[3]).DeclaredOptions);
    }

    /// <summary>
    /// The primary workflow carries the first item only. The assembled version of this is
    /// <c>ProcessNextRequestFactoryTests</c>'s external stage case.
    /// </summary>
    [Fact]
    public void PlanItem_AStageThenAnExternalStage_RunsEachStepInAWorkflowOfItsOwn()
    {
        ServiceTaskPipeline pipeline = new PipelineBuilder.ServiceTask()
            .Stage(PlainStage)
            .ExternalStage(SendToArchive, OnArchiveReply)
            .ToPipeline();

        List<IReadOnlyList<PlannedStep>> workflows = Workflows(pipeline);

        Assert.Equal(
            [
                [$"{ExecuteServiceTask.Key}: 0"],
                [$"{MintMailbox.Key}: 1", $"{ExecuteServiceTask.Key}: 1"],
                [$"{ExecuteServiceTask.Key}: 1"],
            ],
            workflows.Select(OperationIds)
        );
    }

    [Fact]
    public void PlanItem_TwoStages_PlanThePrimaryWorkflowAndOneContinuation()
    {
        ServiceTaskPipeline pipeline = new PipelineBuilder.ServiceTask()
            .Stage(PlainStage)
            .Stage(FinalWork)
            .ToPipeline();

        List<IReadOnlyList<PlannedStep>> workflows = Workflows(pipeline);

        Assert.Equal(
            [
                [$"{ExecuteServiceTask.Key}: 0"],
                [$"{ExecuteServiceTask.Key}: 1"],
            ],
            workflows.Select(OperationIds)
        );
    }

    /// <summary>
    /// Two external stages in sequence, the shape of a task with two exchanges: each send shares its workflow with
    /// its own mint only, and each stage's replies run alone in receive workflows parked on its own mailbox.
    /// </summary>
    [Fact]
    public void PlanItem_TwoExternalStages_EachSendWithItsMintThenItsReceiver()
    {
        ServiceTaskPipeline pipeline = new PipelineBuilder.ServiceTask()
            .ExternalStage(SendToArchive, OnArchiveReply)
            .ExternalStage(SendToArchive, OnArchiveReply)
            .ToPipeline();

        List<IReadOnlyList<PlannedStep>> workflows = Workflows(pipeline);

        Assert.Equal(
            [
                [$"{MintMailbox.Key}: 0", $"{ExecuteServiceTask.Key}: 0"],
                [$"{ExecuteServiceTask.Key}: 0"],
                [$"{MintMailbox.Key}: 1", $"{ExecuteServiceTask.Key}: 1"],
                [$"{ExecuteServiceTask.Key}: 1"],
            ],
            workflows.Select(OperationIds)
        );
    }

    /// <summary>
    /// The whole serialized payload of every step the planner emits for an external stage, pinned exactly: the send
    /// and its replies run the same item, so they carry the same payload, and the mint names the stage it opens for.
    /// Pinned on the serialized shape because that is what a workflow enqueued by this version replays from.
    /// </summary>
    [Fact]
    public void PlanItem_ExternalStagePayloads_AreTheItemIndexAndNothingElse()
    {
        ServiceTaskPipeline pipeline = new PipelineBuilder.ServiceTask()
            .Stage(PlainStage)
            .ExternalStage(SendToArchive, OnArchiveReply)
            .ToPipeline();
        var archive = Assert.IsType<ServiceTaskItem.ExternalStage>(pipeline.Items[1]);

        Assert.Equal(
            [
                "{\"$type\":\"mintMailbox\",\"serviceTaskType\":\"archiving\",\"stageIndex\":1}",
                "{\"$type\":\"executeServiceTask\",\"serviceTaskType\":\"archiving\",\"itemIndex\":1}",
                "{\"$type\":\"executeServiceTask\",\"serviceTaskType\":\"archiving\",\"itemIndex\":1}",
            ],
            StepPayloadJson(WorkflowStepSet.PlanItem("archiving", pipeline, 1))
                .Concat(StepPayloadJson([WorkflowStepSet.PlanReceive("archiving", archive, 1)]))
        );
    }
}
