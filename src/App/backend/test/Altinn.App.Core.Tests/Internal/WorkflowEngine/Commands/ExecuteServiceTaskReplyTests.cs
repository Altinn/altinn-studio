using System.Net;
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

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands;

/// <summary>
/// An external stage's receive step, as <see cref="ExecuteServiceTask"/> runs it: the step on the stage's index
/// that carries the engine's mailbox receipt. Which of the stage's handlers the receipt reaches, what the reply
/// becomes on the way there, how each answer maps, and what happens when the receipt and the pipeline disagree.
/// </summary>
public class ExecuteServiceTaskReplyTests
{
    private static readonly Guid _instanceGuid = new("2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde");
    private static readonly Guid _mailboxId = new("018f4e00-0000-7000-8000-0000000000aa");
    private static readonly DateTimeOffset _deadline = new(2026, 8, 22, 10, 0, 0, TimeSpan.Zero);

    /// <summary>The item index of the external stage whose replies are tested.</summary>
    private const int StageIndex = 0;

    private static readonly ProcessStepOptions _stageOptions = new() { MaxExecutionTime = TimeSpan.FromMinutes(5) };

    /// <summary>
    /// The real envelope, not a stub: a delivered reply only reaches a handler if it opens against this mailbox,
    /// this service task and this idempotency key, so every test that expects a reply to arrive must seal it the
    /// way the forwarder does.
    /// </summary>
    private static readonly MailboxDeliveryEnvelope _envelope = TestMailboxDeliveryEnvelope.Create();

    /// <summary>
    /// An external stage, with a stage after it unless <see cref="ThenRecord"/> says otherwise. The handlers'
    /// answers are scripted, <c>onTimeout</c> is composed only when <see cref="OnTimeout"/> is set, and every method
    /// records that it ran.
    /// </summary>
    private sealed class ArchivingTask : IServiceTask
    {
        public string Type => "archiving";

        public Func<ServiceTaskReply, Task<ServiceTaskReplyResult>> OnReply { get; init; } =
            _ => Task.FromResult(ServiceTaskReplyResult.Completed());

        public Func<Task<ServiceTaskResult>>? OnTimeout { get; init; }

        public bool ThenRecord { get; init; } = true;

        public List<string> Ran { get; } = [];

        public ServiceTaskReply? Reply { get; private set; }

        public StageContext? ReplyContext { get; private set; }

        public void DefineExecute(PipelineBuilder.ServiceTask pipeline)
        {
            pipeline.ExternalStage(
                SendToArchive,
                HandleArchiveReply,
                timeout: TimeSpan.FromDays(3),
                onTimeout: OnTimeout is null ? null : HandleArchiveTimeout,
                options: _stageOptions
            );
            if (ThenRecord)
            {
                pipeline.Stage(RecordArchived);
            }
        }

        private Task<ServiceTaskResult> SendToArchive(StageContext context, ReplyAddress address)
        {
            Ran.Add(nameof(SendToArchive));
            return Task.FromResult(ServiceTaskResult.Completed());
        }

        private Task<ServiceTaskReplyResult> HandleArchiveReply(StageContext context, ServiceTaskReply reply)
        {
            Ran.Add(nameof(HandleArchiveReply));
            ReplyContext = context;
            Reply = reply;
            return OnReply(reply);
        }

        private Task<ServiceTaskResult> HandleArchiveTimeout(StageContext context)
        {
            Ran.Add(nameof(HandleArchiveTimeout));
            return OnTimeout is { } onTimeout ? onTimeout() : Task.FromResult(ServiceTaskResult.Completed());
        }

        private Task<ServiceTaskResult> RecordArchived(StageContext context)
        {
            Ran.Add(nameof(RecordArchived));
            return Task.FromResult(ServiceTaskResult.Completed());
        }
    }

    /// <summary>An external stage whose send is a lambda, so the stage has no name to give.</summary>
    private sealed class UnnamedStageTask : IServiceTask
    {
        public string Type => "archiving";

        public void DefineExecute(PipelineBuilder.ServiceTask pipeline) =>
            pipeline.ExternalStage(
                (_, _) => Task.FromResult(ServiceTaskResult.Completed()),
                (_, _) => Task.FromResult(ServiceTaskReplyResult.Completed()),
                timeout: TimeSpan.FromDays(2)
            );
    }

