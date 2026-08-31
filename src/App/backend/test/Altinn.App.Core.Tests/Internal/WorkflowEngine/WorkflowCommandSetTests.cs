using System.Diagnostics;
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

    /// <summary>
    /// The regression floor for the whole expansion: a pipeline with no mid-pipeline handler has exactly one
    /// segment, and it is what the factory has always built — each step carrying its item index. (The
    /// assembled version of this is
    /// <c>ProcessNextRequestFactoryTests.Create_MailboxPipeline_EndsMainWithTheSendStageAndEmitsNoConclusion</c>,
    /// which must not move. There are no Verify snapshots for the factory — every pin on it is an assertion.)
    /// </summary>
    [Fact]
    public void PlanSegment_SingleExchangePipeline_IsOneSegmentEndingOnTheTerminalsExchange()
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
        Assert.Equal(1, plan.Receive?.OpeningStageIndex);
    }

    [Fact]
    public void PlanSegment_PipelineWithNoExchange_EndsWithTheConcludingStepAndNoReceive()
    {
        ServiceTaskPipeline pipeline = new ServiceTaskPipelineBuilder().Stage(PlainStage).Finally(FinalWork);

        ServiceTaskSegmentPlan plan = WorkflowCommandSet.PlanSegment("signing", pipeline);

        Assert.Equal([$"{ExecuteServiceTask.Key}: 0", $"{ExecuteServiceTask.Key}: 1"], OperationIds(plan));
        Assert.Null(plan.Receive);
    }

    /// <summary>
    /// Segment 0 of a pipeline whose first exchange is answered mid-pipeline stops at that handler, which is
    /// no step at all — it runs on the receive workflows. Item indexes here: the send at 0, its handler at 1,
    /// a stage at 2, the second send at 3.
    /// </summary>
    [Fact]
    public void PlanSegment_StopsAtTheFirstReplyHandler()
    {
        ServiceTaskPipeline pipeline = ArchiveThenJournalPipeline();

        ServiceTaskSegmentPlan plan = WorkflowCommandSet.PlanSegment("archiving", pipeline);

        Assert.Equal([$"{MintMailbox.Key}: 0", $"{ExecuteServiceTask.Key}: 0"], OperationIds(plan));
        Assert.Equal(0, plan.Receive?.OpeningStageIndex);
    }

    [Fact]
    public void PlanSegment_AfterAHandler_RunsTheItemsBetweenItAndTheNextExchange()
    {
        ServiceTaskPipeline pipeline = ArchiveThenJournalPipeline();

        ServiceTaskSegmentPlan plan = WorkflowCommandSet.PlanSegment("archiving", pipeline, afterItemIndex: 1);

        Assert.Equal(
            [$"{ExecuteServiceTask.Key}: 2", $"{MintMailbox.Key}: 3", $"{ExecuteServiceTask.Key}: 3"],
            OperationIds(plan)
        );
        Assert.Equal(3, plan.Receive?.OpeningStageIndex);
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
        Assert.Null(plan.Receive);
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
        // No exchange hand-over: what follows the stage is the pipeline's own next item, so the stage's
        // completion enqueues the segment carrying it rather than a receiver.
        Assert.Null(plan.Receive);
        Assert.Null(StageStepPayloads(plan)[^1].Receive);

        // And that segment is the trailing stage, ended by the exchange the terminal answers.
        ServiceTaskSegmentPlan next = WorkflowCommandSet.PlanSegment("archiving", pipeline, afterItemIndex: 1);
        Assert.Equal([$"{ExecuteServiceTask.Key}: 2"], OperationIds(next));
        Assert.Equal(3, next.Receive?.HandlerItemIndex);
        Assert.Equal(1, next.Receive?.OpeningStageIndex);
    }

    /// <summary>
    /// Both sends composed before either handler: each send ends its own segment, so the second mint rides the
    /// continuation the first send's completion enqueues — and that continuation is what hands over to the
    /// first exchange's receiver. The segment after the first handler is still a bare hand-over. Item indexes:
    /// the sends at 0 and 1, the first handler at 2, the terminal at 3.
    /// </summary>
    [Fact]
    public void PlanSegment_UpFrontSends_RidesOneSegmentPerSend_AndLeavesTheSegmentAfterTheHandlerEmpty()
    {
        ServiceTaskPipeline pipeline = new ServiceTaskPipelineBuilder()
            .Stage(SendStage, _threeDays, out MailboxHandle archive)
            .Stage(SendStage, _threeDays, out MailboxHandle journal)
            .HandleReplies(archive, OnSegmentMessage, OnSegmentClosed)
            .ConcludeOnReplies(journal, OnMessage, OnClosed);

        ServiceTaskSegmentPlan first = WorkflowCommandSet.PlanSegment("archiving", pipeline);
        Assert.Equal([$"{MintMailbox.Key}: 0", $"{ExecuteServiceTask.Key}: 0"], OperationIds(first));
        // The second send is composed next, so the first send hands over to the segment carrying it — not to
        // its own exchange's receiver, whose handler is two items further on.
        Assert.Null(first.Receive);

        ServiceTaskSegmentPlan second = WorkflowCommandSet.PlanSegment("archiving", pipeline, afterItemIndex: 0);
        Assert.Equal([$"{MintMailbox.Key}: 1", $"{ExecuteServiceTask.Key}: 1"], OperationIds(second));
        // The handler that answers the *first* exchange follows the second send, so this is the hop that
        // starts exchange 0's receive leg.
        Assert.Equal(2, second.Receive?.HandlerItemIndex);
        Assert.Equal(0, second.Receive?.OpeningStageIndex);

        ServiceTaskSegmentPlan third = WorkflowCommandSet.PlanSegment("archiving", pipeline, afterItemIndex: 2);
        Assert.Empty(third.Steps);
        Assert.Equal(1, third.Receive?.OpeningStageIndex);
    }

    /// <summary>
    /// Handler order is exchange order, and it is the author's choice: answering B before A is legal once both
    /// stages precede both handlers, and the segments after the sends follow the handlers rather than the
    /// sends. Item indexes: the sends at 0 and 1, the handlers at 2 (journal's) and 3 (archive's).
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

        // Each send ends a segment; the send composed second is the one the first handler follows, so it
        // hands over to the journal's exchange — the one answered first.
        Assert.Null(WorkflowCommandSet.PlanSegment("archiving", pipeline).Receive);
        Assert.Equal(
            1,
            WorkflowCommandSet.PlanSegment("archiving", pipeline, afterItemIndex: 0).Receive?.OpeningStageIndex
        );
        Assert.Equal(
            0,
            WorkflowCommandSet.PlanSegment("archiving", pipeline, afterItemIndex: 2).Receive?.OpeningStageIndex
        );
        Assert.Null(WorkflowCommandSet.PlanSegment("archiving", pipeline, afterItemIndex: 3).Receive);
    }

    [Fact]
    public void PlanSegment_ReceiveHalf_IsNamedByTheHandlersItemIndex()
    {
        ServiceTaskPipeline pipeline = ArchiveThenJournalPipeline();

        // Segment 0 ends on the mid-pipeline handler at item index 1; the last segment on the terminal at 4.
        Assert.Equal(1, WorkflowCommandSet.PlanSegment("archiving", pipeline).Receive?.HandlerItemIndex);
        Assert.Equal(
            4,
            WorkflowCommandSet.PlanSegment("archiving", pipeline, afterItemIndex: 1).Receive?.HandlerItemIndex
        );
    }

    /// <summary>
    /// The plan's <c>Receive</c> also rides the segment's last step's payload, fixed at planning time:
    /// completing that step is what enqueues the exchange's first receiver.
    /// </summary>
    [Fact]
    public void PlanSegment_BakesTheReceiveIntoTheLastStageStepsPayloadAndNoOthers()
    {
        ServiceTaskPipeline pipeline = ArchiveThenJournalPipeline();

        ServiceTaskSegmentPlan plan = WorkflowCommandSet.PlanSegment("archiving", pipeline, afterItemIndex: 1);

        List<ExecuteServiceTaskPayload> payloads = StageStepPayloads(plan);

        Assert.Equal(2, payloads.Count);
        Assert.Null(payloads[0].Receive);
        Assert.Equal(plan.Receive, payloads[1].Receive);
    }

    [Fact]
    public void PlanSegment_StartingPastTheLastItem_ThrowsRatherThanPlanningNothing()
    {
        ServiceTaskPipeline pipeline = ArchiveThenJournalPipeline();
        int lastIndex = pipeline.Items.Count - 1;

        UnreachableException thrown = Assert.Throws<UnreachableException>(() =>
            WorkflowCommandSet.PlanSegment("archiving", pipeline, afterItemIndex: lastIndex)
        );

        Assert.Contains("reaches no conclusion", thrown.Message, StringComparison.Ordinal);
        Assert.Contains("Define did not return the same pipeline", thrown.Message, StringComparison.Ordinal);
    }

    private static ServiceTaskPipeline ArchiveThenJournalPipeline() =>
        new ServiceTaskPipelineBuilder()
            .Stage(SendStage, _threeDays, out MailboxHandle archive)
            .HandleReplies(archive, OnSegmentMessage, OnSegmentClosed)
            .Stage(PlainStage)
            .Stage(SendStage, _threeDays, out MailboxHandle journal)
            .ConcludeOnReplies(journal, OnMessage, OnClosed);
}
