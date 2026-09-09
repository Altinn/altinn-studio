using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands;

/// <summary>
/// The mailbox half of <see cref="ExecuteServiceTask"/>: the declaring stage being handed the address the
/// <see cref="MintMailbox"/> step published, and what the executions that open no mailbox do instead. The
/// mint itself is <see cref="MintMailboxTests"/>'s subject — nothing here opens a mailbox.
/// </summary>
public class ExecuteServiceTaskMailboxTests
{
    private static readonly Guid _instanceGuid = new("2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde");
    private static readonly Guid _carriedMailboxId = new("018f4e00-0000-7000-8000-0000000000aa");
    private static readonly DateTimeOffset _carriedDeadline = new(2026, 8, 22, 10, 0, 0, TimeSpan.Zero);

    /// <summary>The item index of the stage that opens the mailbox — the carry's key for the exchange.</summary>
    private const int SendStageIndex = 0;

    /// <summary>
    /// The item index of the handler that answers that exchange: <see cref="ArchivingTask"/>'s conclusion,
    /// composed after the sending stage and the plain one.
    /// </summary>
    private const int ReplyHandlerIndex = 2;

    private sealed class ArchivingTask : IPipelineServiceTask
    {
        public string Type => "archiving";

        public Dictionary<string, ServiceTaskContext> Seen { get; } = new(StringComparer.Ordinal);

        /// <summary>The address handed to the stage that opens the mailbox.</summary>
        public ServiceTaskMailbox? SentTo { get; private set; }

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(
                    (context, mailbox) =>
                    {
                        Seen["SendToArchive"] = context;
                        SentTo = mailbox;
                        return Task.FromResult(ServiceTaskOpeningStageResult.Completed());
                    },
                    new MailboxOptions { Timeout = TimeSpan.FromDays(3) },
                    out MailboxHandle archive
                )
                .Stage(Record<ServiceTaskStageResult>("RecordDispatch", ServiceTaskStageResult.Completed()))
                .ConcludeOnReplies(
                    archive,
                    onMessage: Record<ServiceTaskExchangeResult, ServiceTaskReply>(
                        "OnMessage",
                        ServiceTaskResult.Success()
                    ),
                    onClosed: Record<ServiceTaskResult, MailboxClosedReason>("OnClosed", ServiceTaskResult.Success())
                );

        private Func<ServiceTaskContext, Task<T>> Record<T>(string step, T result) =>
            context =>
            {
                Seen[step] = context;
                return Task.FromResult(result);
            };

        private Func<ServiceTaskContext, TArg, Task<T>> Record<T, TArg>(string step, T result) =>
            (context, _) =>
            {
                Seen[step] = context;
                return Task.FromResult(result);
            };
    }

    /// <summary>The same task without a mailbox, for the "declares none" branch.</summary>
    private sealed class PlainTask : IPipelineServiceTask
    {
        public string Type => "archiving";

        public Dictionary<string, ServiceTaskContext> Seen { get; } = new(StringComparer.Ordinal);

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(context =>
                {
                    Seen["SendStage"] = context;
                    return Task.FromResult(ServiceTaskStageResult.Completed());
                })
                .Finally(context =>
                {
                    Seen["Finally"] = context;
                    return Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
                });
    }

    private static ExecuteServiceTask CreateCommand(IPipelineServiceTask serviceTask)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        services.AddSingleton(serviceTask);
        ServiceProvider sp = services.BuildServiceProvider();