    /// <summary>Two exchanges, one external stage each: how a task does two.</summary>
    private sealed class ArchiveThenJournalTask : IServiceTask
    {
        public string Type => "archiving";

        public List<string> Answered { get; } = [];

        public void DefineExecute(PipelineBuilder.ServiceTask pipeline) =>
            pipeline
                .ExternalStage(
                    (_, _) => Task.FromResult(ServiceTaskResult.Completed()),
                    (_, _) =>
                    {
                        Answered.Add("archive");
                        return Task.FromResult(ServiceTaskReplyResult.Completed());
                    }
                )
                .ExternalStage(
                    (_, _) => Task.FromResult(ServiceTaskResult.Completed()),
                    (_, _) =>
                    {
                        Answered.Add("journal");
                        return Task.FromResult(ServiceTaskReplyResult.Completed());
                    }
                );
    }

#nullable disable
    /// <summary>A reply handler written without nullable annotations, answering null.</summary>
    private static Task<ServiceTaskReplyResult> AnswerNull(ServiceTaskReply reply) =>
        Task.FromResult<ServiceTaskReplyResult>(null);

#nullable restore

    private static ExecuteServiceTask CreateCommand(IServiceTask serviceTask)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        services.AddSingleton(serviceTask);
        ServiceProvider sp = services.BuildServiceProvider();

