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

public class WorkflowCommandSetTests
{
    private static List<string> Keys(IReadOnlyList<StepRequest> steps) =>
        steps.Select(s => JsonSerializer.Deserialize<AppCommandData>(s.Command.Data!.Value)!.CommandKey).ToList();

    /// <summary>The pipeline a simple service task forwards to: the conclusion and nothing else.</summary>
    private static ServiceTaskPipeline ConclusionOnlyPipeline() =>
        new ServiceTaskPipelineBuilder().Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));

    [Fact]
    public void GetTaskStartSteps_ServiceTaskInstantiation_RoutesCommandsToTheCorrectBuckets()
    {
        var commandSet = WorkflowCommandSet.GetTaskStartSteps(
            new TaskStartContext
            {
                TaskId = "Task_1",
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
                TaskId = "Task_1",
                ServiceTask = null,
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
        var commandSet = WorkflowCommandSet.GetProcessEndSteps(new ProcessEndContext { RegisterEvents = true });

        // The end hook runs pre-commit; the configured cleanup/hard delete is staged by
        // CommitProcessState into the commit save itself.
        Assert.Equal([OnProcessEndingHook.Key, EndProcessLegacyHook.Key], Keys(commandSet.Commands));

        Assert.Empty(commandSet.CriticalPostCommitCommands);

        Assert.Equal([CompletedAltinnEvent.Key], Keys(commandSet.SideEffectCommands));
    }

    [Fact]
    public void GetTaskEndSteps_HasNoPostCommitCommands()
    {
        var commandSet = WorkflowCommandSet.GetTaskEndSteps("Task_1");

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

    // ---------------------------------------------------------------------------------------------
    // The segment planner: the items split at each reply handler and at each mailbox-opening stage,
    // each segment ended by its own hand-over.
    // ---------------------------------------------------------------------------------------------

    private static readonly MailboxOptions _threeDays = new() { Timeout = TimeSpan.FromDays(3) };

    private static Task<ServiceTaskStageResult> PlainStage(ServiceTaskContext context) =>
        Task.FromResult(ServiceTaskStageResult.Completed());

    private static Task<ServiceTaskOpeningStageResult> SendStage(
        ServiceTaskContext context,
        ServiceTaskMailbox mailbox
    ) => Task.FromResult(ServiceTaskOpeningStageResult.Completed());

    private static Task<ServiceTaskExchangeResult> OnMessage(ServiceTaskContext context, ServiceTaskReply reply) =>
        Task.FromResult<ServiceTaskExchangeResult>(ServiceTaskResult.Success());

    private static Task<ServiceTaskResult> OnClosed(ServiceTaskContext context, MailboxClosedReason reason) =>
        Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());

    private static Task<ServiceTaskStageExchangeResult> OnSegmentMessage(
        ServiceTaskContext context,
        ServiceTaskReply reply
    ) => Task.FromResult<ServiceTaskStageExchangeResult>(ServiceTaskStageResult.Completed());

    private static Task<ServiceTaskStageResult> OnSegmentClosed(
        ServiceTaskContext context,
        MailboxClosedReason reason
    ) => Task.FromResult(ServiceTaskStageResult.Completed());

    private static Task<ServiceTaskResult> FinalWork(ServiceTaskContext context) =>
        Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());

    private static List<string> OperationIds(ServiceTaskSegmentPlan plan) =>
        plan.Steps.Select(step => step.OperationId).ToList();

    /// <summary>The payloads of the plan's <c>ExecuteServiceTask</c> steps, in order.</summary>
    private static List<ExecuteServiceTaskPayload> StageStepPayloads(ServiceTaskSegmentPlan plan) =>
        plan
            .Steps.Where(step => step.CommandKey == ExecuteServiceTask.Key)
            .Select(step =>
            {
                var appData = JsonSerializer.Deserialize<AppCommandData>(step.Command.Data!.Value)!;
                return CommandPayloadSerializer.Deserialize<ExecuteServiceTaskPayload>(appData.Payload)!;
            })
            .ToList();

    /// <summary>The raw JSON of the plan's <c>ExecuteServiceTask</c> step payloads, in order.</summary>
    private static List<string> StageStepPayloadJson(ServiceTaskSegmentPlan plan) =>
        plan
            .Steps.Where(step => step.CommandKey == ExecuteServiceTask.Key)
            .Select(step => JsonSerializer.Deserialize<AppCommandData>(step.Command.Data!.Value)!.Payload!)
            .ToList();

    /// <summary>
    /// The regression floor for the whole expansion: a pipeline whose only exchange is answered by the
    /// terminal still runs Main up to the send, and the answering handler is a workflow of its own. (The
    /// assembled version of this is
    /// <c>ProcessNextRequestFactoryTests.Create_MailboxPipeline_EndsMainWithTheSendStageAndEmitsNoConclusion</c>,
    /// which must not move. There are no Verify snapshots for the factory — every pin on it is an assertion.)
    /// </summary>
    [Fact]
    public void PlanSegment_SingleExchangePipeline_EndsMainOnTheSendAndAnswersItInAWorkflowOfItsOwn()
    {
        ServiceTaskPipeline pipeline = new ServiceTaskPipelineBuilder()
            .Stage(PlainStage)
            .Stage(SendStage, _threeDays, out MailboxHandle archive)
            .ConcludeOnReplies(archive, OnMessage, OnClosed);

        ServiceTaskSegmentPlan plan = WorkflowCommandSet.PlanSegment("archiving", pipeline);

        Assert.Equal(
            [$"{ExecuteServiceTask.Key}: 0", $"{MintMailbox.Key}: 1", $"{ExecuteServiceTask.Key}: 1"],
            OperationIds(plan)
        );
        // Main is no receive workflow: the send ends its run, and what follows the send is worked out when
        // that step runs.
        Assert.Null(plan.ReceiveOpeningIndex);

        ServiceTaskSegmentPlan receive = WorkflowCommandSet.PlanSegment("archiving", pipeline, afterItemIndex: 1);
        Assert.Equal([$"{ExecuteServiceTask.Key}: 2"], OperationIds(receive));
        Assert.Equal(1, receive.ReceiveOpeningIndex);
    }

    [Fact]
    public void PlanSegment_PipelineWithNoExchange_EndsWithTheConcludingStepAndNoReceive()
    {
        ServiceTaskPipeline pipeline = new ServiceTaskPipelineBuilder().Stage(PlainStage).Finally(FinalWork);

        ServiceTaskSegmentPlan plan = WorkflowCommandSet.PlanSegment("signing", pipeline);

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

        ServiceTaskSegmentPlan plan = WorkflowCommandSet.PlanSegment("archiving", pipeline);

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

        ServiceTaskSegmentPlan plan = WorkflowCommandSet.PlanSegment("archiving", pipeline, afterItemIndex: 0);

        Assert.Equal([$"{ExecuteServiceTask.Key}: 1"], OperationIds(plan));
        Assert.Equal(1, StageStepPayloads(plan)[0].ItemIndex);
        Assert.Equal(0, plan.ReceiveOpeningIndex);
    }

    [Fact]
    public void PlanSegment_AfterAHandler_RunsTheItemsBetweenItAndTheNextSend()
    {
        ServiceTaskPipeline pipeline = ArchiveThenJournalPipeline();

        ServiceTaskSegmentPlan plan = WorkflowCommandSet.PlanSegment("archiving", pipeline, afterItemIndex: 1);

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
        ServiceTaskPipeline pipeline = new ServiceTaskPipelineBuilder()
            .Stage(SendStage, _threeDays, out MailboxHandle archive)
            .HandleReplies(archive, OnSegmentMessage, OnSegmentClosed)
            .Stage(PlainStage)
            .Finally(FinalWork);

        ServiceTaskSegmentPlan plan = WorkflowCommandSet.PlanSegment("archiving", pipeline, afterItemIndex: 1);

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
        ServiceTaskPipeline pipeline = new ServiceTaskPipelineBuilder()
            .Stage(SendStage, _threeDays, out MailboxHandle archive)
            .Stage(PlainStage)
            .HandleReplies(archive, OnSegmentMessage, OnSegmentClosed)
            .Finally(FinalWork);

        ServiceTaskSegmentPlan send = WorkflowCommandSet.PlanSegment("archiving", pipeline);
        Assert.Equal([$"{MintMailbox.Key}: 0", $"{ExecuteServiceTask.Key}: 0"], OperationIds(send));
        Assert.Null(send.ReceiveOpeningIndex);

        // The stage between the send and the handler rides its own workflow and ends there — not because it
        // opened anything, but because the handler after it cannot share a workflow.
        ServiceTaskSegmentPlan between = WorkflowCommandSet.PlanSegment("archiving", pipeline, afterItemIndex: 0);
        Assert.Equal([$"{ExecuteServiceTask.Key}: 1"], OperationIds(between));
        Assert.Null(between.ReceiveOpeningIndex);

        ServiceTaskSegmentPlan receive = WorkflowCommandSet.PlanSegment("archiving", pipeline, afterItemIndex: 1);
        Assert.Equal([$"{ExecuteServiceTask.Key}: 2"], OperationIds(receive));
        Assert.Equal(0, receive.ReceiveOpeningIndex);

        ServiceTaskSegmentPlan rest = WorkflowCommandSet.PlanSegment("archiving", pipeline, afterItemIndex: 2);
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
        ServiceTaskPipeline pipeline = new ServiceTaskPipelineBuilder()
            .Stage(PlainStage)
            .Stage(SendStage, _threeDays, out MailboxHandle archive)
            .Stage(PlainStage)
            .ConcludeOnReplies(archive, OnMessage, OnClosed);

        ServiceTaskSegmentPlan plan = WorkflowCommandSet.PlanSegment("archiving", pipeline);

        Assert.Equal(
            [$"{ExecuteServiceTask.Key}: 0", $"{MintMailbox.Key}: 1", $"{ExecuteServiceTask.Key}: 1"],
            OperationIds(plan)
        );
        Assert.Null(plan.ReceiveOpeningIndex);

        // And what follows the send is the trailing stage, which ends its own run because the terminal that
        // answers is composed right after it.
        ServiceTaskSegmentPlan next = WorkflowCommandSet.PlanSegment("archiving", pipeline, afterItemIndex: 1);
        Assert.Equal([$"{ExecuteServiceTask.Key}: 2"], OperationIds(next));
        Assert.Null(next.ReceiveOpeningIndex);

        ServiceTaskSegmentPlan receive = WorkflowCommandSet.PlanSegment("archiving", pipeline, afterItemIndex: 2);
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
        ServiceTaskPipeline pipeline = new ServiceTaskPipelineBuilder()
            .Stage(SendStage, _threeDays, out MailboxHandle archive)
            .Stage(SendStage, _threeDays, out MailboxHandle journal)
            .HandleReplies(archive, OnSegmentMessage, OnSegmentClosed)
            .ConcludeOnReplies(journal, OnMessage, OnClosed);

        ServiceTaskSegmentPlan first = WorkflowCommandSet.PlanSegment("archiving", pipeline);
        Assert.Equal([$"{MintMailbox.Key}: 0", $"{ExecuteServiceTask.Key}: 0"], OperationIds(first));
        Assert.Null(first.ReceiveOpeningIndex);

        ServiceTaskSegmentPlan second = WorkflowCommandSet.PlanSegment("archiving", pipeline, afterItemIndex: 0);
        Assert.Equal([$"{MintMailbox.Key}: 1", $"{ExecuteServiceTask.Key}: 1"], OperationIds(second));
        Assert.Null(second.ReceiveOpeningIndex);

        // The handler that answers the *first* exchange follows the second send, so the second send's
        // completion is what starts exchange 0's receive leg.
        ServiceTaskSegmentPlan archiveReceive = WorkflowCommandSet.PlanSegment(
            "archiving",
            pipeline,
            afterItemIndex: 1
        );
        Assert.Equal([$"{ExecuteServiceTask.Key}: 2"], OperationIds(archiveReceive));
        Assert.Equal(0, archiveReceive.ReceiveOpeningIndex);

        // Two handlers back to back: the run after the first is the second, alone, on the other exchange.
        ServiceTaskSegmentPlan journalReceive = WorkflowCommandSet.PlanSegment(
            "archiving",
            pipeline,
            afterItemIndex: 2
        );
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
        ServiceTaskPipeline pipeline = new ServiceTaskPipelineBuilder()
            .Stage(SendStage, _threeDays, out MailboxHandle archive)
            .Stage(SendStage, _threeDays, out MailboxHandle journal)
            .HandleReplies(journal, OnSegmentMessage, OnSegmentClosed)
            .HandleReplies(archive, OnSegmentMessage, OnSegmentClosed)
            .Finally(FinalWork);

        // Each send ends a segment and parks on nothing; the receive workflows come after them, journal's
        // first because its handler is composed first.
        Assert.Null(WorkflowCommandSet.PlanSegment("archiving", pipeline).ReceiveOpeningIndex);
        Assert.Null(WorkflowCommandSet.PlanSegment("archiving", pipeline, afterItemIndex: 0).ReceiveOpeningIndex);
        Assert.Equal(1, WorkflowCommandSet.PlanSegment("archiving", pipeline, afterItemIndex: 1).ReceiveOpeningIndex);
        Assert.Equal(0, WorkflowCommandSet.PlanSegment("archiving", pipeline, afterItemIndex: 2).ReceiveOpeningIndex);
        Assert.Null(WorkflowCommandSet.PlanSegment("archiving", pipeline, afterItemIndex: 3).ReceiveOpeningIndex);
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

        ServiceTaskSegmentPlan plan = WorkflowCommandSet.PlanSegment("archiving", pipeline, afterItemIndex: 1);

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
        Assert.False(WorkflowCommandSet.ItemStartsItsOwnWorkflow(pipeline, 0));
        Assert.True(WorkflowCommandSet.ItemStartsItsOwnWorkflow(pipeline, 1));
        Assert.False(WorkflowCommandSet.ItemStartsItsOwnWorkflow(pipeline, 2));
        Assert.False(WorkflowCommandSet.ItemStartsItsOwnWorkflow(pipeline, 3));
        Assert.True(WorkflowCommandSet.ItemStartsItsOwnWorkflow(pipeline, 4));
        // Past the end: the last item is the conclusion, and it starts nothing.
        Assert.False(WorkflowCommandSet.ItemStartsItsOwnWorkflow(pipeline, 5));
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

        ServiceTaskSegmentPlan plan = WorkflowCommandSet.PlanSegment("archiving", pipeline, afterItemIndex: lastIndex);

        Assert.Empty(plan.Steps);
        Assert.Null(plan.ReceiveOpeningIndex);
    }

    private static ServiceTaskPipeline ArchiveThenJournalPipeline() =>
        new ServiceTaskPipelineBuilder()
            .Stage(SendStage, _threeDays, out MailboxHandle archive)
            .HandleReplies(archive, OnSegmentMessage, OnSegmentClosed)
            .Stage(PlainStage)
            .Stage(SendStage, _threeDays, out MailboxHandle journal)
            .ConcludeOnReplies(journal, OnMessage, OnClosed);
}