        return new ExecuteServiceTask(
            sp.GetRequiredService<AppImplementationFactory>(),
            TestMailboxDeliveryEnvelope.Create()
        );
    }

    /// <summary>The carry as the mint step leaves it for the stage that sends.</summary>
    private static WorkflowCallbackStateCarry MintedCarry(int stageIndex = SendStageIndex)
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(stageIndex, _carriedMailboxId, _carriedDeadline);
        return carry;
    }

    private static ProcessEngineCommandContext CreateContext(
        WorkflowCallbackStateCarry? carry = null,
        AppCallbackMailbox? mailbox = null
    )
    {
        var instance = new Instance
        {
            Id = $"1337/{_instanceGuid}",
            Org = "ttd",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };
        var mutatorMock = new Mock<IInstanceDataMutator>();
        mutatorMock.Setup(x => x.Instance).Returns(instance);

        return new ProcessEngineCommandContext
        {
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, _instanceGuid),
            InstanceDataMutator = mutatorMock.Object,
            CancellationToken = CancellationToken.None,
            StateCarry = carry ?? new WorkflowCallbackStateCarry(),
            Payload = new AppCallbackPayload
            {
                CommandKey = ExecuteServiceTask.Key,
                Actor = new Actor { UserId = 1337 },
                ExecutionReferenceTime = new DateTimeOffset(2026, 8, 19, 10, 0, 0, TimeSpan.Zero),
                State = "{}",
                WorkflowId = Guid.NewGuid(),
                StepId = Guid.NewGuid(),
                Mailbox = mailbox,
            },
        };
    }

    /// <summary>
    /// A target sealed the way the forwarder seals one — an unsealed payload never reaches a handler.
    /// </summary>
    private static AppCallbackMailbox Delivered(Guid mailboxId, long seq = 0, string payload = "<receipt/>")
    {
        string key = $"source-message-{seq}";
        return new AppCallbackMailbox
        {
            Id = mailboxId,
            Seq = seq,
            Delivery = new AppCallbackMailboxDelivery
            {
                IdempotencyKey = key,
                Payload = TestMailboxDeliveryEnvelope.Create().Wrap(payload, mailboxId, "archiving", key),
                AcceptedAt = new DateTimeOffset(2026, 8, 19, 9, 30, 0, TimeSpan.Zero),
            },
        };
    }

    private static ExecuteServiceTaskPayload Payload(int? itemIndex) => new("archiving", itemIndex);

    /// <summary>A receive step as the runtime enqueues one: it names the handler that answers the message.</summary>
    private static ExecuteServiceTaskPayload ReceivePayload() => new("archiving", ItemIndex: ReplyHandlerIndex);

    [Fact]
    public async Task DeclaringStage_IsHandedTheMailboxTheMintStepCarried()
    {
        var task = new ArchivingTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(MintedCarry()), Payload(SendStageIndex));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);

        ServiceTaskMailbox mailbox = Assert.IsType<ServiceTaskMailbox>(task.SentTo);
        Assert.Equal(_carriedMailboxId, mailbox.Id);
        Assert.Equal(_carriedDeadline, mailbox.Deadline);
    }

    /// <summary>
    /// The stage may not send without an address, and it has no way to obtain one. Two causes reach here and
    /// the wording must name both: a redeploy that <em>added</em> the declaration at this index, so the
    /// in-flight workflow's step list holds no mint step at all, and a mint step whose record did not survive
    /// into this step's state. Naming only the second sent readers hunting a step that never existed.
    /// </summary>
    [Fact]
    public async Task DeclaringStage_WithoutACarriedMailbox_FailsPermanentlyAndNeverRuns()
    {
        var task = new ArchivingTask();

        ProcessEngineCommandResult result = await CreateCommand(task).Execute(CreateContext(), Payload(SendStageIndex));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxIdMissingFromState", failed.ExceptionType);
        Assert.Contains(
            $"The stage at index {SendStageIndex} opens a mailbox",
            failed.ErrorMessage,
            StringComparison.Ordinal
        );
        Assert.Contains("enqueued before the stage opened one", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Contains("did not survive into this step's state", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Empty(task.Seen);
    }

    /// <summary>
    /// A mailbox carried under another stage's index is not this stage's: the lookup is by index, never by
    /// "the one entry there happens to be".
    /// </summary>
    [Fact]
    public async Task DeclaringStage_WithAMailboxCarriedForAnotherStage_FailsPermanently()
    {
        var task = new ArchivingTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(MintedCarry(stageIndex: 5)), Payload(SendStageIndex));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxIdMissingFromState", failed.ExceptionType);
        Assert.Empty(task.Seen);
    }

    /// <summary>
    /// A stage that opens no mailbox is handed none: the runtime reads the stage's own declaration to decide
    /// what to hand it. The entry travelling in the carry belongs to the exchange an <em>earlier</em> stage
    /// opened, and this stage never sees it — it is read only to plan the receiver this stage's completion
    /// starts.
    /// </summary>
    [Fact]
    public async Task NonDeclaringStage_IsHandedNoMailbox()
    {
        var task = new ArchivingTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(MintedCarry()), Payload(itemIndex: 1));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.Contains("RecordDispatch", task.Seen);
        Assert.Null(task.SentTo);
    }

    [Fact]
    public async Task TaskThatOpensNoMailbox_RunsBothItsStepsWithAnEmptyCarry()
    {
        var task = new PlainTask();

        Assert.IsType<SuccessfulProcessEngineCommandResult>(
            await CreateCommand(task).Execute(CreateContext(), Payload(SendStageIndex))
        );
        // The plain task's conclusion is its item 1, right after the one stage.
        Assert.IsType<SuccessfulProcessEngineCommandResult>(
            await CreateCommand(task).Execute(CreateContext(), Payload(itemIndex: 1))
        );

        Assert.Contains("SendStage", task.Seen);
        Assert.Contains("Finally", task.Seen);
    }

    /// <summary>
    /// The command reads the carry and never writes it: the mint owns the one entry, and a stage that ran
    /// forwards the blob exactly as it received it.
    /// </summary>
    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    public async Task AnyStage_LeavesTheCarriedMailboxesUntouched(int itemIndex)
    {
        var task = new ArchivingTask();
        WorkflowCallbackStateCarry carry = MintedCarry();

        await CreateCommand(task).Execute(CreateContext(carry), Payload(itemIndex));

        Assert.NotNull(carry.Mailboxes);
        KeyValuePair<string, CarriedMailbox> only = Assert.Single(carry.Mailboxes);
        Assert.Equal($"{SendStageIndex}", only.Key);
        Assert.Equal(_carriedMailboxId, only.Value.Id);
    }

    /// <summary>
    /// The reply terminal reached with nothing to answer — a step naming an item that answers messages,
    /// handed no target. One general rule, whichever route produced it: an engine that omitted the
    /// target, or a redeploy that turned a <c>Finally</c> into a reply terminal while this workflow was
    /// in flight, so its Main's concluding step now names a handler.
    /// </summary>
    [Fact]
    public async Task ReplyHandlerOfAnExchangePipeline_WithoutARendezvous_FailsPermanentlyAndNeverRuns()
    {
        var task = new ArchivingTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(MintedCarry()), Payload(ReplyHandlerIndex));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxReceiptMissing", failed.ExceptionType);
        Assert.Empty(task.Seen);
    }

    /// <summary>
    /// The same guard through the step a receiver actually runs, built the way the expansion builds it.
    /// </summary>
    [Fact]
    public async Task ReceiveStep_WithoutARendezvous_FailsPermanentlyAndNeverRuns()
    {
        var task = new ArchivingTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(MintedCarry()), ReceivePayload());

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxReceiptMissing", failed.ExceptionType);
        Assert.Empty(task.Seen);
    }

    /// <summary>
    /// A receive step reaches the reply handler and no stage: it names the handler's own item, so the stage
    /// that opened the exchange is a different index entirely and never runs.
    /// </summary>
    [Fact]
    public async Task ReceiveStep_NamingItsHandler_RunsTheHandlerAndNotTheSendingStage()
    {
        var task = new ArchivingTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(MintedCarry(), Delivered(_carriedMailboxId)), ReceivePayload());

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.Contains("OnMessage", task.Seen);
        Assert.DoesNotContain("SendToArchive", task.Seen);
        Assert.Null(task.SentTo);
    }

    // ---------------------------------------------------------------------------------------------
    // A segment's last stage: completing it starts the receive leg or the next segment, and — for a
    // mailbox-opening stage — concluding from it ends the whole task.
    // ---------------------------------------------------------------------------------------------

    /// <summary>The Fiks Arkiv shape: the reply handler is composed right after the opening stage.</summary>
    private sealed class SendOnlyTask : IPipelineServiceTask
    {
        public string Type => "archiving";

        public Func<ServiceTaskContext, ServiceTaskMailbox, Task<ServiceTaskOpeningStageResult>> OnSend { get; init; } =
            (_, _) => Task.FromResult(ServiceTaskOpeningStageResult.Completed());

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(OnSend, new MailboxOptions { Timeout = TimeSpan.FromDays(3) }, out MailboxHandle archive)
                .ConcludeOnReplies(
                    archive,
                    (_, _) => Task.FromResult<ServiceTaskExchangeResult>(ServiceTaskResult.Success()),
                    (_, _) => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success())
                );
    }

    /// <summary>
    /// A send followed by two plain stages, then the terminal that answers: the shape that separates a plain
    /// stage which is its workflow's last step (item 2, with the handler composed next) from one which is not
    /// (item 1, with a stage composed next).
    /// </summary>
    private sealed class SendThenTwoStagesTask : IPipelineServiceTask
    {
        public string Type => "archiving";

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(
                    (_, _) => Task.FromResult(ServiceTaskOpeningStageResult.Completed()),
                    new MailboxOptions { Timeout = TimeSpan.FromDays(3) },
                    out MailboxHandle archive
                )
                .Stage(_ => Task.FromResult(ServiceTaskStageResult.Completed()))
                .Stage(_ => Task.FromResult(ServiceTaskStageResult.Completed()))
                .ConcludeOnReplies(
                    archive,
                    (_, _) => Task.FromResult<ServiceTaskExchangeResult>(ServiceTaskResult.Success()),
                    (_, _) => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success())
                );
    }

    /// <summary>
    /// The exchange's handler is composed right after the send, so completing the send starts that exchange's
    /// receive leg: one workflow, the handler alone in it, parked on the mailbox the mint carried. Nothing in
    /// the step's payload says so — it is read off the pipeline this execution resolved.
    /// </summary>
    [Fact]
    public async Task OpeningStage_WhoseHandlerIsComposedNext_AsksForThatExchangesReceiver()
    {
        var task = new SendOnlyTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(MintedCarry()), Payload(SendStageIndex));

        SuccessfulProcessEngineCommandResult success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.False(success.AutoAdvanceProcess);

        MailboxContinuation.ContinueAfterStage continuing = Assert.IsType<MailboxContinuation.ContinueAfterStage>(
            success.MailboxContinuation
        );
        Assert.Equal("archiving", continuing.ServiceTaskType);
        Assert.Equal(SendStageIndex, continuing.Handover.AfterItemIndex);
        Assert.Equal([$"{ExecuteServiceTask.Key}: 1"], OperationIds(continuing.Handover));

        MailboxTarget target = Assert.IsType<MailboxTarget>(continuing.Handover.Target);
        Assert.Equal(_carriedMailboxId, target.MailboxId);
        Assert.Equal(SendStageIndex, target.OpeningStageIndex);
    }

    /// <summary>
    /// The workflow's last stage need not be the one that opened the exchange: a plain stage composed between
    /// the send and the handler is its workflow's last step too, because the handler after it must be alone —
    /// and that is derived from the pipeline, since nothing rides in the step's payload.
    /// </summary>
    [Fact]
    public async Task PlainStageBeforeAHandler_Completed_AsksForThatExchangesReceiver()
    {
        var task = new ArchivingTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(MintedCarry()), Payload(itemIndex: 1));

        SuccessfulProcessEngineCommandResult success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        MailboxContinuation.ContinueAfterStage continuing = Assert.IsType<MailboxContinuation.ContinueAfterStage>(
            success.MailboxContinuation
        );
        Assert.Equal(1, continuing.Handover.AfterItemIndex);
        Assert.Equal([$"{ExecuteServiceTask.Key}: {ReplyHandlerIndex}"], OperationIds(continuing.Handover));

        MailboxTarget target = Assert.IsType<MailboxTarget>(continuing.Handover.Target);
        Assert.Equal(_carriedMailboxId, target.MailboxId);
        Assert.Equal(SendStageIndex, target.OpeningStageIndex);
    }

    /// <summary>
    /// The other half of that derivation: a plain stage the pipeline follows with another stage starts
    /// nothing. The steps after it are already in this workflow's step list, so the engine simply runs the
    /// next one — enqueuing anything here would duplicate them.
    /// </summary>
    [Fact]
    public async Task MidSegmentPlainStage_Completed_StartsNothing()
    {
        var task = new SendThenTwoStagesTask();

        // An empty carry on purpose: a stage that starts nothing reads nothing from it.
        ProcessEngineCommandResult result = await CreateCommand(task).Execute(CreateContext(), Payload(itemIndex: 1));

        SuccessfulProcessEngineCommandResult success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.Null(success.MailboxContinuation);
    }

    /// <summary>
    /// And the stage after it, on the same pipeline, does hand over: what separates the two is only the shape
    /// of the item composed next.
    /// </summary>
    [Fact]
    public async Task LastPlainStageOfTheSamePipeline_Completed_AsksForTheReceiver()
    {
        var task = new SendThenTwoStagesTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(MintedCarry()), Payload(itemIndex: 2));

        SuccessfulProcessEngineCommandResult success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        MailboxContinuation.ContinueAfterStage continuing = Assert.IsType<MailboxContinuation.ContinueAfterStage>(
            success.MailboxContinuation
        );
        Assert.Equal([$"{ExecuteServiceTask.Key}: 3"], OperationIds(continuing.Handover));
        Assert.Equal(SendStageIndex, Assert.IsType<MailboxTarget>(continuing.Handover.Target).OpeningStageIndex);
    }

    /// <summary>
    /// A mailbox-opening stage is always its workflow's last step, so completing one with the exchange's
    /// handler further off hands the pipeline over to the workflow carrying the items in between — the shape
    /// <see cref="ArchivingTask"/> has, with a plain stage composed between the send and the terminal. No
    /// target: that workflow receives nothing.
    /// </summary>
    [Fact]
    public async Task MidPipelineOpeningStage_Completed_AsksForTheNextSegment()
    {
        var task = new ArchivingTask();
        WorkflowCallbackStateCarry carry = MintedCarry();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(carry), Payload(SendStageIndex));

        SuccessfulProcessEngineCommandResult success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.False(success.AutoAdvanceProcess);
        MailboxContinuation.ContinueAfterStage continuing = Assert.IsType<MailboxContinuation.ContinueAfterStage>(
            success.MailboxContinuation
        );
        Assert.Equal("archiving", continuing.ServiceTaskType);
        // The plan rides the verdict: the stage composed after the send, and nothing more.
        Assert.Equal(SendStageIndex, continuing.Handover.AfterItemIndex);
        Assert.Equal([$"{ExecuteServiceTask.Key}: 1"], OperationIds(continuing.Handover));
        Assert.Null(continuing.Handover.Target);
        // The exchange has not started: its entry keeps traveling.
        Assert.NotNull(carry.FindMailbox(SendStageIndex));
    }

    private static List<string> OperationIds(MailboxHandover handover) =>
        handover.Plan.Steps.Select(step => step.OperationId).ToList();

    [Fact]
    public async Task OpeningStageConclusion_WithSuccessAndAction_ClosesEveryMailboxAndAdvances()
    {
        var task = new SendOnlyTask
        {
            OnSend = (_, _) =>
                Task.FromResult(ServiceTaskOpeningStageResult.Conclude(ServiceTaskResult.Success("reject"))),
        };
        WorkflowCallbackStateCarry carry = MintedCarry();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(carry), Payload(SendStageIndex));

        SuccessfulProcessEngineCommandResult success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.True(success.AutoAdvanceProcess);
        Assert.Equal("reject", success.AutoAdvanceAction);

        MailboxContinuation.Conclude conclude = Assert.IsType<MailboxContinuation.Conclude>(
            success.MailboxContinuation
        );
        Assert.Equal(_carriedMailboxId, Assert.Single(conclude.MailboxIds));
        // Dropped before the capture: the published blob carries no exchange the conclusion closed.
        Assert.Null(carry.FindMailbox(SendStageIndex));
    }

    [Fact]
    public async Task OpeningStageConclusion_WithPermanentFailure_ClosesEveryMailboxAndAdvancesNothing()
    {
        var task = new SendOnlyTask
        {
            OnSend = (_, _) =>
                Task.FromResult(
                    ServiceTaskOpeningStageResult.Conclude(
                        ServiceTaskResult.FailedPermanent("the recipient account does not exist")
                    )
                ),
        };

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(MintedCarry()), Payload(SendStageIndex));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ServiceTaskFailedException", failed.ExceptionType);
        Assert.Contains("the recipient account does not exist", failed.ErrorMessage, StringComparison.Ordinal);
        MailboxContinuation.Conclude conclude = Assert.IsType<MailboxContinuation.Conclude>(failed.MailboxContinuation);
        Assert.Equal(_carriedMailboxId, Assert.Single(conclude.MailboxIds));
    }

    /// <summary>
    /// The conclusion an opening stage with items composed after it returns: honored exactly as one from the
    /// stage a handler follows, because that stage ended its workflow too — the items after it are a segment
    /// this verdict never starts rather than steps it would have to cancel. No continuation is asked for, the
    /// mailbox closes, and the process advances per the carried result.
    /// </summary>
    [Fact]
    public async Task OpeningStageConclusion_FromAStageWithItemsComposedAfterIt_IsHonored()
    {
        var task = new MidPipelineConcluderTask();
        WorkflowCallbackStateCarry carry = MintedCarry();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(carry), Payload(SendStageIndex));

        SuccessfulProcessEngineCommandResult success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.True(success.AutoAdvanceProcess);

        MailboxContinuation.Conclude conclude = Assert.IsType<MailboxContinuation.Conclude>(
            success.MailboxContinuation
        );
        Assert.Equal(_carriedMailboxId, Assert.Single(conclude.MailboxIds));
        Assert.Null(carry.FindMailbox(SendStageIndex));
    }

    /// <summary>The archiving shape concluding from its opening stage, with a plain stage composed after it.</summary>
    private sealed class MidPipelineConcluderTask : IPipelineServiceTask
    {
        public string Type => "archiving";

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(
                    (_, _) => Task.FromResult(ServiceTaskOpeningStageResult.Conclude(ServiceTaskResult.Success())),
                    new MailboxOptions { Timeout = TimeSpan.FromDays(3) },
                    out MailboxHandle archive
                )
                .Stage(_ => Task.FromResult(ServiceTaskStageResult.Completed()))
                .ConcludeOnReplies(
                    archive,
                    (_, _) => Task.FromResult<ServiceTaskExchangeResult>(ServiceTaskResult.Success()),
                    (_, _) => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success())
                );
    }

    /// <summary>
    /// The probe for the opening-stage vocabulary's unknown-result arm, sibling to the four other roots':
    /// convergence rather than a throw into the retry ladder, naming the type.
    /// </summary>
    /// <remarks>
    /// Self-cleaning: closing the copy-constructor route properly stops <c>base(original)</c> compiling, and
    /// this test disappears with the arm it pins.
    /// </remarks>
    private sealed record RogueOpeningStageResult : ServiceTaskOpeningStageResult
    {
        public RogueOpeningStageResult(ServiceTaskOpeningStageResult original)
            : base(original) { }
    }

    [Fact]
    public async Task OpeningStage_WithAnUnrecognisedResultType_FailsPermanentlyAndNamesIt()
    {
        var task = new SendOnlyTask
        {
            OnSend = (_, _) =>
                Task.FromResult<ServiceTaskOpeningStageResult>(
                    new RogueOpeningStageResult(ServiceTaskOpeningStageResult.Completed())
                ),
        };

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(MintedCarry()), Payload(SendStageIndex));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ServiceTaskResultUnknown", failed.ExceptionType);
        Assert.Contains(nameof(RogueOpeningStageResult), failed.ErrorMessage, StringComparison.Ordinal);
    }

    [Fact]
    public async Task OpeningStage_DeferAndFailures_MapAsTheStageVocabularysOwn()
    {
        WorkflowCallbackStateCarry carry = MintedCarry();

        DeferredProcessEngineCommandResult deferred = Assert.IsType<DeferredProcessEngineCommandResult>(
            await CreateCommand(
                    new SendOnlyTask
                    {
                        OnSend = (_, _) =>
                            Task.FromResult(ServiceTaskOpeningStageResult.Defer(TimeSpan.FromMinutes(2), "waiting")),
                    }
                )
                .Execute(CreateContext(carry), Payload(SendStageIndex))
        );
        Assert.Equal(TimeSpan.FromMinutes(2), deferred.Delay);

        FailedProcessEngineCommandResult retryable = Assert.IsType<FailedProcessEngineCommandResult>(
            await CreateCommand(
                    new SendOnlyTask
                    {
                        OnSend = (_, _) =>
                            Task.FromResult(ServiceTaskOpeningStageResult.FailedRetryable("engine sneezed")),
                    }
                )
                .Execute(CreateContext(carry), Payload(SendStageIndex))
        );
        Assert.False(retryable.NonRetryable);
        Assert.Null(retryable.MailboxContinuation);

        FailedProcessEngineCommandResult permanent = Assert.IsType<FailedProcessEngineCommandResult>(
            await CreateCommand(
                    new SendOnlyTask
                    {
                        OnSend = (_, _) => Task.FromResult(ServiceTaskOpeningStageResult.FailedPermanent("no step id")),
                    }
                )
                .Execute(CreateContext(carry), Payload(SendStageIndex))
        );
        Assert.True(permanent.NonRetryable);
        // A stage's own permanent failure concludes nothing: mailboxes stay open for a resume.
        Assert.Null(permanent.MailboxContinuation);
        Assert.NotNull(carry.FindMailbox(SendStageIndex));
    }
}