        return new ExecuteServiceTask(sp.GetRequiredService<AppImplementationFactory>(), _envelope);
    }

    /// <summary>The carry as the stage's send published it: the stage's address, still open.</summary>
    private static WorkflowCallbackStateCarry OpenCarry()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(StageIndex, _mailboxId, _deadline);
        return carry;
    }

    private static WorkflowEngineCommandContext CreateContext(
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

        return new WorkflowEngineCommandContext
        {
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, _instanceGuid),
            InstanceDataMutator = mutator.Object,
            CancellationToken = CancellationToken.None,
            StateCarry = carry ?? OpenCarry(),
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

    private static AppCallbackMailbox Closed(MailboxDisposedReason reason = MailboxDisposedReason.Deadline) =>
        new()
        {
            Id = _mailboxId,
            Seq = 2,
            DisposedReason = reason,
        };

    /// <summary>A receive step the way the runtime enqueues one: it names the external stage by its index.</summary>
    private static ExecuteServiceTaskPayload Step(int itemIndex = StageIndex) => new("archiving", ItemIndex: itemIndex);

    /// <summary>The carry still holds the stage's address, as the send published it.</summary>
    private static void AssertStillCarried(WorkflowCallbackStateCarry carry)
    {
        Assert.NotNull(carry.Mailboxes);
        KeyValuePair<string, CarriedMailbox> only = Assert.Single(carry.Mailboxes);
        Assert.Equal($"{StageIndex}", only.Key);
        Assert.Equal(_mailboxId, only.Value.Id);
    }

    // ---------------------------------------------------------------------------------------------
    // The reply: what reaches onReply, and the envelope that guards it.
    // ---------------------------------------------------------------------------------------------

    [Fact]
    public async Task Reply_DeliveredAndSealed_ReachesOnReplyVerbatim()
    {
        var task = new ArchivingTask();
        WorkflowEngineCommandContext context = CreateContext(Delivered(seq: 3));

        WorkflowEngineCommandResult result = await CreateCommand(task).Execute(context, Step());

        Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        ServiceTaskReply reply = Assert.IsType<ServiceTaskReply>(task.Reply);
        Assert.Equal("<receipt>ok</receipt>", reply.Payload);
        Assert.Equal("fiks-message-42", reply.IdempotencyKey);
        Assert.Equal(new DateTimeOffset(2026, 8, 19, 9, 30, 0, TimeSpan.Zero), reply.AcceptedAt);
        Assert.Equal(3, reply.Position);
        Assert.NotNull(task.ReplyContext);
        Assert.Equal(context.Payload.StepId, task.ReplyContext.StepId);
        // A receipt, so the step is a reply: the send shares the index and does not run again.
        Assert.Equal(["HandleArchiveReply"], task.Ran);
    }

    [Fact]
    public async Task Reply_WithAnEmptyBody_StillReachesOnReply()
    {
        var task = new ArchivingTask();

        await CreateCommand(task).Execute(CreateContext(Delivered(body: "")), Step());

        Assert.NotNull(task.Reply);
        Assert.Equal("", task.Reply.Payload);
    }

    [Fact]
    public async Task Reply_ReadsBackExactlyWhatTheForwarderForwarded()
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

        Assert.NotNull(delivered);
        var task = new ArchivingTask();
        AppCallbackMailbox receipt = new()
        {
            Id = mailboxId,
            Seq = 0,
            Delivery = new AppCallbackMailboxDelivery
            {
                IdempotencyKey = delivered.IdempotencyKey,
                Payload = delivered.Payload,
                AcceptedAt = new DateTimeOffset(2026, 8, 20, 9, 30, 0, TimeSpan.Zero),
            },
        };

        WorkflowEngineCommandResult result = await CreateCommand(task).Execute(CreateContext(receipt), Step());

        Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        Assert.NotNull(task.Reply);
        Assert.Equal(forwardedBody, task.Reply.Payload);
        Assert.Equal(sourceMessageId, task.Reply.IdempotencyKey);
    }

    [Fact]
    public async Task Reply_ThisAppNeverSealed_FailsPermanentlyWithoutRunningTheHandler()
    {
        var task = new ArchivingTask();
        AppCallbackMailbox sealedReply = Delivered();
        Assert.NotNull(sealedReply.Delivery);
        AppCallbackMailbox unsealed = sealedReply with
        {
            Delivery = sealedReply.Delivery with { Payload = "<receipt>ok</receipt>" },
        };
        WorkflowCallbackStateCarry carry = OpenCarry();

        WorkflowEngineCommandResult result = await CreateCommand(task).Execute(CreateContext(unsealed, carry), Step());

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxDeliveryEnvelopeInvalid", failed.ExceptionType);
        Assert.Empty(task.Ran);
        AssertStillCarried(carry);
    }

    public static TheoryData<string, Guid, string, string> ForeignSeals =>
        new()
        {
            { "mailbox", new Guid("018f4e00-0000-7000-8000-0000000000bb"), "archiving", "fiks-message-42" },
            // Sealed for another task's stage — the case the address binding alone would not catch.
            { "service task", _mailboxId, "someOtherArchivingTask", "fiks-message-42" },
            { "idempotency key", _mailboxId, "archiving", "fiks-message-43" },
        };

    [Theory]
    [MemberData(nameof(ForeignSeals))]
    public async Task Reply_SealedForSomethingElse_FailsPermanentlyWithoutRunningTheHandler(
        string what,
        Guid sealedForMailbox,
        string sealedForTask,
        string sealedForKey
    )
    {
        Assert.NotEmpty(what);
        var task = new ArchivingTask();
        AppCallbackMailbox sealedReply = Delivered();
        Assert.NotNull(sealedReply.Delivery);
        AppCallbackMailbox foreign = sealedReply with
        {
            Delivery = sealedReply.Delivery with
            {
                Payload = _envelope.Wrap("<receipt>ok</receipt>", sealedForMailbox, sealedForTask, sealedForKey),
            },
        };

        WorkflowEngineCommandResult result = await CreateCommand(task).Execute(CreateContext(foreign), Step());

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxDeliveryEnvelopeInvalid", failed.ExceptionType);
        Assert.Empty(task.Ran);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Receipt_ThatIsAmbiguous_FailsPermanentlyWithoutRunningEitherHandler(bool both)
    {
        // "Neither" must not read as closed: a closed signal without onTimeout fails the task.
        var task = new ArchivingTask { OnTimeout = () => Task.FromResult(ServiceTaskResult.Completed()) };
        AppCallbackMailbox ambiguous = both
            ? Delivered() with
            {
                DisposedReason = MailboxDisposedReason.Request,
            }
            : new AppCallbackMailbox { Id = _mailboxId, Seq = 0 };

        WorkflowEngineCommandResult result = await CreateCommand(task).Execute(CreateContext(ambiguous), Step());

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxReceiptAmbiguous", failed.ExceptionType);
        Assert.Empty(task.Ran);
    }

    // ---------------------------------------------------------------------------------------------
    // The reply handler's answer.
    // ---------------------------------------------------------------------------------------------

    /// <summary>
    /// Waiting for the next reply enqueues the stage's next receiver: the same stage index, named for the position
    /// just answered, with the stage's options and the reply step's name. The address stays open and carried.
    /// </summary>
    [Fact]
    public async Task AwaitNextReply_AwaitsTheNextMessageForTheSameStage()
    {
        var task = new ArchivingTask { OnReply = _ => Task.FromResult(ServiceTaskReplyResult.AwaitNextReply()) };
        WorkflowCallbackStateCarry carry = OpenCarry();

        WorkflowEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Delivered(seq: 4), carry), Step());

        SuccessfulWorkflowEngineCommandResult success = Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        Assert.Null(success.ProcessNextContinuation);
        MailboxContinuation.AwaitNextMessage awaiting = Assert.IsType<MailboxContinuation.AwaitNextMessage>(
            success.MailboxContinuation
        );
        Assert.Equal(_mailboxId, awaiting.MailboxId);
        Assert.Equal("archiving", awaiting.ServiceTaskType);
        Assert.Equal(StageIndex, awaiting.StageIndex);
        Assert.Equal(4, awaiting.Position);
        Assert.Same(_stageOptions, awaiting.HandlerStepOptions);
        Assert.Equal("Handle archive reply", awaiting.HandlerStepName);
        AssertStillCarried(carry);
    }

    /// <summary>
    /// Done with the replies mid-pipeline: the address closes before the next item's workflow starts, and is
    /// dropped from the state that workflow starts from, so the item after it could open its own.
    /// </summary>
    [Fact]
    public async Task Completed_MidPipeline_ClosesTheAddressAndContinuesToTheNextItem()
    {
        var task = new ArchivingTask();
        WorkflowCallbackStateCarry carry = OpenCarry();

        WorkflowEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Delivered(), carry), Step());

        SuccessfulWorkflowEngineCommandResult success = Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        Assert.Null(success.ProcessNextContinuation);
        MailboxContinuation.ConcludeAndContinue continuing = Assert.IsType<MailboxContinuation.ConcludeAndContinue>(
            success.MailboxContinuation
        );
        Assert.Equal(_mailboxId, continuing.MailboxId);
        Assert.Equal("archiving", continuing.ServiceTaskType);
        Assert.Equal(StageIndex, continuing.Handover.AfterItemIndex);
        Assert.Null(continuing.Handover.Target);
        Assert.Equal([$"{ExecuteServiceTask.Key}: 1"], continuing.Handover.Steps.Select(step => step.OperationId));
        Assert.Null(carry.Mailboxes);
        Assert.Equal(["HandleArchiveReply"], task.Ran);
    }

    [Fact]
    public async Task Completed_OnTheLastItem_ClosesTheAddressAndEndsTheTaskWithNoAction()
    {
        var task = new ArchivingTask { ThenRecord = false };
        WorkflowCallbackStateCarry carry = OpenCarry();

        WorkflowEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Delivered(), carry), Step());

        SuccessfulWorkflowEngineCommandResult success = Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        Assert.NotNull(success.ProcessNextContinuation);
        Assert.Null(success.ProcessNextContinuation.Action);
        MailboxContinuation.Conclude conclude = Assert.IsType<MailboxContinuation.Conclude>(
            success.MailboxContinuation
        );
        Assert.Equal(_mailboxId, conclude.MailboxId);
        Assert.Null(carry.Mailboxes);
    }

    /// <summary>
    /// Ending the task from a reply handler closes the address and moves the process on with the action. Nothing
    /// is planned for the stage composed after it, so that stage never runs.
    /// </summary>
    [Theory]
    [InlineData("reject")]
    [InlineData(null)]
    public async Task EndTask_ClosesTheAddressAndEndsTheTask_WithoutPlanningLaterItems(string? action)
    {
        var task = new ArchivingTask { OnReply = _ => Task.FromResult(ServiceTaskReplyResult.EndTask(action)) };
        WorkflowCallbackStateCarry carry = OpenCarry();

        WorkflowEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Delivered(), carry), Step());

        SuccessfulWorkflowEngineCommandResult success = Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        Assert.NotNull(success.ProcessNextContinuation);
        Assert.Equal(action, success.ProcessNextContinuation.Action);
        MailboxContinuation.Conclude conclude = Assert.IsType<MailboxContinuation.Conclude>(
            success.MailboxContinuation
        );
        Assert.Equal(_mailboxId, conclude.MailboxId);
        Assert.Null(carry.Mailboxes);
        Assert.Equal(["HandleArchiveReply"], task.Ran);
    }

    public static TheoryData<string> NonFinalAnswers => new() { "defer", "retryable", "permanent" };

    private static ServiceTaskReplyResult NonFinalReplyAnswer(string answer) =>
        answer switch
        {
            "defer" => ServiceTaskReplyResult.Defer(TimeSpan.FromMinutes(5), "waiting for the archive to settle"),
            "retryable" => ServiceTaskReplyResult.FailedRetryable("the archive is down"),
            "permanent" => ServiceTaskReplyResult.FailedPermanent("the archive rejected the record"),
            _ => throw new ArgumentOutOfRangeException(nameof(answer), answer, null),
        };

    /// <summary>
    /// A deferral or a failure closes nothing. A permanent failure is a failed step with no continuation for the
    /// relay, and the address stays carried, so a resume runs the handler against the same reply while later
    /// replies wait.
    /// </summary>
    [Theory]
    [MemberData(nameof(NonFinalAnswers))]
    public async Task DeferOrFailure_ClosesNothing_AndLeavesTheCarryAsItWas(string answer)
    {
        var task = new ArchivingTask { OnReply = _ => Task.FromResult(NonFinalReplyAnswer(answer)) };
        WorkflowCallbackStateCarry carry = OpenCarry();

        WorkflowEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Delivered(), carry), Step());

        AssertNonFinal(answer, result);
        AssertStillCarried(carry);
    }

    private static void AssertNonFinal(string answer, WorkflowEngineCommandResult result)
    {
        switch (answer)
        {
            case "defer":
                DeferredWorkflowEngineCommandResult deferred = Assert.IsType<DeferredWorkflowEngineCommandResult>(
                    result
                );
                Assert.Equal(TimeSpan.FromMinutes(5), deferred.Delay);
                break;
            default:
                FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
                Assert.Equal(answer == "permanent", failed.NonRetryable);
                Assert.Equal(ExecuteServiceTask.FailedReasonCode, failed.ExceptionType);
                Assert.StartsWith("Service task 'archiving' failed: ", failed.ErrorMessage, StringComparison.Ordinal);
                break;
        }
    }

    [Fact]
    public async Task Handler_Throws_FailsRetryably_AndClosesNothing()
    {
        var task = new ArchivingTask { OnReply = _ => throw new InvalidOperationException("archive exploded") };
        WorkflowCallbackStateCarry carry = OpenCarry();

        WorkflowEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Delivered(), carry), Step());

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
        Assert.Equal("archive exploded", failed.ErrorMessage);
        AssertStillCarried(carry);
    }

    /// <summary>
    /// The reply vocabulary's own root: a type the mapper does not know fails permanently and names itself, and
    /// closes nothing — closing would pick one of the readings it could have meant.
    /// </summary>
    /// <remarks>
    /// Self-cleaning: closing the copy-constructor route properly stops <c>base(original)</c> compiling, and this
    /// test disappears with the arm it pins.
    /// </remarks>
    private sealed record RogueReplyResult : ServiceTaskReplyResult
    {
        public RogueReplyResult(ServiceTaskReplyResult original)
            : base(original) { }
    }

    [Fact]
    public async Task Handler_WithAnUnrecognisedResultType_FailsPermanentlyAndNamesIt()
    {
        var task = new ArchivingTask
        {
            OnReply = _ =>
                Task.FromResult<ServiceTaskReplyResult>(new RogueReplyResult(ServiceTaskReplyResult.AwaitNextReply())),
        };
        WorkflowCallbackStateCarry carry = OpenCarry();

        WorkflowEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Delivered(), carry), Step());

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ServiceTaskResultUnknown", failed.ExceptionType);
        Assert.Contains(nameof(RogueReplyResult), failed.ErrorMessage, StringComparison.Ordinal);
        AssertStillCarried(carry);
    }

    [Fact]
    public async Task Handler_ReturningNull_FailsPermanentlyWithoutThrowing()
    {
        var task = new ArchivingTask { OnReply = AnswerNull };
        WorkflowCallbackStateCarry carry = OpenCarry();

        WorkflowEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Delivered(), carry), Step());

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ServiceTaskResultUnknown", failed.ExceptionType);
        Assert.Contains("returned null", failed.ErrorMessage, StringComparison.Ordinal);
        AssertStillCarried(carry);
    }

    // ---------------------------------------------------------------------------------------------
    // The closed signal: the address closed (its timeout ran out, or an operator closed it).
    // ---------------------------------------------------------------------------------------------

    /// <summary>
    /// The closed signal runs <c>onTimeout</c>, never <c>onReply</c>, and needs no envelope. Both reasons the engine
    /// gives are handled alike: the reason is not passed to app code. Completing carries on without the replies.
    /// </summary>
    [Theory]
    [InlineData(MailboxDisposedReason.Deadline)]
    [InlineData(MailboxDisposedReason.Request)]
    public async Task Closed_WithOnTimeout_RunsIt_AndCompletedCarriesOnWithoutTheReplies(MailboxDisposedReason reason)
    {
        var task = new ArchivingTask { OnTimeout = () => Task.FromResult(ServiceTaskResult.Completed()) };
        WorkflowCallbackStateCarry carry = OpenCarry();

        WorkflowEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Closed(reason), carry), Step());

        Assert.Equal(["HandleArchiveTimeout"], task.Ran);
        Assert.Null(task.Reply);

        SuccessfulWorkflowEngineCommandResult success = Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        Assert.Null(success.ProcessNextContinuation);
        MailboxContinuation.ConcludeAndContinue continuing = Assert.IsType<MailboxContinuation.ConcludeAndContinue>(
            success.MailboxContinuation
        );
        Assert.Equal(_mailboxId, continuing.MailboxId);
        Assert.Equal([$"{ExecuteServiceTask.Key}: 1"], continuing.Handover.Steps.Select(step => step.OperationId));
        Assert.Null(carry.Mailboxes);
    }

    [Fact]
    public async Task Closed_OnTimeoutCompleted_OnTheLastItem_EndsTheTaskWithNoAction()
    {
        var task = new ArchivingTask
        {
            ThenRecord = false,
            OnTimeout = () => Task.FromResult(ServiceTaskResult.Completed()),
        };

        WorkflowEngineCommandResult result = await CreateCommand(task).Execute(CreateContext(Closed()), Step());

        SuccessfulWorkflowEngineCommandResult success = Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        Assert.NotNull(success.ProcessNextContinuation);
        Assert.Null(success.ProcessNextContinuation.Action);
        Assert.Equal(_mailboxId, Assert.IsType<MailboxContinuation.Conclude>(success.MailboxContinuation).MailboxId);
    }

    [Fact]
    public async Task Closed_OnTimeoutEndTask_EndsTheTaskWithTheAction()
    {
        var task = new ArchivingTask { OnTimeout = () => Task.FromResult(ServiceTaskResult.EndTask("reject")) };
        WorkflowCallbackStateCarry carry = OpenCarry();

        WorkflowEngineCommandResult result = await CreateCommand(task).Execute(CreateContext(Closed(), carry), Step());

        SuccessfulWorkflowEngineCommandResult success = Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        Assert.Equal("reject", success.ProcessNextContinuation?.Action);
        Assert.Equal(_mailboxId, Assert.IsType<MailboxContinuation.Conclude>(success.MailboxContinuation).MailboxId);
        Assert.Null(carry.Mailboxes);
        Assert.Equal(["HandleArchiveTimeout"], task.Ran);
    }

    [Theory]
    [MemberData(nameof(NonFinalAnswers))]
    public async Task Closed_OnTimeoutDeferOrFailure_ClosesNothing_AndLeavesTheCarryAsItWas(string answer)
    {
        var task = new ArchivingTask
        {
            OnTimeout = () =>
                Task.FromResult(
                    answer switch
                    {
                        "defer" => ServiceTaskResult.Defer(TimeSpan.FromMinutes(5)),
                        "retryable" => ServiceTaskResult.FailedRetryable("the archive is down"),
                        _ => ServiceTaskResult.FailedPermanent("the archive never confirmed"),
                    }
                ),
        };
        WorkflowCallbackStateCarry carry = OpenCarry();

        WorkflowEngineCommandResult result = await CreateCommand(task).Execute(CreateContext(Closed(), carry), Step());

        AssertNonFinal(answer, result);
        AssertStillCarried(carry);
    }

    /// <summary>
    /// Without <c>onTimeout</c>, the closed signal fails the task. The message names the stage by its send's
    /// method name and gives its timeout, so an operator can tell which exchange went unanswered.
    /// </summary>
    [Theory]
    [InlineData(MailboxDisposedReason.Deadline)]
    [InlineData(MailboxDisposedReason.Request)]
    public async Task Closed_WithoutOnTimeout_FailsPermanently_NamingTheStageAndItsTimeout(MailboxDisposedReason reason)
    {
        var task = new ArchivingTask();
        WorkflowCallbackStateCarry carry = OpenCarry();

        WorkflowEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Closed(reason), carry), Step());

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ServiceTaskReplyTimedOut", failed.ExceptionType);
        Assert.Contains("'Send to archive' (index 0)", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Contains("timeout of 3.00:00:00", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Empty(task.Ran);
        AssertStillCarried(carry);
    }

    [Fact]
    public async Task Closed_WithoutOnTimeout_OfAStageWithALambdaSend_NamesTheStageByIndex()
    {
        WorkflowEngineCommandResult result = await CreateCommand(new UnnamedStageTask())
            .Execute(CreateContext(Closed()), Step());

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.Equal("ServiceTaskReplyTimedOut", failed.ExceptionType);
        Assert.Contains("its stage at index 0", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Contains("timeout of 2.00:00:00", failed.ErrorMessage, StringComparison.Ordinal);
    }

    // ---------------------------------------------------------------------------------------------
    // Dispatch: the receipt and the pipeline disagree.
    // ---------------------------------------------------------------------------------------------

    [Fact]
    public async Task Receipt_OnAStagesIndex_FailsPermanentlyWithoutRunningIt()
    {
        var task = new ArchivingTask();

        WorkflowEngineCommandResult result = await CreateCommand(task).Execute(CreateContext(Delivered()), Step(1));

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxReceiptOnStage", failed.ExceptionType);
        Assert.Contains("index 1", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Empty(task.Ran);
    }

    /// <summary>
    /// A receive step is dispatched by the index it names, so a pipeline reshaped until that index composes nothing
    /// fails it permanently. The check needs no receipt, so its wording claims none.
    /// </summary>
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Index_PastThePipeline_FailsPermanently(bool withReceipt)
    {
        var task = new ArchivingTask();

        WorkflowEngineCommandResult result = await CreateCommand(task)
            .Execute(withReceipt ? CreateContext(Delivered()) : CreateContext(), Step(5));

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("PipelineItemNotFound", failed.ExceptionType);
        Assert.Contains("composes no pipeline item at index 5", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.DoesNotContain("was handed a mailbox message", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Empty(task.Ran);
    }

    [Theory]
    [InlineData(0, "archive")]
    [InlineData(1, "journal")]
    public async Task Receipt_OnAPipelineOfTwoExternalStages_ReachesTheStageItNames(int stageIndex, string expected)
    {
        var task = new ArchiveThenJournalTask();

        await CreateCommand(task)
            .Execute(CreateContext(Delivered(), new WorkflowCallbackStateCarry()), Step(stageIndex));

        Assert.Equal([expected], task.Answered);
    }

    [Fact]
    public async Task IndexLessStep_IsRefusedWithoutRunningAnyHandler()
    {
        var task = new ArchivingTask();
        WorkflowCallbackStateCarry carry = OpenCarry();

        WorkflowEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Delivered(seq: 5), carry), new ExecuteServiceTaskPayload("archiving"));

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("InvalidPayloadException", failed.ExceptionType);
        Assert.Contains("names no pipeline item", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Empty(task.Ran);
        AssertStillCarried(carry);
    }

    [Fact]
    public async Task IndexLessStep_OnAnUnregisteredServiceTaskType_StillFailsPermanently()
    {
        ExecuteServiceTask command = CreateCommand(new ArchivingTask());

        WorkflowEngineCommandResult result = await command.Execute(
            CreateContext(Delivered()),
            new ExecuteServiceTaskPayload("nonExistentType")
        );

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("InvalidPayloadException", failed.ExceptionType);
        Assert.Contains("nonExistentType", failed.ErrorMessage, StringComparison.Ordinal);
    }
}
