using System;
using System.Collections.Generic;
using System.Net;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands;

/// <summary>
/// The reply half of <see cref="ExecuteServiceTask"/>: which of an exchange's two handlers the engine's
/// rendezvous block dispatches to, what the message becomes on the way there, and what happens when the
/// block and the pipeline's own shape disagree.
/// </summary>
public class ExecuteServiceTaskReplyTests
{
    private static readonly Guid _instanceGuid = new("2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde");
    private static readonly Guid _mailboxId = new("018f4e00-0000-7000-8000-0000000000aa");

    /// <summary>
    /// The item index of the stage that opens the tested exchanges' mailbox — the exchange's identity in the
    /// carry, and what each handler's composition names. Never what a step carries.
    /// </summary>
    private const int OpeningIndex = 0;

    /// <summary>The item index of <see cref="ArchivingTask"/>'s terminal, which answers that exchange.</summary>
    private const int ArchivingReplyIndex = 2;

    /// <summary>The item index of <see cref="ContinuingTask"/>'s mid-pipeline handler.</summary>
    private const int ContinuingSegmentIndex = 1;

    /// <summary>The item index of <see cref="ContinuingTask"/>'s concluding step.</summary>
    private const int ContinuingConclusionIndex = 3;

    /// <summary>The item index of <see cref="PlainTask"/>'s concluding step.</summary>
    private const int PlainConclusionIndex = 1;

    /// <summary>
    /// The real envelope, not a stub: a delivered message only reaches a handler if it opens against this mailbox,
    /// this service task and this idempotency key, so every test that expects a message to arrive must seal it the
    /// way the forwarder does.
    /// </summary>
    private static readonly MailboxDeliveryEnvelope _envelope = TestMailboxDeliveryEnvelope.Create();

    /// <summary>
    /// A task answered by messages: a sending stage that opens the mailbox, an unrelated stage after it, and
    /// the two handlers that answer the exchange. Each handler records what it was handed.
    /// </summary>
    private sealed class ArchivingTask : IPipelineServiceTask
    {
        public string Type => "archiving";

        public ServiceTaskExchangeResult MessageVerdict { get; init; } = ServiceTaskResult.Success();

        public ServiceTaskResult ClosedVerdict { get; init; } = ServiceTaskResult.Success();

        public ServiceTaskContext? MessageContext { get; private set; }

        public ServiceTaskReply? Message { get; private set; }

        public ServiceTaskContext? ClosedContext { get; private set; }

        public MailboxClosedReason? ClosedReason { get; private set; }

        public ServiceTaskContext? Stage { get; private set; }

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(
                    (_, _) => Task.FromResult(ServiceTaskStageResult.Completed()),
                    new MailboxOptions { Timeout = TimeSpan.FromDays(3) },
                    out MailboxHandle archive
                )
                .Stage(context =>
                {
                    Stage = context;
                    return Task.FromResult(ServiceTaskStageResult.Completed());
                })
                .ConcludeOnReplies(
                    archive,
                    onMessage: (context, reply) =>
                    {
                        MessageContext = context;
                        Message = reply;
                        return Task.FromResult(MessageVerdict);
                    },
                    onClosed: (context, reason) =>
                    {
                        ClosedContext = context;
                        ClosedReason = reason;
                        return Task.FromResult(ClosedVerdict);
                    }
                );
    }

    private static readonly MailboxOptions _threeDays = new() { Timeout = TimeSpan.FromDays(3) };

    private static Task<ServiceTaskStageResult> Send(ServiceTaskContext context, ServiceTaskMailbox mailbox) =>
        Task.FromResult(ServiceTaskStageResult.Completed());

    /// <summary>
    /// A task whose exchange is answered <strong>mid-pipeline</strong>: the handler is an ordinary item rather
    /// than the conclusion, so the pipeline carries on after the exchange and ends with a final step. Items:
    /// the opening stage at 0, its handler at 1, a plain stage at 2, the conclusion at 3.
    /// </summary>
    private sealed class ContinuingTask : IPipelineServiceTask
    {
        public string Type => "archiving";

