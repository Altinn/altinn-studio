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
    private const string OpeningStage = "SendToArchive";

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
                    "SendToArchive",
                    (_, _) => Task.FromResult(ServiceTaskStageResult.Completed()),
                    new MailboxOptions { Timeout = TimeSpan.FromDays(3) },
                    out MailboxHandle archive
                )
                .Stage(
                    "RecordDispatch",
                    context =>
                    {
                        Stage = context;
                        return Task.FromResult(ServiceTaskStageResult.Completed());
                    }
                )
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

    /// <summary>The same task without a mailbox — it is never answered by a message.</summary>
    private sealed class PlainTask : IPipelineServiceTask
    {
        public string Type => "archiving";

        public ServiceTaskResult Verdict { get; init; } = ServiceTaskResult.Success();

        public ServiceTaskContext? Conclusion { get; private set; }

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage("SendToArchive", _ => Task.FromResult(ServiceTaskStageResult.Completed()))
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
    /// A receive step the way the runtime enqueues one: it names the exchange it answers rather than a stage
    /// it runs. Dispatch reads the name's <em>presence</em> to pick this branch and the handler by the
    /// pipeline's shape; the name itself is the exchange's identity, and travels on to the successor and the
    /// carry.
    /// </summary>
    private static ExecuteServiceTaskPayload ReceiveStep(string repliesTo = OpeningStage) =>
        new("archiving", RepliesTo: repliesTo);

    /// <summary>Main's concluding step: it names neither a stage nor an exchange.</summary>
    private static ExecuteServiceTaskPayload ConcludingStep() => new("archiving");

    /// <summary>A step that runs one of the pipeline's stages.</summary>
    private static ExecuteServiceTaskPayload StageStep(string stageName) => new("archiving", stageName);

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

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(), StageStep("RecordDispatch"));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.NotNull(task.Stage);
        Assert.Null(task.MessageContext);
        Assert.Null(task.ClosedContext);
    }

    [Fact]
    public async Task Conclusion_OfATaskWithNoMailbox_RunsItsFinalStep()
    {
        var task = new PlainTask();

        ProcessEngineCommandResult result = await CreateCommand(task).Execute(CreateContext(), ConcludingStep());

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.NotNull(task.Conclusion);
    }

    [Fact]
    public async Task Conclusion_OfATaskWithNoMailbox_HandedARendezvous_FailsPermanently()
    {
        var task = new PlainTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Delivered()), ConcludingStep());

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxReceiptWithoutDeclaration", failed.ExceptionType);
        // One reason code, two routes, and each names what it actually observed: this route saw a rendezvous.
        Assert.Contains("was handed a mailbox message", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Null(task.Conclusion);
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

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Delivered()), StageStep("RecordDispatch"));

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
        // The successor answers the exchange this receiver did, by the name carried since it opened.
        Assert.Equal(OpeningStage, awaiting.OpeningStageName);
    }

    [Fact]
    public async Task OnMessage_ThatSucceeds_CarriesTheConclusionAndDropsTheMailboxFromTheBlob()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox("SendToArchive", _mailboxId, DateTimeOffset.UnixEpoch.AddDays(3));
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
    /// A receive step is dispatched by the exchange it names, so a pipeline that has stopped answering
    /// messages fails it permanently instead of running the <c>Finally</c> that replaced the terminal. The
    /// route is a redeploy that withdrew the reply terminal while the exchange was in flight.
    /// </summary>
    /// <param name="withRendezvous">
    /// Both cells of the arm. <c>true</c> is what phase 1 already failed this way; <c>false</c> is this
    /// step's new behavior — the step names an exchange, which is enough on its own, where phase 1 ran the
    /// <c>Finally</c> and concluded the task on nothing. The arm requires no rendezvous, so its wording must
    /// not claim one: it reports what it actually saw.
    /// </param>
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ReceiveStep_OnAPipelineThatNoLongerAnswersMessages_FailsPermanently(bool withRendezvous)
    {
        var task = new PlainTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(withRendezvous ? CreateContext(Delivered()) : CreateContext(), ReceiveStep());

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxReceiptWithoutDeclaration", failed.ExceptionType);
        Assert.Null(task.Conclusion);

        // The arm reports what it saw — a step naming an exchange — in both cells, because that is all it
        // checked. Claiming a rendezvous would be false in the second cell and is not what selected the arm
        // in the first.
        Assert.Contains("has a step naming an exchange to answer", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.DoesNotContain("was handed a mailbox message", failed.ErrorMessage, StringComparison.Ordinal);
    }

    /// <summary>
    /// Finding of the step's own review, pinned: the exchange's identity travels with the step and is not
    /// re-derived from the pipeline at the hop that runs it. Writable only because dispatch picks the handler
    /// by shape, so a receiver can legitimately carry a name the pipeline no longer uses — which is exactly
    /// the mid-flight rename this rule exists for.
    /// </summary>
    [Fact]
    public async Task AwaitNextReply_EnqueuesTheSuccessorAgainstTheNameTheReceiverCarried()
    {
        const string carriedName = "SendToArchive_v1";
        var task = new ArchivingTask { MessageVerdict = ServiceTaskExchangeResult.AwaitNextReply() };

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Delivered()), ReceiveStep(carriedName));

        SuccessfulProcessEngineCommandResult success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        MailboxContinuation.AwaitNextMessage awaiting = Assert.IsType<MailboxContinuation.AwaitNextMessage>(
            success.MailboxContinuation
        );
        Assert.Equal(carriedName, awaiting.OpeningStageName);
        Assert.NotEqual(OpeningStage, awaiting.OpeningStageName);
    }

    /// <summary>
    /// The same rule on the concluding write. <c>RecordMailboxConcluded</c> is a silent removal, so a
    /// re-derived name would leave the concluded exchange in the published blob — and the next transition
    /// opening a mailbox from a same-named stage would then be refused by <c>RecordMailbox</c>.
    /// </summary>
    [Fact]
    public async Task OnMessage_ThatSucceeds_DropsTheMailboxKeyedByTheNameTheReceiverCarried()
    {
        const string carriedName = "SendToArchive_v1";
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(carriedName, _mailboxId, DateTimeOffset.UnixEpoch.AddDays(3));
        var task = new ArchivingTask { MessageVerdict = ServiceTaskResult.Success() };

        await CreateCommand(task).Execute(CreateContext(Delivered(), carry), ReceiveStep(carriedName));

        Assert.Null(carry.Mailboxes);
    }

    /// <summary>
    /// The compatibility arm: a receiver enqueued before receive steps named their exchange carries neither
    /// name, and must still be answered — with the pipeline's own opening stage standing in for the identity
    /// it never carried. Narrowing that arm to a non-null <c>RepliesTo</c> would strand every such receiver
    /// in flight, so it stays pinned even though nothing enqueues this shape any more.
    /// </summary>
    [Fact]
    public async Task ANameLessReceiver_IsStillAnswered_AndFallsBackToThePipelinesOpeningStage()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStage, _mailboxId, DateTimeOffset.UnixEpoch.AddDays(3));
        var task = new ArchivingTask { MessageVerdict = ServiceTaskResult.Success() };

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Delivered(seq: 5), carry), ConcludingStep());

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.NotNull(task.Message);
        Assert.Equal(5, task.Message.Position);
        // The fallback reached the carry under the pipeline's own name, so the conclusion still drops it.
        Assert.Null(carry.Mailboxes);
    }

    /// <summary>
    /// The payload's one invariant, guarded where it is read: a step names a stage or an exchange, never
    /// both. Only a version of this app-lib that identified steps differently could have written one, and
    /// honouring either name would run the wrong part of the pipeline — so it fails permanently and runs
    /// nothing, on both pipeline shapes.
    /// </summary>
    [Fact]
    public async Task AStepNamingBothAStageAndAnExchange_FailsPermanentlyWithoutRunningAnything()
    {
        var task = new ArchivingTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(
                CreateContext(),
                new ExecuteServiceTaskPayload("archiving", StageName: "RecordDispatch", RepliesTo: OpeningStage)
            );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("InvalidPayloadException", failed.ExceptionType);
        Assert.Contains("RecordDispatch", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Contains(OpeningStage, failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Null(task.Stage);
        Assert.Null(task.MessageContext);
        Assert.Null(task.ClosedContext);
    }

    [Fact]
    public async Task AStepNamingBothNames_OnAPipelineWithNoExchange_AlsoFailsPermanently()
    {
        var task = new PlainTask();

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(
                CreateContext(),
                new ExecuteServiceTaskPayload("archiving", StageName: "SendToArchive", RepliesTo: OpeningStage)
            );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("InvalidPayloadException", failed.ExceptionType);
        Assert.Null(task.Conclusion);
    }
}
