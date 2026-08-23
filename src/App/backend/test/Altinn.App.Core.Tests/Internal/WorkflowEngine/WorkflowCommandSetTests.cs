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
    // The segment planner: the items split at each reply handler, each segment ended by its own hand-over.
    // ---------------------------------------------------------------------------------------------

    private static readonly MailboxOptions _threeDays = new() { Timeout = TimeSpan.FromDays(3) };

    private static Task<ServiceTaskStageResult> PlainStage(ServiceTaskContext context) =>
        Task.FromResult(ServiceTaskStageResult.Completed());

    private static Task<ServiceTaskStageResult> SendStage(ServiceTaskContext context, ServiceTaskMailbox mailbox) =>
        Task.FromResult(ServiceTaskStageResult.Completed());

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

    /// <summary>
    /// The regression floor for the whole expansion: a pipeline with no mid-pipeline handler has exactly one
    /// segment, and it is what the factory has always built. (The byte-level version of this is the factory's
    /// own snapshots, which must not move.)
    /// </summary>
    [Fact]
    public void PlanSegment_SingleExchangePipeline_IsOneSegmentEndingOnTheTerminalsExchange()
    {
        ServiceTaskPipeline pipeline = new ServiceTaskPipelineBuilder()
            .Stage("PrepareDocuments", PlainStage)
            .Stage("SendToArchive", SendStage, _threeDays, out MailboxHandle archive)
            .ConcludeOnReplies(archive, OnMessage, OnClosed);

        ServiceTaskSegmentPlan plan = WorkflowCommandSet.PlanSegment("archiving", pipeline);

        Assert.Equal(
            [
                $"{ExecuteServiceTask.Key}: PrepareDocuments",
                $"{MintMailbox.Key}: SendToArchive",
                $"{ExecuteServiceTask.Key}: SendToArchive",
            ],
            OperationIds(plan)
        );
        Assert.Equal("SendToArchive", plan.Receive?.OpeningStageName);
    }

    [Fact]
    public void PlanSegment_PipelineWithNoExchange_EndsWithTheConcludingStepAndNoReceive()
    {
        ServiceTaskPipeline pipeline = new ServiceTaskPipelineBuilder()
            .Stage("Dispatch", PlainStage)
            .Finally(FinalWork);

        ServiceTaskSegmentPlan plan = WorkflowCommandSet.PlanSegment("signing", pipeline);

        Assert.Equal([$"{ExecuteServiceTask.Key}: Dispatch", ExecuteServiceTask.Key], OperationIds(plan));
        Assert.Null(plan.Receive);
    }

    /// <summary>
    /// Segment 0 of a pipeline whose first exchange is answered mid-pipeline stops at that handler: everything
    /// composed after it belongs to the segment that exchange's conclusion starts, and the handler itself is
    /// no step at all — it runs on the receive workflows.
    /// </summary>
    [Fact]
    public void PlanSegment_StopsAtTheFirstReplyHandler()
    {
        ServiceTaskPipeline pipeline = new ServiceTaskPipelineBuilder()
            .Stage("SendToArchive", SendStage, _threeDays, out MailboxHandle archive)
            .HandleReplies(archive, OnSegmentMessage, OnSegmentClosed)
            .Stage("RecordArchive", PlainStage)
            .Stage("SendToJournal", SendStage, _threeDays, out MailboxHandle journal)
            .ConcludeOnReplies(journal, OnMessage, OnClosed);

        ServiceTaskSegmentPlan plan = WorkflowCommandSet.PlanSegment("archiving", pipeline);

        Assert.Equal(
            [$"{MintMailbox.Key}: SendToArchive", $"{ExecuteServiceTask.Key}: SendToArchive"],
            OperationIds(plan)
        );
        Assert.Equal("SendToArchive", plan.Receive?.OpeningStageName);
    }

    [Fact]
    public void PlanSegment_AfterAHandler_RunsTheItemsBetweenItAndTheNextExchange()
    {
        ServiceTaskPipeline pipeline = new ServiceTaskPipelineBuilder()
            .Stage("SendToArchive", SendStage, _threeDays, out MailboxHandle archive)
            .HandleReplies(archive, OnSegmentMessage, OnSegmentClosed)
            .Stage("RecordArchive", PlainStage)
            .Stage("SendToJournal", SendStage, _threeDays, out MailboxHandle journal)
            .ConcludeOnReplies(journal, OnMessage, OnClosed);

        ServiceTaskSegmentPlan plan = WorkflowCommandSet.PlanSegment(
            "archiving",
            pipeline,
            afterExchange: "SendToArchive"
        );

        Assert.Equal(
            [
                $"{ExecuteServiceTask.Key}: RecordArchive",
                $"{MintMailbox.Key}: SendToJournal",
                $"{ExecuteServiceTask.Key}: SendToJournal",
            ],
            OperationIds(plan)
        );
        Assert.Equal("SendToJournal", plan.Receive?.OpeningStageName);
    }

    /// <summary>A mid-pipeline reply with trailing stages, ended by an ordinary <c>Finally</c>.</summary>
    [Fact]
    public void PlanSegment_AfterTheLastHandler_EndsWithTheConclusion()
    {
        ServiceTaskPipeline pipeline = new ServiceTaskPipelineBuilder()
            .Stage("SendToArchive", SendStage, _threeDays, out MailboxHandle archive)
            .HandleReplies(archive, OnSegmentMessage, OnSegmentClosed)
            .Stage("RecordArchive", PlainStage)
            .Finally(FinalWork);

        ServiceTaskSegmentPlan plan = WorkflowCommandSet.PlanSegment(
            "archiving",
            pipeline,
            afterExchange: "SendToArchive"
        );

        Assert.Equal([$"{ExecuteServiceTask.Key}: RecordArchive", ExecuteServiceTask.Key], OperationIds(plan));
        Assert.Null(plan.Receive);
    }

    /// <summary>
    /// Both sends composed before either handler — decision 3: both mints ride segment 0, so both deadline
    /// clocks start in Main, and the segment after the first handler is a bare hand-over.
    /// </summary>
    [Fact]
    public void PlanSegment_UpFrontSends_MintsBothInSegmentZeroAndLeavesSegmentOneEmpty()
    {
        ServiceTaskPipeline pipeline = new ServiceTaskPipelineBuilder()
            .Stage("SendToArchive", SendStage, _threeDays, out MailboxHandle archive)
            .Stage("SendToJournal", SendStage, _threeDays, out MailboxHandle journal)
            .HandleReplies(archive, OnSegmentMessage, OnSegmentClosed)
            .ConcludeOnReplies(journal, OnMessage, OnClosed);

        ServiceTaskSegmentPlan first = WorkflowCommandSet.PlanSegment("archiving", pipeline);
        Assert.Equal(
            [
                $"{MintMailbox.Key}: SendToArchive",
                $"{ExecuteServiceTask.Key}: SendToArchive",
                $"{MintMailbox.Key}: SendToJournal",
                $"{ExecuteServiceTask.Key}: SendToJournal",
            ],
            OperationIds(first)
        );
        Assert.Equal("SendToArchive", first.Receive?.OpeningStageName);

        ServiceTaskSegmentPlan second = WorkflowCommandSet.PlanSegment(
            "archiving",
            pipeline,
            afterExchange: "SendToArchive"
        );
        Assert.Empty(second.Steps);
        Assert.Equal("SendToJournal", second.Receive?.OpeningStageName);
    }

    /// <summary>
    /// Handler order is exchange order, and it is the author's choice: answering B before A is legal once both
    /// stages precede both handlers, and the segments follow the handlers rather than the sends.
    /// </summary>
    [Fact]
    public void PlanSegment_HandlerOrderRatherThanSendOrder_DecidesTheSegments()
    {
        ServiceTaskPipeline pipeline = new ServiceTaskPipelineBuilder()
            .Stage("SendToArchive", SendStage, _threeDays, out MailboxHandle archive)
            .Stage("SendToJournal", SendStage, _threeDays, out MailboxHandle journal)
            .HandleReplies(journal, OnSegmentMessage, OnSegmentClosed)
            .HandleReplies(archive, OnSegmentMessage, OnSegmentClosed)
            .Finally(FinalWork);

        Assert.Equal("SendToJournal", WorkflowCommandSet.PlanSegment("archiving", pipeline).Receive?.OpeningStageName);
        Assert.Equal(
            "SendToArchive",
            WorkflowCommandSet
                .PlanSegment("archiving", pipeline, afterExchange: "SendToJournal")
                .Receive?.OpeningStageName
        );
        Assert.Null(WorkflowCommandSet.PlanSegment("archiving", pipeline, afterExchange: "SendToArchive").Receive);
    }

    /// <summary>
    /// Naming a handler the pipeline does not compose would otherwise plan segment 0 — re-running every stage,
    /// re-minting every mailbox and re-sending. It throws instead. Unreachable in production, where the only
    /// caller naming an exchange runs inside the callback whose dispatch just found that handler.
    /// </summary>
    [Fact]
    public void PlanSegment_AfterAnExchangeNoHandlerAnswers_Throws()
    {
        ServiceTaskPipeline pipeline = new ServiceTaskPipelineBuilder()
            .Stage("SendToArchive", SendStage, _threeDays, out MailboxHandle archive)
            .HandleReplies(archive, OnSegmentMessage, OnSegmentClosed)
            .Finally(FinalWork);

        InvalidOperationException thrown = Assert.Throws<InvalidOperationException>(() =>
            WorkflowCommandSet.PlanSegment("archiving", pipeline, afterExchange: "SendToArchive_v1")
        );
        Assert.Contains("SendToArchive_v1", thrown.Message, StringComparison.Ordinal);
    }
}