        public ServiceTaskStageExchangeResult MessageVerdict { get; init; } = ServiceTaskStageResult.Completed();

        public ServiceTaskStageResult ClosedVerdict { get; init; } = ServiceTaskStageResult.Completed();

        public ServiceTaskReply? Message { get; private set; }

        public MailboxClosedReason? ClosedReason { get; private set; }

        public ServiceTaskContext? Conclusion { get; private set; }

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(Send, _threeDays, out MailboxHandle archive)
                .HandleReplies(
                    archive,
                    onMessage: (_, reply) =>
                    {
                        Message = reply;
                        return Task.FromResult(MessageVerdict);
                    },
                    onClosed: (_, reason) =>
                    {
                        ClosedReason = reason;
                        return Task.FromResult(ClosedVerdict);
                    }
                )
                .Stage(_ => Task.FromResult(ServiceTaskStageResult.Completed()))
                .Finally(context =>
                {
                    Conclusion = context;
                    return Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
                });
    }

    /// <summary>
    /// Two exchanges, one answered each way: the first's mid-pipeline, the second's by the terminal.
    /// Item indexes: the first opening stage at 0, its handler at 1, the second opening stage at 2, and the
    /// terminal — the second exchange's handler — at 3.
    /// </summary>
    private sealed class TwoExchangeTask : IPipelineServiceTask
    {
        /// <summary>The item index of the handler answering the first exchange.</summary>
        public const int SegmentIndex = 1;

        /// <summary>The item index of the terminal, answering the second.</summary>
        public const int TerminalIndex = 3;

        public string Type => "archiving";

        public List<string> Answered { get; } = [];

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(Send, _threeDays, out MailboxHandle archive)
                .HandleReplies(
                    archive,
                    onMessage: (_, _) =>
                    {
                        Answered.Add("segment.onMessage");
                        return Task.FromResult<ServiceTaskStageExchangeResult>(ServiceTaskStageResult.Completed());
                    },
                    onClosed: (_, _) =>
                    {
                        Answered.Add("segment.onClosed");
                        return Task.FromResult(ServiceTaskStageResult.Completed());
                    }
                )
                .Stage(Send, _threeDays, out MailboxHandle journal)
                .ConcludeOnReplies(
                    journal,
                    onMessage: (_, _) =>
                    {
                        Answered.Add("terminal.onMessage");
                        return Task.FromResult<ServiceTaskExchangeResult>(ServiceTaskResult.Success());
                    },
                    onClosed: (_, _) =>
                    {
                        Answered.Add("terminal.onClosed");
                        return Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
                    }
                );
    }

    /// <summary>The same task without a mailbox — it is never answered by a message.</summary>
    private sealed class PlainTask : IPipelineServiceTask
    {
        public string Type => "archiving";

        public ServiceTaskResult Verdict { get; init; } = ServiceTaskResult.Success();

        public ServiceTaskContext? Conclusion { get; private set; }

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(_ => Task.FromResult(ServiceTaskStageResult.Completed()))
                .Finally(context =>
                {
                    Conclusion = context;
                    return Task.FromResult(Verdict);
                });
    }

    private static ExecuteServiceTask CreateCommand(IPipelineServiceTask serviceTask)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        services.AddSingleton(serviceTask);
        ServiceProvider sp = services.BuildServiceProvider();

