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

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

public class WorkflowStepSetTests
{
    private static List<string> Keys(IReadOnlyList<PlannedStep> steps) => steps.Select(s => s.CommandKey).ToList();

    /// <summary>The pipeline a simple service task forwards to: the conclusion and nothing else.</summary>
    private static ServiceTaskPipeline ConclusionOnlyPipeline() =>
        new PipelineBuilder().Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));

    /// <summary>The lifecycle pipeline every task type without its own definition forwards to.</summary>
    private static ProcessTaskPipeline SingleStagePipeline() =>
        new PipelineBuilder().Stage(_ => Task.FromResult(StageResult.Completed())).Build();

    private static ProcessTaskPipeline ThreeStagePipeline(ProcessStepOptions? middleOptions = null) =>
        new PipelineBuilder()
            .Stage(_ => Task.FromResult(StageResult.Completed()))
            .Stage(_ => Task.FromResult(StageResult.Completed()), middleOptions)
            .Stage(_ => Task.FromResult(StageResult.Completed()))
            .Build();

    [Fact]
    public void GetTaskStartSteps_ServiceTaskInstantiation_RoutesStepsToTheCorrectLists()
    {
        var stepSet = WorkflowStepSet.GetTaskStartSteps(
            new TaskStartContext
            {
                TaskId = "Task_1",
                StartPipeline = SingleStagePipeline(),
                ServiceTask = new ResolvedServiceTask("pdf", ConclusionOnlyPipeline()),
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
        var stepSet = WorkflowStepSet.GetProcessEndSteps(new ProcessEndContext { RegisterEvents = true });

        Assert.Empty(stepSet.LifecycleSteps);
        Assert.Equal([OnProcessEndedHook.Key, DeleteDataOnProcessEnd.Key], Keys(stepSet.PrimaryPostCommitSteps));
        Assert.Equal([CompletedAltinnEvent.Key], Keys(stepSet.AuxiliarySteps));
    }

    [Fact]
    public void GetTaskEndSteps_HasNoPostCommitSteps()
    {
        var stepSet = WorkflowStepSet.GetTaskEndSteps("Task_1", SingleStagePipeline());

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
        var stepSet = WorkflowStepSet.GetTaskAbandonSteps(SingleStagePipeline());

        Assert.Equal([AbandonTask.Key, OnTaskAbandonHook.Key], Keys(stepSet.LifecycleSteps));
        Assert.Empty(stepSet.PrimaryPostCommitSteps);
        Assert.Empty(stepSet.AuxiliarySteps);
    }

    [Fact]
    public void GetTaskStartSteps_SingleStagePipeline_PlansOneStepAtIndexZero()
    {
        var options = new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(2) };
        var stepSet = WorkflowStepSet.GetTaskStartSteps(
            new TaskStartContext
            {
                TaskId = "Task_1",
                StartPipeline = new PipelineBuilder()
                    .Stage(_ => Task.FromResult(StageResult.Completed()), options)
                    .Build(),
                ServiceTask = null,
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
            Keys(WorkflowStepSet.GetTaskEndSteps("Task_1", ThreeStagePipeline()).LifecycleSteps)
        );
        Assert.Equal(
            [AbandonTask.Key, AbandonTask.Key, AbandonTask.Key, OnTaskAbandonHook.Key],
            Keys(WorkflowStepSet.GetTaskAbandonSteps(ThreeStagePipeline()).LifecycleSteps)
        );
    }

    [Fact]
    public void GetTaskStartSteps_EmptyPipeline_PlansNoStartStep()
    {
        var stepSet = WorkflowStepSet.GetTaskStartSteps(
            new TaskStartContext
            {
                TaskId = "Task_1",
                StartPipeline = new PipelineBuilder().Build(),
                ServiceTask = null,
                IsInitialTaskStart = false,
            }
        );

        Assert.DoesNotContain(StartTask.Key, Keys(stepSet.LifecycleSteps));
    }

    // ---------------------------------------------------------------------------------------------
    // The segment planner: the items split at each reply handler and at each mailbox-opening stage,
    // each segment ended by its own hand-over.
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
        ProcessTaskPipeline pipeline = new PipelineBuilder()
            .Stage(StoreReceipt)
            .Stage(RevokeSigneeRights)
            .Stage(_ => Task.FromResult(StageResult.Completed()))
            .Build();

        List<PlannedStep> stageSteps = WorkflowStepSet
            .GetTaskEndSteps("Task_1", pipeline)
            .LifecycleSteps.Where(step => step.CommandKey == EndTask.Key)
            .ToList();

        Assert.Equal(["Store receipt", "Revoke signee rights", null], stageSteps.Select(StepName));
        // The step's identity is untouched: the index, in the OperationId and the payload.
        Assert.Equal(["EndTask: 0", "EndTask: 1", "EndTask: 2"], stageSteps.Select(step => step.OperationId));
    }

    [Fact]
    public void PlanSegment_ItemsComposedFromNamedMethods_GoByTheMethodNames()
    {
        ServiceTaskPipeline pipeline = new PipelineBuilder()
            .Stage(SendStage, _threeDays, out MailboxHandle archive)
            .HandleReplies(archive, OnSegmentMessage, OnSegmentClosed)
            .Finally(FinalWork);

        // The step that mints the mailbox stays unnamed; the stage that sends from it goes by its method.
        Assert.Equal([null, "Send stage"], WorkflowStepSet.PlanSegment("archiving", pipeline).Steps.Select(StepName));
        Assert.Equal(
            "On segment message / On segment closed",
            StepName(Assert.Single(WorkflowStepSet.PlanSegment("archiving", pipeline, afterItemIndex: 0).Steps))
        );
        Assert.Equal(
            "Final work",
            StepName(Assert.Single(WorkflowStepSet.PlanSegment("archiving", pipeline, afterItemIndex: 1).Steps))
        );
    }

    [Fact]
    public void PlanSegment_UnnamedLambdas_CarryNoLabels()
    {
        ServiceTaskPipeline pipeline = new PipelineBuilder()
            .Stage(_ => Task.FromResult(StageResult.Completed()))
            .Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));

        Assert.All(WorkflowStepSet.PlanSegment("signing", pipeline).Steps, step => Assert.Null(step.StepName));
    }

    private static readonly MailboxOptions _threeDays = new() { Timeout = TimeSpan.FromDays(3) };

    private static Task<StageResult> PlainStage(StageContext context) => Task.FromResult(StageResult.Completed());

    private static Task<ServiceTaskOpeningStageResult> SendStage(StageContext context, ServiceTaskMailbox mailbox) =>
        Task.FromResult(ServiceTaskOpeningStageResult.Completed());

    private static Task<ServiceTaskExchangeResult> OnMessage(StageContext context, ServiceTaskReply reply) =>
        Task.FromResult<ServiceTaskExchangeResult>(ServiceTaskResult.Success());

    private static Task<ServiceTaskResult> OnClosed(StageContext context, MailboxClosedReason reason) =>
        Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());

    private static Task<StageExchangeResult> OnSegmentMessage(StageContext context, ServiceTaskReply reply) =>
        Task.FromResult<StageExchangeResult>(StageResult.Completed());

    private static Task<StageResult> OnSegmentClosed(StageContext context, MailboxClosedReason reason) =>
        Task.FromResult(StageResult.Completed());

    private static Task<ServiceTaskResult> FinalWork(StageContext context) =>
        Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());

    private static List<string> OperationIds(ServiceTaskSegmentPlan plan) =>
        plan.Steps.Select(step => step.OperationId).ToList();

    /// <summary>The payloads of the plan's <c>ExecuteServiceTask</c> steps, in order.</summary>
    private static List<ExecuteServiceTaskPayload> StageStepPayloads(ServiceTaskSegmentPlan plan) =>
        plan
            .Steps.Where(step => step.CommandKey == ExecuteServiceTask.Key)
            .Select(step => Assert.IsType<ExecuteServiceTaskPayload>(step.Payload))
            .ToList();

    /// <summary>The raw JSON of the plan's <c>ExecuteServiceTask</c> step payloads, in order.</summary>
    private static List<string> StageStepPayloadJson(ServiceTaskSegmentPlan plan) =>
        plan
            .Steps.Where(step => step.CommandKey == ExecuteServiceTask.Key)
            .Select(step => CommandPayloadSerializer.Serialize(step.Payload)!)
            .ToList();

    /// <summary>
    /// The regression floor for the whole expansion: a pipeline whose only exchange is answered by the terminal still
    /// runs the primary workflow up to the send, and the answering handler is a workflow of its own. (The assembled
    /// version of this is
    /// <c>ProcessNextRequestFactoryTests.Create_MailboxPipeline_EndsMainWithTheSendStageAndEmitsNoConclusion</c>, which
    /// must not move. There are no Verify snapshots for the factory — every pin on it is an assertion.)
    /// </summary>
    [Fact]
    public void PlanSegment_PutsEachItemsOwnOptionsOnItsStep_AndNoneOnTheMint()
    {
        var stage = new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(1) };
        var send = new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(2) };
        var handler = new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(3) };
        var conclusion = new ProcessStepOptions { WaitBudget = TimeSpan.FromHours(4) };
        ServiceTaskPipeline pipeline = new PipelineBuilder()
            .Stage(PlainStage, stage)
            .Stage(SendStage, _threeDays, out MailboxHandle archive, send)
            .HandleReplies(archive, OnSegmentMessage, OnSegmentClosed, handler)
            .Finally(FinalWork, conclusion);

        ServiceTaskSegmentPlan primary = WorkflowStepSet.PlanSegment("archiving", pipeline);
        ServiceTaskSegmentPlan receive = WorkflowStepSet.PlanSegment("archiving", pipeline, afterItemIndex: 1);
        ServiceTaskSegmentPlan rest = WorkflowStepSet.PlanSegment("archiving", pipeline, afterItemIndex: 2);

        // The mint between the plain stage and the send carries nothing, so it inherits neither's options.
        Assert.Equal([stage, null, send], primary.Steps.Select(step => step.DeclaredOptions));
        Assert.Same(handler, Assert.Single(receive.Steps).DeclaredOptions);
        Assert.Same(conclusion, Assert.Single(rest.Steps).DeclaredOptions);
    }

    [Fact]
    public void PlanSegment_SingleExchangePipeline_EndsMainOnTheSendAndAnswersItInAWorkflowOfItsOwn()
    {
        ServiceTaskPipeline pipeline = new PipelineBuilder()
            .Stage(PlainStage)
            .Stage(SendStage, _threeDays, out MailboxHandle archive)
            .ConcludeOnReplies(archive, OnMessage, OnClosed);

        ServiceTaskSegmentPlan plan = WorkflowStepSet.PlanSegment("archiving", pipeline);

        Assert.Equal(
            [$"{ExecuteServiceTask.Key}: 0", $"{MintMailbox.Key}: 1", $"{ExecuteServiceTask.Key}: 1"],
            OperationIds(plan)
        );
        // The primary workflow is no receive workflow: the send ends its run, and what follows the send is worked out
        // when that step runs.
        Assert.Null(plan.ReceiveOpeningIndex);

        ServiceTaskSegmentPlan receive = WorkflowStepSet.PlanSegment("archiving", pipeline, afterItemIndex: 1);
        Assert.Equal([$"{ExecuteServiceTask.Key}: 2"], OperationIds(receive));
        Assert.Equal(1, receive.ReceiveOpeningIndex);
    }

    [Fact]
    public void PlanSegment_PipelineWithNoExchange_EndsWithTheConcludingStepAndNoReceive()
    {
        ServiceTaskPipeline pipeline = new PipelineBuilder().Stage(PlainStage).Finally(FinalWork);

        ServiceTaskSegmentPlan plan = WorkflowStepSet.PlanSegment("signing", pipeline);

        Assert.Equal([$"{ExecuteServiceTask.Key}: 0", $"{ExecuteServiceTask.Key}: 1"], OperationIds(plan));
        Assert.Null(plan.ReceiveOpeningIndex);
    }

    /// <summary>
    /// Segment 0 of a pipeline whose first exchange is answered mid-pipeline ends on the send: the handler
    /// composed right after it is no step of this run — it is a run of its own. Item indexes here: the send at
    /// 0, its handler at 1, a stage at 2, the second send at 3.
    /// </summary>
    [Fact]
    public void PlanSegment_EndsOnTheSendWhoseHandlerFollowsIt()
    {
        ServiceTaskPipeline pipeline = ArchiveThenJournalPipeline();

        ServiceTaskSegmentPlan plan = WorkflowStepSet.PlanSegment("archiving", pipeline);

        Assert.Equal([$"{MintMailbox.Key}: 0", $"{ExecuteServiceTask.Key}: 0"], OperationIds(plan));
        Assert.Null(plan.ReceiveOpeningIndex);
    }

    /// <summary>
    /// A reply handler the walk starts on is the run's only step, and the plan is a receive workflow naming
    /// the exchange it parks on. Both halves of "alone in its workflow" ride on this: the engine resolves the
    /// rendezvous for a workflow's first step only, and the handler's verdict decides whether anything after
    /// it runs.
    /// </summary>
    [Fact]
    public void PlanSegment_StartingOnAReplyHandler_IsThatHandlerAloneAndNamesItsExchange()
    {
        ServiceTaskPipeline pipeline = ArchiveThenJournalPipeline();

        ServiceTaskSegmentPlan plan = WorkflowStepSet.PlanSegment("archiving", pipeline, afterItemIndex: 0);

        Assert.Equal([$"{ExecuteServiceTask.Key}: 1"], OperationIds(plan));
        Assert.Equal(1, StageStepPayloads(plan)[0].ItemIndex);
        Assert.Equal(0, plan.ReceiveOpeningIndex);
    }

    [Fact]
    public void PlanSegment_AfterAHandler_RunsTheItemsBetweenItAndTheNextSend()
    {
        ServiceTaskPipeline pipeline = ArchiveThenJournalPipeline();

        ServiceTaskSegmentPlan plan = WorkflowStepSet.PlanSegment("archiving", pipeline, afterItemIndex: 1);

        Assert.Equal(
            [$"{ExecuteServiceTask.Key}: 2", $"{MintMailbox.Key}: 3", $"{ExecuteServiceTask.Key}: 3"],
            OperationIds(plan)
        );
        Assert.Null(plan.ReceiveOpeningIndex);
    }

    /// <summary>A mid-pipeline reply with trailing stages, ended by an ordinary <c>Finally</c>.</summary>
    [Fact]
    public void PlanSegment_AfterTheLastHandler_EndsWithTheConclusion()
    {
        ServiceTaskPipeline pipeline = new PipelineBuilder()
            .Stage(SendStage, _threeDays, out MailboxHandle archive)
            .HandleReplies(archive, OnSegmentMessage, OnSegmentClosed)
            .Stage(PlainStage)
            .Finally(FinalWork);

        ServiceTaskSegmentPlan plan = WorkflowStepSet.PlanSegment("archiving", pipeline, afterItemIndex: 1);

        Assert.Equal([$"{ExecuteServiceTask.Key}: 2", $"{ExecuteServiceTask.Key}: 3"], OperationIds(plan));
        Assert.Null(plan.ReceiveOpeningIndex);
    }

    /// <summary>
    /// The whole rule on one pipeline, walked segment by segment: a send ends its run, a plain stage ends its
    /// run only because the handler after it must be alone, and that handler's own run is the single step that
    /// receives. Item indexes: the send at 0, a plain stage at 1, the handler at 2, the conclusion at 3.
    /// </summary>
    [Fact]
    public void PlanSegment_APlainStageBeforeAHandler_EndsItsRunAndTheHandlerRunsAlone()
    {
        ServiceTaskPipeline pipeline = new PipelineBuilder()
            .Stage(SendStage, _threeDays, out MailboxHandle archive)
            .Stage(PlainStage)
            .HandleReplies(archive, OnSegmentMessage, OnSegmentClosed)
            .Finally(FinalWork);

        ServiceTaskSegmentPlan send = WorkflowStepSet.PlanSegment("archiving", pipeline);
        Assert.Equal([$"{MintMailbox.Key}: 0", $"{ExecuteServiceTask.Key}: 0"], OperationIds(send));
        Assert.Null(send.ReceiveOpeningIndex);

        // The stage between the send and the handler rides its own workflow and ends there — not because it
        // opened anything, but because the handler after it cannot share a workflow.
        ServiceTaskSegmentPlan between = WorkflowStepSet.PlanSegment("archiving", pipeline, afterItemIndex: 0);
        Assert.Equal([$"{ExecuteServiceTask.Key}: 1"], OperationIds(between));
        Assert.Null(between.ReceiveOpeningIndex);

        ServiceTaskSegmentPlan receive = WorkflowStepSet.PlanSegment("archiving", pipeline, afterItemIndex: 1);
        Assert.Equal([$"{ExecuteServiceTask.Key}: 2"], OperationIds(receive));
        Assert.Equal(0, receive.ReceiveOpeningIndex);

        ServiceTaskSegmentPlan rest = WorkflowStepSet.PlanSegment("archiving", pipeline, afterItemIndex: 2);
        Assert.Equal([$"{ExecuteServiceTask.Key}: 3"], OperationIds(rest));
        Assert.Null(rest.ReceiveOpeningIndex);
    }

    /// <summary>
    /// A mailbox-opening stage ends its segment even when the pipeline carries on with stages of its own: the
    /// stage's work may conclude the whole task, and a step's verdict can only do that while no later step of
    /// its workflow exists. Item indexes: a plain stage at 0, the send at 1, another plain stage at 2, the
    /// terminal that answers at 3.
    /// </summary>
    [Fact]
    public void PlanSegment_EndsAtAMailboxOpeningStage_EvenWithStagesComposedAfterIt()
    {
        ServiceTaskPipeline pipeline = new PipelineBuilder()
            .Stage(PlainStage)
            .Stage(SendStage, _threeDays, out MailboxHandle archive)
            .Stage(PlainStage)
            .ConcludeOnReplies(archive, OnMessage, OnClosed);

        ServiceTaskSegmentPlan plan = WorkflowStepSet.PlanSegment("archiving", pipeline);

        Assert.Equal(
            [$"{ExecuteServiceTask.Key}: 0", $"{MintMailbox.Key}: 1", $"{ExecuteServiceTask.Key}: 1"],
            OperationIds(plan)
        );
        Assert.Null(plan.ReceiveOpeningIndex);

        // And what follows the send is the trailing stage, which ends its own run because the terminal that
        // answers is composed right after it.
        ServiceTaskSegmentPlan next = WorkflowStepSet.PlanSegment("archiving", pipeline, afterItemIndex: 1);
        Assert.Equal([$"{ExecuteServiceTask.Key}: 2"], OperationIds(next));
        Assert.Null(next.ReceiveOpeningIndex);

        ServiceTaskSegmentPlan receive = WorkflowStepSet.PlanSegment("archiving", pipeline, afterItemIndex: 2);
        Assert.Equal([$"{ExecuteServiceTask.Key}: 3"], OperationIds(receive));
        Assert.Equal(1, receive.ReceiveOpeningIndex);
    }

    /// <summary>
    /// Both sends composed before either handler: each send ends its own segment, so the second mint rides the
    /// continuation the first send's completion enqueues — and that continuation is what hands over to the
    /// first exchange's receiver. Two handlers composed back to back are simply two runs. Item indexes: the
    /// sends at 0 and 1, the first handler at 2, the terminal at 3.
    /// </summary>
    [Fact]
    public void PlanSegment_UpFrontSends_RidesOneSegmentPerSend_ThenOnePerHandler()
    {
        ServiceTaskPipeline pipeline = new PipelineBuilder()
            .Stage(SendStage, _threeDays, out MailboxHandle archive)
            .Stage(SendStage, _threeDays, out MailboxHandle journal)
            .HandleReplies(archive, OnSegmentMessage, OnSegmentClosed)
            .ConcludeOnReplies(journal, OnMessage, OnClosed);

        ServiceTaskSegmentPlan first = WorkflowStepSet.PlanSegment("archiving", pipeline);
        Assert.Equal([$"{MintMailbox.Key}: 0", $"{ExecuteServiceTask.Key}: 0"], OperationIds(first));
        Assert.Null(first.ReceiveOpeningIndex);

        ServiceTaskSegmentPlan second = WorkflowStepSet.PlanSegment("archiving", pipeline, afterItemIndex: 0);
        Assert.Equal([$"{MintMailbox.Key}: 1", $"{ExecuteServiceTask.Key}: 1"], OperationIds(second));
        Assert.Null(second.ReceiveOpeningIndex);

        // The handler that answers the *first* exchange follows the second send, so the second send's
        // completion is what starts exchange 0's receive leg.
        ServiceTaskSegmentPlan archiveReceive = WorkflowStepSet.PlanSegment("archiving", pipeline, afterItemIndex: 1);
        Assert.Equal([$"{ExecuteServiceTask.Key}: 2"], OperationIds(archiveReceive));
        Assert.Equal(0, archiveReceive.ReceiveOpeningIndex);

        // Two handlers back to back: the run after the first is the second, alone, on the other exchange.
        ServiceTaskSegmentPlan journalReceive = WorkflowStepSet.PlanSegment("archiving", pipeline, afterItemIndex: 2);
        Assert.Equal([$"{ExecuteServiceTask.Key}: 3"], OperationIds(journalReceive));
        Assert.Equal(1, journalReceive.ReceiveOpeningIndex);
    }

    /// <summary>
    /// Handler order is exchange order, and it is the author's choice: answering B before A is legal once both
    /// stages precede both handlers, and each handler's run parks on the exchange that handler answers rather
    /// than on the one the preceding send opened. Item indexes: the sends at 0 and 1, the handlers at 2
    /// (journal's) and 3 (archive's).
    /// </summary>
    [Fact]
    public void PlanSegment_HandlerOrderRatherThanSendOrder_DecidesTheSegments()
    {
        ServiceTaskPipeline pipeline = new PipelineBuilder()
            .Stage(SendStage, _threeDays, out MailboxHandle archive)
            .Stage(SendStage, _threeDays, out MailboxHandle journal)
            .HandleReplies(journal, OnSegmentMessage, OnSegmentClosed)
            .HandleReplies(archive, OnSegmentMessage, OnSegmentClosed)
            .Finally(FinalWork);

        // Each send ends a segment and parks on nothing; the receive workflows come after them, journal's
        // first because its handler is composed first.
        Assert.Null(WorkflowStepSet.PlanSegment("archiving", pipeline).ReceiveOpeningIndex);
        Assert.Null(WorkflowStepSet.PlanSegment("archiving", pipeline, afterItemIndex: 0).ReceiveOpeningIndex);
        Assert.Equal(1, WorkflowStepSet.PlanSegment("archiving", pipeline, afterItemIndex: 1).ReceiveOpeningIndex);
        Assert.Equal(0, WorkflowStepSet.PlanSegment("archiving", pipeline, afterItemIndex: 2).ReceiveOpeningIndex);
        Assert.Null(WorkflowStepSet.PlanSegment("archiving", pipeline, afterItemIndex: 3).ReceiveOpeningIndex);
    }

    /// <summary>
    /// The whole serialized payload of every step the planner emits, pinned exactly: an
    /// <c>ExecuteServiceTask</c> payload is the service task and the one item the step runs, and nothing else.
    /// Pinned on the serialized shape rather than on a property being null, because the shape is what a
    /// workflow enqueued by this version replays from — and because a pin on the whole string fails for a
    /// field <em>added</em> too, which is the direction that would put a hand-over back in a payload.
    /// </summary>
    [Fact]
    public void PlanSegment_StepPayloads_AreTheItemIndexAndNothingElse()
    {
        ServiceTaskPipeline pipeline = ArchiveThenJournalPipeline();

        ServiceTaskSegmentPlan plan = WorkflowStepSet.PlanSegment("archiving", pipeline, afterItemIndex: 1);

        Assert.Equal(
            [
                "{\"$type\":\"executeServiceTask\",\"serviceTaskType\":\"archiving\",\"itemIndex\":2}",
                "{\"$type\":\"executeServiceTask\",\"serviceTaskType\":\"archiving\",\"itemIndex\":3}",
            ],
            StageStepPayloadJson(plan)
        );
    }

    /// <summary>
    /// The derivation every workflow's last step makes instead of reading a baked answer: only a reply handler
    /// starts a workflow of its own, so only a reply handler ends the run of the item before it.
    /// </summary>
    [Fact]
    public void ItemStartsItsOwnWorkflow_IsTrueForReplyHandlersOnly()
    {
        ServiceTaskPipeline pipeline = ArchiveThenJournalPipeline();

        // The send at 0, the mid-pipeline handler at 1, a stage at 2, the second send at 3, the terminal at 4.
        Assert.False(WorkflowStepSet.ItemStartsItsOwnWorkflow(pipeline, 0));
        Assert.True(WorkflowStepSet.ItemStartsItsOwnWorkflow(pipeline, 1));
        Assert.False(WorkflowStepSet.ItemStartsItsOwnWorkflow(pipeline, 2));
        Assert.False(WorkflowStepSet.ItemStartsItsOwnWorkflow(pipeline, 3));
        Assert.True(WorkflowStepSet.ItemStartsItsOwnWorkflow(pipeline, 4));
        // Past the end: the last item is the conclusion, and it starts nothing.
        Assert.False(WorkflowStepSet.ItemStartsItsOwnWorkflow(pipeline, 5));
    }

    /// <summary>
    /// The one way a plan can come back empty — and one no well-formed pipeline reaches, since <c>Items</c>
    /// always ends with a conclusion and a conclusion starts nothing. Not a throw: the hop that asks is inside
    /// a step's verdict, and it refuses permanently rather than enqueue a workflow with no steps — see
    /// <c>MailboxRelayTests.StageEnd_WithNothingComposedAfterTheStage_FailsPermanently</c>.
    /// </summary>
    [Fact]
    public void PlanSegment_StartingPastTheLastItem_PlansNothing()
    {
        ServiceTaskPipeline pipeline = ArchiveThenJournalPipeline();
        int lastIndex = pipeline.Items.Count - 1;

        ServiceTaskSegmentPlan plan = WorkflowStepSet.PlanSegment("archiving", pipeline, afterItemIndex: lastIndex);

        Assert.Empty(plan.Steps);
        Assert.Null(plan.ReceiveOpeningIndex);
    }

    private static ServiceTaskPipeline ArchiveThenJournalPipeline() =>
        new PipelineBuilder()
            .Stage(SendStage, _threeDays, out MailboxHandle archive)
            .HandleReplies(archive, OnSegmentMessage, OnSegmentClosed)
            .Stage(PlainStage)
            .Stage(SendStage, _threeDays, out MailboxHandle journal)
            .ConcludeOnReplies(journal, OnMessage, OnClosed);
}