        return new ExecuteServiceTask(sp.GetRequiredService<AppImplementationFactory>(), _envelope);
    }

    private static ProcessEngineCommandContext CreateContext(
        AppCallbackMailbox? mailbox = null,
        WorkflowCallbackStateCarry? carry = null
    )
    {
        var instance = new Instance
        {
            Id = $"1337/{_instanceGuid}",
            Org = "ttd",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_2" } },
        };
        var mutator = new Mock<IInstanceDataMutator>();
        mutator.Setup(x => x.Instance).Returns(instance);

        return new ProcessEngineCommandContext
        {
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, _instanceGuid),
            InstanceDataMutator = mutator.Object,
            CancellationToken = CancellationToken.None,
            StateCarry = carry ?? new WorkflowCallbackStateCarry(),
            Payload = new AppCallbackPayload
            {
                CommandKey = ExecuteServiceTask.Key,
                Actor = new Actor { UserId = 1337 },
                LockToken = "lock-token",
                ExecutionReferenceTime = new DateTimeOffset(2026, 8, 19, 10, 0, 0, TimeSpan.Zero),
                State = "{}",
                WorkflowId = Guid.NewGuid(),
                StepId = Guid.NewGuid(),
                Mailbox = mailbox,
            },
        };
    }

    private static AppCallbackMailbox Delivered(long seq = 0, string body = "<receipt>ok</receipt>") =>
        new()
        {
            Id = _mailboxId,
            Seq = seq,
            Delivery = new AppCallbackMailboxDelivery
            {
                IdempotencyKey = "fiks-message-42",
                Payload = _envelope.Wrap(body, _mailboxId, "archiving", "fiks-message-42"),
                AcceptedAt = new DateTimeOffset(2026, 8, 19, 9, 30, 0, TimeSpan.Zero),
            },
        };

    private static AppCallbackMailbox Closed(MailboxDisposedReason reason) =>
        new()
        {
            Id = _mailboxId,
            Seq = 2,
            DisposedReason = reason,
        };

    /// <summary>
    /// A receive step the way the runtime enqueues one: it names the handler that answers the message, by that
    /// handler's own item index. The exchange comes off the handler, never off the step.
    /// </summary>
    private static ExecuteServiceTaskPayload ReceiveStep(int handlerItemIndex = ArchivingReplyIndex) =>
        new("archiving", ItemIndex: handlerItemIndex);

    /// <summary>Any step of the pipeline: a stage's, a handler's or the conclusion's, all named alike.</summary>
    private static ExecuteServiceTaskPayload Step(int itemIndex) => new("archiving", ItemIndex: itemIndex);

    [Fact]
    public async Task OnMessage_WithADeliveredMessage_ReadsItVerbatim()
    {
        var task = new ArchivingTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Delivered(seq: 3)), ReceiveStep());

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        ServiceTaskReply reply = Assert.IsType<ServiceTaskReply>(task.Message);
        Assert.Equal("<receipt>ok</receipt>", reply.Payload);
        Assert.Equal("fiks-message-42", reply.IdempotencyKey);
        Assert.Equal(new DateTimeOffset(2026, 8, 19, 9, 30, 0, TimeSpan.Zero), reply.AcceptedAt);
        Assert.Equal(3, reply.Position);
        Assert.Null(task.ClosedContext);
    }

    [Fact]
    public async Task OnMessage_WithAnEmptyMessage_StillRunsWithAMessage()
    {
        var task = new ArchivingTask();
        AppCallbackMailbox empty = Delivered(body: "");

        await CreateCommand(task).Execute(CreateContext(empty), ReceiveStep());

        Assert.NotNull(task.Message);
        Assert.Equal("", task.Message.Payload);
        Assert.Null(task.ClosedContext);
    }

    [Theory]
    [InlineData(MailboxDisposedReason.Deadline, MailboxClosedReason.Deadline)]
    [InlineData(MailboxDisposedReason.Request, MailboxClosedReason.Request)]
    public async Task OnClosed_RunsWithTheReasonAndNoMessage(
        MailboxDisposedReason engineReason,
        MailboxClosedReason appReason
    )
    {
        var task = new ArchivingTask();

        await CreateCommand(task).Execute(CreateContext(Closed(engineReason)), ReceiveStep());

        Assert.Null(task.Message);
        Assert.NotNull(task.ClosedContext);
        Assert.Equal(appReason, task.ClosedReason);
    }

    [Fact]
    public async Task Stage_OfAnExchangePipeline_RunsWithoutReachingEitherHandler()
    {
        var task = new ArchivingTask();

        ProcessEngineCommandResult result = await CreateCommand(task).Execute(CreateContext(), Step(1));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.NotNull(task.Stage);
        Assert.Null(task.MessageContext);
        Assert.Null(task.ClosedContext);
    }

    [Fact]
    public async Task Conclusion_OfATaskWithNoMailbox_RunsItsFinalStep()
    {
        var task = new PlainTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(), Step(PlainConclusionIndex));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.NotNull(task.Conclusion);
    }

    [Fact]
    public async Task Conclusion_OfATaskWithNoMailbox_HandedARendezvous_FailsPermanently()
    {
        var task = new PlainTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Delivered()), Step(PlainConclusionIndex));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxReceiptOnConclusion", failed.ExceptionType);
        Assert.Contains("was handed a mailbox message", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Contains($"index {PlainConclusionIndex}", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Null(task.Conclusion);
    }

    /// <summary>
    /// The guard's <em>other</em> route, on a pipeline that does answer messages: a receive step whose index
    /// has landed on the concluding step after a reshape. The verdict is the same one a foreign workflow gets,
    /// because with one index the two are indistinguishable from here — which is why the message names both
    /// and names the index. The conclusion must not run: it would conclude the task on a message nothing read.
    /// </summary>
    [Fact]
    public async Task ReceiveStep_WhoseIndexLandsOnTheConclusion_FailsAsReceiptOnConclusion()
    {
        var task = new ContinuingTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Delivered()), Step(ContinuingConclusionIndex));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxReceiptOnConclusion", failed.ExceptionType);
        Assert.Contains($"index {ContinuingConclusionIndex}", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Contains("reshaped", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Null(task.Conclusion);
        Assert.Null(task.Message);
    }

    [Fact]
    public async Task OnMessage_ReadsBackExactlyWhatTheForwarderForwarded()
    {
        // The two halves meeting with nothing hand-written between them: every other test constructs the
        // sealed payload itself, so this is the one that catches the two ends binding different things.
        var mailboxId = Guid.CreateVersion7();
        const string forwardedBody = """{"status":"mottatt","meldingId":"abc"}""";
        const string sourceMessageId = "fiks-message-99";
        MailboxDeliveryRequest? delivered = null;

        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        client
            .Setup(x =>
                x.DeliverToMailbox(
                    It.IsAny<string>(),
                    It.IsAny<Guid>(),
                    It.IsAny<MailboxDeliveryRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns<string, Guid, MailboxDeliveryRequest, CancellationToken>(
                (_, id, request, _) =>
                {
                    delivered = request;
                    return Task.FromResult(
                        new MailboxDeliveryResult(
                            HttpStatusCode.Accepted,
                            new MailboxDeliveryResponse
                            {
                                MailboxId = id,
                                Idx = 0,
                                IdempotencyKey = request.IdempotencyKey,
                                AcceptedAt = DateTimeOffset.UtcNow,
                            },
                            ErrorDetail: null
                        )
                    );
                }
            );

        var forwarder = new ServiceTaskReplyForwarder(
            client.Object,
            _envelope,
            new AppIdentifier("ttd", "test-app"),
            NullLogger<ServiceTaskReplyForwarder>.Instance
        );
        await forwarder.ForwardReply(mailboxId, "archiving", forwardedBody, sourceMessageId);

        var task = new ArchivingTask();
        AppCallbackMailbox receipt = new()
        {
            Id = mailboxId,
            Seq = 0,
            Delivery = new AppCallbackMailboxDelivery
            {
                IdempotencyKey = delivered!.IdempotencyKey,
                Payload = delivered.Payload,
                AcceptedAt = new DateTimeOffset(2026, 8, 20, 9, 30, 0, TimeSpan.Zero),
            },
        };

        ProcessEngineCommandResult result = await CreateCommand(task).Execute(CreateContext(receipt), ReceiveStep());

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.Equal(forwardedBody, task.Message!.Payload);
        Assert.Equal(sourceMessageId, task.Message.IdempotencyKey);
    }

    [Fact]
    public async Task OnMessage_WithAMessageThisAppNeverSealed_FailsPermanentlyWithoutRunningTheHandler()
    {
        var task = new ArchivingTask();
        AppCallbackMailbox unsealed = Delivered() with
        {
            Delivery = Delivered().Delivery! with { Payload = "<receipt>ok</receipt>" },
        };

        ProcessEngineCommandResult result = await CreateCommand(task).Execute(CreateContext(unsealed), ReceiveStep());

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxDeliveryEnvelopeInvalid", failed.ExceptionType);
        Assert.Null(task.MessageContext);
    }

    public static TheoryData<string, Guid, string, string> ForeignSeals =>
        new()
        {
            { "mailbox", new Guid("018f4e00-0000-7000-8000-0000000000bb"), "archiving", "fiks-message-42" },
            // Sealed for another handler — the case the address binding alone would not catch.
            { "service task", _mailboxId, "someOtherArchivingTask", "fiks-message-42" },
            { "idempotency key", _mailboxId, "archiving", "fiks-message-43" },
        };

    [Theory]
    [MemberData(nameof(ForeignSeals))]
    public async Task OnMessage_WithAMessageSealedForSomethingElse_FailsPermanently(
        string what,
        Guid sealedForMailbox,
        string sealedForTask,
        string sealedForKey
    )
    {
        Assert.NotEmpty(what);
        var task = new ArchivingTask();
        AppCallbackMailbox foreign = Delivered() with
        {
            Delivery = Delivered().Delivery! with
            {
                Payload = _envelope.Wrap("<receipt>ok</receipt>", sealedForMailbox, sealedForTask, sealedForKey),
            },
        };

        ProcessEngineCommandResult result = await CreateCommand(task).Execute(CreateContext(foreign), ReceiveStep());

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxDeliveryEnvelopeInvalid", failed.ExceptionType);
        Assert.Null(task.MessageContext);
    }

    [Fact]
    public async Task OnClosed_NeedsNoEnvelope()
    {
        var task = new ArchivingTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Closed(MailboxDisposedReason.Deadline)), ReceiveStep());

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.NotNull(task.ClosedContext);
        Assert.Null(task.Message);
    }

    [Fact]
    public async Task Stage_HandedARendezvous_FailsPermanently()
    {
        var task = new ArchivingTask();

        ProcessEngineCommandResult result = await CreateCommand(task).Execute(CreateContext(Delivered()), Step(1));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxReceiptOnStage", failed.ExceptionType);
        Assert.Null(task.Stage);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Exchange_HandedAnAmbiguousRendezvous_FailsPermanently(bool both)
    {
        // "Neither" must not read as closed: an absent message is an instruction to conclude.
        var task = new ArchivingTask();
        AppCallbackMailbox ambiguous = both
            ? Delivered() with
            {
                DisposedReason = MailboxDisposedReason.Request,
            }
            : new AppCallbackMailbox { Id = _mailboxId, Seq = 0 };

        ProcessEngineCommandResult result = await CreateCommand(task).Execute(CreateContext(ambiguous), ReceiveStep());

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxReceiptAmbiguous", failed.ExceptionType);
        Assert.Null(task.MessageContext);
        Assert.Null(task.ClosedContext);
    }

    [Fact]
    public async Task AwaitNextReply_OnADeliveredMessage_AsksTheRelayForTheNextReceiver()
    {
        var task = new ArchivingTask { MessageVerdict = ServiceTaskExchangeResult.AwaitNextReply() };

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Delivered(seq: 1)), ReceiveStep());

        SuccessfulProcessEngineCommandResult success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.False(success.AutoAdvanceProcess);
        MailboxContinuation.AwaitNextMessage awaiting = Assert.IsType<MailboxContinuation.AwaitNextMessage>(
            success.MailboxContinuation
        );
        Assert.Equal(_mailboxId, awaiting.MailboxId);
        Assert.Equal("archiving", awaiting.ServiceTaskType);
        // The handler's own index, not the exchange's: the successor names the same handler.
        Assert.Equal(ArchivingReplyIndex, awaiting.HandlerItemIndex);
    }

    [Fact]
    public async Task OnMessage_ThatSucceeds_CarriesTheConclusionAndDropsTheMailboxFromTheBlob()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningIndex, _mailboxId, DateTimeOffset.UnixEpoch.AddDays(3));
        var task = new ArchivingTask { MessageVerdict = ServiceTaskResult.Success("confirm") };

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Delivered(), carry), ReceiveStep());

        SuccessfulProcessEngineCommandResult success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.True(success.AutoAdvanceProcess);
        Assert.Equal("confirm", success.AutoAdvanceAction);
        Assert.IsType<MailboxContinuation.Conclude>(success.MailboxContinuation);
        Assert.Null(carry.Mailboxes);
    }

    [Fact]
    public async Task OnClosed_ThatFailsPermanently_StillCarriesTheConclusion()
    {
        var task = new ArchivingTask
        {
            ClosedVerdict = ServiceTaskResult.FailedPermanent("the archive never confirmed before the deadline"),
        };

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Closed(MailboxDisposedReason.Deadline)), ReceiveStep());

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.IsType<MailboxContinuation.Conclude>(failed.MailboxContinuation);
    }

    /// <summary>
    /// A receive step is dispatched by the item it names, so a pipeline reshaped until that index composes
    /// nothing fails it permanently instead of running whatever replaced the terminal. The route is a redeploy
    /// while the exchange was in flight. Matching is exact: an unresolvable index gets the plain not-found
    /// verdict, naming the index and no relocation story.
    /// </summary>
    /// <param name="withRendezvous">
    /// Both cells of the arm, which requires no rendezvous to notice the miss — so its wording must not claim
    /// one, and must not claim the pipeline opens no mailbox either: it reports the index and that nothing is
    /// composed there.
    /// </param>
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ReceiveStep_OnAPipelineThatNoLongerComposesThatItem_FailsPermanently(bool withRendezvous)
    {
        var task = new PlainTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(withRendezvous ? CreateContext(Delivered()) : CreateContext(), ReceiveStep());

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("PipelineItemNotFound", failed.ExceptionType);
        Assert.Null(task.Conclusion);

        Assert.Contains(
            $"composes no pipeline item at index {ArchivingReplyIndex}",
            failed.ErrorMessage,
            StringComparison.Ordinal
        );
        Assert.DoesNotContain("was handed a mailbox message", failed.ErrorMessage, StringComparison.Ordinal);
    }

    /// <summary>
    /// The exchange is answered mid-pipeline, so the receive step naming that handler reaches it and not the
    /// conclusion the pipeline still ends with.
    /// </summary>
    [Fact]
    public async Task ReceiveStep_NamingAHandlerAnsweringMidPipeline_RunsThatHandlerWithTheMessage()
    {
        var task = new ContinuingTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Delivered(seq: 4)), ReceiveStep(ContinuingSegmentIndex));

        ServiceTaskReply reply = Assert.IsType<ServiceTaskReply>(task.Message);
        Assert.Equal("<receipt>ok</receipt>", reply.Payload);
        Assert.Equal("fiks-message-42", reply.IdempotencyKey);
        Assert.Equal(4, reply.Position);
        Assert.Null(task.ClosedReason);
        Assert.Null(task.Conclusion);

        SuccessfulProcessEngineCommandResult success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.False(success.AutoAdvanceProcess);
        MailboxContinuation.ConcludeAndContinue continuing = Assert.IsType<MailboxContinuation.ConcludeAndContinue>(
            success.MailboxContinuation
        );
        Assert.Equal(_mailboxId, continuing.MailboxId);
        Assert.Equal("archiving", continuing.ServiceTaskType);
        // The two indexes are different positions, and the relay needs both: the handler's, to plan what
        // follows it, and the exchange's, for the carry key it dropped and the operation id it names.
        Assert.Equal(ContinuingSegmentIndex, continuing.HandlerItemIndex);
        Assert.Equal(OpeningIndex, continuing.OpeningStageIndex);
    }

    [Theory]
    [InlineData(MailboxDisposedReason.Deadline, MailboxClosedReason.Deadline)]
    [InlineData(MailboxDisposedReason.Request, MailboxClosedReason.Request)]
    public async Task ReceiveStep_NamingAHandlerAnsweringMidPipeline_RunsItsClosedHalf(
        MailboxDisposedReason engineReason,
        MailboxClosedReason appReason
    )
    {
        var task = new ContinuingTask();

        await CreateCommand(task).Execute(CreateContext(Closed(engineReason)), ReceiveStep(ContinuingSegmentIndex));

        Assert.Equal(appReason, task.ClosedReason);
        Assert.Null(task.Message);
        Assert.Null(task.Conclusion);
    }

    /// <summary>
    /// Both halves answer in the stage vocabulary, and both are mapped by the relay's segment decision rather
    /// than by the terminal's — so <c>AwaitNextReply</c> keeps the exchange going and a permanent failure
    /// closes that exchange's mailbox while starting nothing at all.
    /// </summary>
    [Fact]
    public async Task ReceiveStep_AnsweredMidPipeline_MapsBothHalvesThroughTheStageVocabulary()
    {
        var awaiting = new ContinuingTask { MessageVerdict = ServiceTaskStageExchangeResult.AwaitNextReply() };

        SuccessfulProcessEngineCommandResult onMessage = Assert.IsType<SuccessfulProcessEngineCommandResult>(
            await CreateCommand(awaiting).Execute(CreateContext(Delivered(seq: 2)), ReceiveStep(ContinuingSegmentIndex))
        );

        MailboxContinuation.AwaitNextMessage next = Assert.IsType<MailboxContinuation.AwaitNextMessage>(
            onMessage.MailboxContinuation
        );
        Assert.Equal(ContinuingSegmentIndex, next.HandlerItemIndex);
        Assert.Equal(2, next.Position);
        Assert.NotNull(awaiting.Message);

        var failing = new ContinuingTask
        {
            ClosedVerdict = ServiceTaskStageResult.FailedPermanent("the archive never confirmed"),
        };

        FailedProcessEngineCommandResult onClosed = Assert.IsType<FailedProcessEngineCommandResult>(
            await CreateCommand(failing)
                .Execute(CreateContext(Closed(MailboxDisposedReason.Deadline)), ReceiveStep(ContinuingSegmentIndex))
        );

        Assert.True(onClosed.NonRetryable);
        Assert.Contains("the archive never confirmed", onClosed.ErrorMessage, StringComparison.Ordinal);
        Assert.IsType<MailboxContinuation.Conclude>(onClosed.MailboxContinuation);
        Assert.Equal(MailboxClosedReason.Deadline, failing.ClosedReason);
        Assert.Null(failing.Conclusion);
    }

    /// <summary>
    /// The rendezvous guards run before either kind of handler, because they are one path up to the verdict.
    /// </summary>
    [Fact]
    public async Task ReceiveStep_AnsweredMidPipeline_WithoutARendezvous_FailsPermanentlyAndNeverRuns()
    {
        var task = new ContinuingTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(), ReceiveStep(ContinuingSegmentIndex));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxReceiptMissing", failed.ExceptionType);
        // Names the item and both routes, for the reason its two siblings do: with one index, an engine that
        // omitted the rendezvous and a reshape that moved this index onto a handler look the same from here.
        Assert.Contains($"index {ContinuingSegmentIndex}", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Contains("workflow engine omitted it", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Contains("reshaped", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Null(task.Message);
        Assert.Null(task.ClosedReason);
    }

    /// <summary>
    /// Both handler shapes on one pipeline, in one index space: the step's index picks the item, and the item's
    /// type — a mid-pipeline handler or the terminal — decides which vocabulary maps its verdict.
    /// </summary>
    [Theory]
    [InlineData(TwoExchangeTask.SegmentIndex, "segment.onMessage")]
    [InlineData(TwoExchangeTask.TerminalIndex, "terminal.onMessage")]
    public async Task ReceiveStep_OnAPipelineAnsweringBothWays_ReachesTheHandlerItNames(
        int handlerItemIndex,
        string expected
    )
    {
        var task = new TwoExchangeTask();

        await CreateCommand(task).Execute(CreateContext(Delivered()), ReceiveStep(handlerItemIndex));

        Assert.Equal([expected], task.Answered);
    }

    /// <summary>
    /// A receive step whose index lands on something that answers no message is refused, never redirected to a
    /// neighbouring handler: a stage there is <c>MailboxReceiptOnStage</c>, nothing there is
    /// <c>PipelineItemNotFound</c>, and each names what it found. Both are the mid-flight reshape.
    /// </summary>
    [Theory]
    [InlineData(0, "MailboxReceiptOnStage")]
    [InlineData(2, "MailboxReceiptOnStage")]
    [InlineData(4, "PipelineItemNotFound")]
    public async Task ReceiveStep_NamingAnItemThatAnswersNoMessage_IsRefusedRatherThanGuessed(
        int itemIndex,
        string reasonCode
    )
    {
        var task = new TwoExchangeTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Delivered()), ReceiveStep(itemIndex));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal(reasonCode, failed.ExceptionType);
        Assert.Empty(task.Answered);
        Assert.Contains($"index {itemIndex}", failed.ErrorMessage, StringComparison.Ordinal);
    }

    /// <summary>
    /// A pipeline that answers an exchange mid-pipeline still concludes with its final step, and the step
    /// naming the conclusion's own item index is what runs it.
    /// </summary>
    [Fact]
    public async Task Conclusion_OfAPipelineThatAnswersMidPipeline_RunsItsFinalStep()
    {
        var task = new ContinuingTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(), Step(ContinuingConclusionIndex));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.NotNull(task.Conclusion);
        Assert.Null(task.Message);
    }

    /// <summary>
    /// A step naming no item at all is refused, never answered: every step this expansion builds names the one
    /// item it runs, the concluding step included, so an index-less payload — the shape an old receive step's
    /// <c>repliesTo</c> also arrives in — was written by a version whose step identity differed. No handler
    /// runs, and the carry is untouched: a refusal concludes nothing.
    /// </summary>
    [Fact]
    public async Task AnIndexLessStep_IsRefusedWithoutRunningAnyHandler()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningIndex, _mailboxId, DateTimeOffset.UnixEpoch.AddDays(3));
        var task = new ArchivingTask { MessageVerdict = ServiceTaskResult.Success() };

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Delivered(seq: 5), carry), new ExecuteServiceTaskPayload("archiving"));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("InvalidPayloadException", failed.ExceptionType);
        Assert.Contains("names no pipeline item", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Null(task.Message);
        Assert.Null(task.ClosedReason);
        Assert.NotNull(carry.Mailboxes);
    }

    /// <summary>
    /// The refusal runs <em>before</em> the service task is resolved, which is the only thing that makes a
    /// broken payload converge: nothing about the pipeline changes what a step naming no item can mean, and
    /// resolving first would turn an unregistered type into a retryable failure that never does. It is the
    /// one guard left out here — every other now needs the pipeline to know the item's shape.
    /// </summary>
    [Fact]
    public async Task AnIndexLessStep_OnAnUnregisteredServiceTaskType_StillFailsPermanently()
    {
        ExecuteServiceTask command = CreateCommand(new ArchivingTask());

        ProcessEngineCommandResult result = await command.Execute(
            CreateContext(Delivered()),
            new ExecuteServiceTaskPayload("nonExistentType")
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("InvalidPayloadException", failed.ExceptionType);
        Assert.Contains("nonExistentType", failed.ErrorMessage, StringComparison.Ordinal);
    }
}
