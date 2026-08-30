using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

/// <summary>
/// The relay saga: the three invariants the mailbox design trades an engine-enforced conclusion for. Every test
/// here exists because the property it pins is one a wrong implementation would still compile with.
/// </summary>
public class MailboxRelayTests
{
    private static readonly Guid _instanceGuid = new("2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde");
    private static readonly Guid _mailboxId = new("018f4e00-0000-7000-8000-0000000000aa");
    private const string ServiceTaskType = "archiving";

    /// <summary>The item index of the stage that opens the tested exchanges' mailbox.</summary>
    private const int OpeningStageIndex = 0;

    /// <summary>
    /// The item index of the handler answering that exchange in <see cref="ArchivingTask"/>, the default
    /// pipeline: its terminal, right after the opening stage.
    /// </summary>
    private const int ArchivingReplyIndex = 1;

    /// <summary>
    /// The item index of the mid-pipeline handler in <see cref="ArchiveThenJournalTask"/> and
    /// <see cref="ArchiveThenRecordTask"/>.
    /// </summary>
    private const int SegmentHandlerIndex = 1;
    private static readonly DateTimeOffset _mailboxDeadline = new(2026, 8, 30, 12, 0, 0, TimeSpan.Zero);

    private static readonly Guid _stepId = new("018f4e00-0000-7000-8000-0000000000fe");

    /// <summary>
    /// One log of every engine call the relay makes, in the order it made them — across both the engine client and
    /// the process engine, because the ordering invariant spans the two.
    /// </summary>
    private sealed class RelayRecorder
    {
        public List<string> Calls { get; } = [];

        public List<(
            string Namespace,
            string IdempotencyKey,
            string? CollectionKey,
            WorkflowEnqueueRequest Request
        )> Enqueues { get; } = [];

        public List<Guid> Closes { get; } = [];

        public List<(
            Guid DependsOn,
            string CollectionKey,
            string State,
            string? Action,
            string? IdempotencyKey
        )> AfterWorkflows { get; } = [];
    }

    private sealed class RecordingEngineClient(RelayRecorder recorder) : IWorkflowEngineClient
    {
        public Task<WorkflowEnqueueResponse.Accepted> EnqueueWorkflows(
            string ns,
            string idempotencyKey,
            string? collectionKey,
            WorkflowEnqueueRequest request,
            CancellationToken ct = default
        )
        {
            // The key suffix, not a bare "enqueue": a successor receiver and a continuation are two
            // different moves through this one client method, and an ordering assertion that could not
            // tell them apart would pass on the wrong one.
            recorder.Calls.Add($"enqueue:{idempotencyKey[(idempotencyKey.LastIndexOf(':') + 1)..]}");
            recorder.Enqueues.Add((ns, idempotencyKey, collectionKey, request));
            return Task.FromResult(
                new WorkflowEnqueueResponse.Accepted
                {
                    Workflows = [new WorkflowResult { DatabaseId = Guid.NewGuid(), Namespace = ns }],
                }
            );
        }

        public Task<MailboxResponse?> CloseMailbox(string ns, Guid mailboxId, CancellationToken ct = default)
        {
            recorder.Calls.Add("close-mailbox");
            recorder.Closes.Add(mailboxId);
            return Task.FromResult<MailboxResponse?>(null);
        }

        public Task<MailboxDeliveryResult> DeliverToMailbox(
            string ns,
            Guid mailboxId,
            MailboxDeliveryRequest request,
            CancellationToken ct = default
        ) => throw new NotSupportedException();

        public Task<WorkflowCollectionDetailResponse?> GetCollection(
            string ns,
            string key,
            CancellationToken ct = default
        ) => throw new NotSupportedException();

        public Task<IReadOnlyList<WorkflowStatusResponse>> ListWorkflows(
            string ns,
            string? collectionKey = null,
            Dictionary<string, string>? labels = null,
            IReadOnlyList<PersistentItemStatus>? statuses = null,
            CancellationToken ct = default
        ) => throw new NotSupportedException();

        public Task<CancelWorkflowResponse> CancelWorkflow(
            string ns,
            Guid workflowId,
            CancellationToken ct = default
        ) => throw new NotSupportedException();

        public Task<ResumeWorkflowResponse> ResumeWorkflow(
            string ns,
            Guid workflowId,
            bool cascade = false,
            CancellationToken ct = default
        ) => throw new NotSupportedException();

        public Task<bool> AbandonWorkflow(string ns, Guid workflowId, CancellationToken ct = default) =>
            throw new NotSupportedException();

        public Task<MailboxMintResult> MintMailbox(
            string ns,
            MailboxCreateRequest request,
            CancellationToken ct = default
        ) => throw new NotSupportedException();
    }

    private static MailboxRelay CreateRelay(RelayRecorder recorder, IPipelineServiceTask? serviceTask = null)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        services.AddSingleton(serviceTask ?? new ArchivingTask());
        ServiceProvider sp = services.BuildServiceProvider();

        var processEngine = new Mock<IProcessEngine>(MockBehavior.Strict);
        processEngine
            .Setup(x =>
                x.EnqueueProcessNext(
                    It.IsAny<Instance>(),
                    It.IsAny<Actor>(),
                    It.IsAny<string>(),
                    It.IsAny<Guid>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<Instance, Actor, string, Guid, string, string, string?, string?, CancellationToken>(
                (_, _, _, dependsOn, collectionKey, state, action, idempotencyKey, _) =>
                {
                    recorder.Calls.Add("enqueue-after-workflow");
                    recorder.AfterWorkflows.Add((dependsOn, collectionKey, state, action, idempotencyKey));
                }
            )
            .Returns(Task.CompletedTask);

        return new MailboxRelay(
            new RecordingEngineClient(recorder),
            Mock.Of<IWorkflowCallbackTokenGenerator>(g => g.GenerateToken(It.IsAny<Guid>()) == "callback-token"),
            new ProcessStepOptionsResolver([], sp.GetRequiredService<AppImplementationFactory>()),
            processEngine.Object,
            sp.GetRequiredService<AppImplementationFactory>()
        );
    }

    private static readonly MailboxOptions _mailboxThreeDays = new() { Timeout = TimeSpan.FromDays(3) };

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

    /// <summary>A task that concludes on replies, so the relay has a step shape to build.</summary>
    private sealed class ArchivingTask : IPipelineServiceTask
    {
        public string Type => ServiceTaskType;

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(SendStage, _mailboxThreeDays, out MailboxHandle archive)
                .ConcludeOnReplies(archive, OnMessage, OnClosed);
    }

    /// <summary>The item index of the journal-opening stage in <see cref="ArchiveThenJournalTask"/>.</summary>
    private const int JournalIndex = 3;

    /// <summary>
    /// The item index of the terminal that answers the journal's exchange — one past its opening stage.
    /// </summary>
    private const int JournalTerminalIndex = 4;

    /// <summary>
    /// The archive-then-journal shape: exchange A answered mid-pipeline, a stage between, then exchange B's
    /// send and the terminal that answers it. The segment after A therefore has both a stage and an ending
    /// receive enqueue, so the relay's ordering is visible.
    /// </summary>
    private sealed class ArchiveThenJournalTask : IPipelineServiceTask
    {
        public string Type => ServiceTaskType;

        public ProcessStepOptions? StepOptions => new() { MaxExecutionTime = TimeSpan.FromMinutes(30) };

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(SendStage, _mailboxThreeDays, out MailboxHandle archive)
                .HandleReplies(archive, OnSegmentMessage, OnSegmentClosed)
                .Stage(PlainStage, new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(7) })
                .Stage(SendStage, _mailboxThreeDays, out MailboxHandle journal)
                .ConcludeOnReplies(
                    journal,
                    OnMessage,
                    OnClosed,
                    new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(3) }
                );
    }

    /// <summary>The mid-pipeline reply followed by trailing stages and an ordinary <c>Finally</c>.</summary>
    private sealed class ArchiveThenRecordTask : IPipelineServiceTask
    {
        public string Type => ServiceTaskType;

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(SendStage, _mailboxThreeDays, out MailboxHandle archive)
                .HandleReplies(archive, OnSegmentMessage, OnSegmentClosed)
                .Stage(PlainStage)
                .Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));
    }

    /// <summary>
    /// Both sends up front, so exchange B's clock starts in Main and the segment after A holds no step of its
    /// own — decision 3, seen from the planner's side.
    /// </summary>
    private sealed class UpFrontSendsTask : IPipelineServiceTask
    {
        public string Type => ServiceTaskType;

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(SendStage, _mailboxThreeDays, out MailboxHandle archive)
                .Stage(SendStage, _mailboxThreeDays, out MailboxHandle journal)
                .HandleReplies(archive, OnSegmentMessage, OnSegmentClosed)
                .ConcludeOnReplies(journal, OnMessage, OnClosed);
    }

    private static MailboxRelayRequest CreateRequest(
        Guid stepId,
        Guid? workflowId = null,
        string? state = "published-state",
        bool autoAdvance = true,
        string? action = null
    ) =>
        new()
        {
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, _instanceGuid),
            Payload = new AppCallbackPayload
            {
                CommandKey = ExecuteServiceTask.Key,
                Actor = new Actor { UserId = 1337 },
                LockToken = "lock-token",
                ExecutionReferenceTime = new DateTimeOffset(2026, 8, 19, 10, 0, 0, TimeSpan.Zero),
                WorkflowId = workflowId ?? Guid.NewGuid(),
                StepId = stepId,
                State = "incoming-state",
            },
            Instance = new Instance
            {
                Id = $"1337/{_instanceGuid}",
                Org = "ttd",
                AppId = "ttd/test-app",
                InstanceOwner = new InstanceOwner { PartyId = "1337" },
                Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_2" } },
            },
            State = state,
            AutoAdvanceProcess = autoAdvance,
            AutoAdvanceAction = action,
        };

    private static AppCallbackMailbox Delivered(long seq = 0) =>
        new()
        {
            Id = _mailboxId,
            Seq = seq,
            Delivery = new AppCallbackMailboxDelivery
            {
                IdempotencyKey = $"source-message-{seq}",
                Payload = "<receipt/>",
                AcceptedAt = new DateTimeOffset(2026, 8, 19, 9, 30, 0, TimeSpan.Zero),
            },
        };

    private static AppCallbackMailbox Closed(MailboxDisposedReason reason = MailboxDisposedReason.Deadline) =>
        new()
        {
            Id = _mailboxId,
            Seq = 3,
            DisposedReason = reason,
        };

    // ---------------------------------------------------------------------------------------------
    // Saga invariant 1 — the mailbox is closed before anything downstream is started.
    // ---------------------------------------------------------------------------------------------

    [Fact]
    public async Task Conclusion_ClosesTheMailboxBeforeEnqueueingTheAfterWorkflow()
    {
        var recorder = new RelayRecorder();

        await CreateRelay(recorder)
            .Continue(
                new MailboxContinuation.Conclude(_mailboxId),
                CreateRequest(Guid.NewGuid()),
                CancellationToken.None
            );

        Assert.Equal(["close-mailbox", "enqueue-after-workflow"], recorder.Calls);
        Assert.Equal(_mailboxId, Assert.Single(recorder.Closes));
    }

    [Fact]
    public async Task Conclusion_WithoutAutoAdvance_StillClosesTheMailbox()
    {
        var recorder = new RelayRecorder();

        await CreateRelay(recorder)
            .Continue(
                new MailboxContinuation.Conclude(_mailboxId),
                CreateRequest(Guid.NewGuid(), autoAdvance: false),
                CancellationToken.None
            );

        Assert.Equal(["close-mailbox"], recorder.Calls);
    }

    [Fact]
    public async Task PermanentlyFailedConclusion_ClosesTheMailboxAndStartsNothing()
    {
        var recorder = new RelayRecorder();

        await CreateRelay(recorder)
            .Continue(
                new MailboxContinuation.Conclude(_mailboxId),
                CreateRequest(Guid.NewGuid(), state: null, autoAdvance: false),
                CancellationToken.None
            );

        Assert.Equal(["close-mailbox"], recorder.Calls);
        Assert.Empty(recorder.AfterWorkflows);
    }

    // ---------------------------------------------------------------------------------------------
    // Saga invariant 2 — at most one execution concludes.
    // ---------------------------------------------------------------------------------------------

    [Fact]
    public void MailboxContinuation_HasExactlyThreeAnswers_AndNoneCanMeanAnothers()
    {
        // Structural proof: the continuation type's constructor is private to itself, so the set is closed
        // at three.
        Type[] members = typeof(MailboxContinuation)
            .GetNestedTypes(System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Public)
            .Where(t => typeof(MailboxContinuation).IsAssignableFrom(t))
            .ToArray();

        Assert.Equal(3, members.Length);
        Assert.Contains(typeof(MailboxContinuation.AwaitNextMessage), members);
        Assert.Contains(typeof(MailboxContinuation.Conclude), members);
        Assert.Contains(typeof(MailboxContinuation.ConcludeAndContinue), members);
        Assert.All(members, member => Assert.True(member.IsSealed));

        // The record's synthesized copy constructor is excluded deliberately: it can only clone an instance
        // that already exists, so it adds no member to the set.
        Assert.All(
            typeof(MailboxContinuation).GetConstructors(
                System.Reflection.BindingFlags.Instance
                    | System.Reflection.BindingFlags.Public
                    | System.Reflection.BindingFlags.NonPublic
            ),
            constructor =>
            {
                System.Reflection.ParameterInfo[] parameters = constructor.GetParameters();
                bool isCopyConstructor =
                    parameters.Length == 1 && parameters[0].ParameterType == typeof(MailboxContinuation);
                Assert.True(
                    isCopyConstructor || constructor.IsPrivate,
                    $"MailboxContinuation exposes a constructor a fourth answer could chain to: {constructor}"
                );
            }
        );
    }

    [Fact]
    public async Task AwaitingTheNextMessage_ClosesNothing()
    {
        var recorder = new RelayRecorder();

        await CreateRelay(recorder)
            .Continue(
                new MailboxContinuation.AwaitNextMessage(_mailboxId, ServiceTaskType, ArchivingReplyIndex, position: 0),
                CreateRequest(Guid.NewGuid()),
                CancellationToken.None
            );

        Assert.Equal(["enqueue:mailbox-receive"], recorder.Calls);
        Assert.Empty(recorder.Closes);
        Assert.Empty(recorder.AfterWorkflows);
    }

    // ---------------------------------------------------------------------------------------------
    // Saga invariant 3 — every mid-callback call keys off the executing step.
    // ---------------------------------------------------------------------------------------------

    [Fact]
    public async Task EverySagaEnqueue_KeysOffTheExecutingStep()
    {
        var stepId = new Guid("018f4e00-0000-7000-8000-00000000dead");

        var awaiting = new RelayRecorder();
        await CreateRelay(awaiting)
            .Continue(
                new MailboxContinuation.AwaitNextMessage(_mailboxId, ServiceTaskType, ArchivingReplyIndex, position: 1),
                CreateRequest(stepId),
                CancellationToken.None
            );

        var concluding = new RelayRecorder();
        await CreateRelay(concluding)
            .Continue(new MailboxContinuation.Conclude(_mailboxId), CreateRequest(stepId), CancellationToken.None);

        Assert.Equal(
            EnqueueReceiveWorkflow.CreateIdempotencyKey(stepId),
            Assert.Single(awaiting.Enqueues).IdempotencyKey
        );
        Assert.Equal(
            MailboxRelay.CreateAfterWorkflowIdempotencyKey(stepId),
            Assert.Single(concluding.AfterWorkflows).IdempotencyKey
        );

        var otherStep = new RelayRecorder();
        await CreateRelay(otherStep)
            .Continue(
                new MailboxContinuation.AwaitNextMessage(_mailboxId, ServiceTaskType, ArchivingReplyIndex, position: 1),
                CreateRequest(Guid.NewGuid()),
                CancellationToken.None
            );
        Assert.NotEqual(
            Assert.Single(awaiting.Enqueues).IdempotencyKey,
            Assert.Single(otherStep.Enqueues).IdempotencyKey
        );
    }

    [Fact]
    public async Task ReplayedAttemptOfOneStep_ProducesTheSameKeys()
    {
        var stepId = Guid.NewGuid();
        var recorder = new RelayRecorder();
        MailboxRelay relay = CreateRelay(recorder);

        var continuation = new MailboxContinuation.AwaitNextMessage(
            _mailboxId,
            ServiceTaskType,
            ArchivingReplyIndex,
            position: 0
        );
        await relay.Continue(continuation, CreateRequest(stepId), CancellationToken.None);
        await relay.Continue(continuation, CreateRequest(stepId), CancellationToken.None);

        Assert.Equal(2, recorder.Enqueues.Count);
        Assert.Equal(recorder.Enqueues[0].IdempotencyKey, recorder.Enqueues[1].IdempotencyKey);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void AVerdictThatWouldMakeAKeyedCall_IsRefusedWhenTheEngineSuppliedNoStepId(bool awaitNext)
    {
        // StepId is deliberately not required on the payload, and an empty id is a constant — every exchange
        // would share two keys. Reachable: an engine rolled back while a receiver is Held.
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStageIndex, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.Decide(
            awaitNext ? ServiceTaskExchangeResult.AwaitNextReply() : ServiceTaskResult.Success(),
            ServiceTaskType,
            Guid.Empty,
            Delivered(),
            carry,
            ArchivingReplyIndex,
            OpeningStageIndex
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxStepIdMissing", failed.ExceptionType);
        Assert.Null(failed.MailboxContinuation);
        Assert.NotNull(carry.FindMailbox(OpeningStageIndex));
    }

    [Fact]
    public void AVerdictThatMakesNoKeyedCall_IsUnaffectedByAMissingStepId()
    {
        // Refusing this too would take the close with it.
        var carry = new WorkflowCallbackStateCarry();

        Assert.IsType<SuccessfulProcessEngineCommandResult>(
            MailboxRelay.Decide(
                ServiceTaskResult.SuccessWithoutAutoAdvance(),
                ServiceTaskType,
                Guid.Empty,
                Delivered(),
                carry,
                ArchivingReplyIndex,
                OpeningStageIndex
            )
        );

        FailedProcessEngineCommandResult permanent = Assert.IsType<FailedProcessEngineCommandResult>(
            MailboxRelay.Decide(
                ServiceTaskResult.FailedPermanent("the archive never confirmed"),
                ServiceTaskType,
                Guid.Empty,
                Closed(),
                new WorkflowCallbackStateCarry(),
                ArchivingReplyIndex,
                OpeningStageIndex
            )
        );
        Assert.IsType<MailboxContinuation.Conclude>(permanent.MailboxContinuation);

        FailedProcessEngineCommandResult retryable = Assert.IsType<FailedProcessEngineCommandResult>(
            MailboxRelay.Decide(
                ServiceTaskResult.FailedRetryable("the archive is down"),
                ServiceTaskType,
                Guid.Empty,
                Delivered(),
                new WorkflowCallbackStateCarry(),
                ArchivingReplyIndex,
                OpeningStageIndex
            )
        );
        Assert.False(retryable.NonRetryable);

        Assert.IsType<DeferredProcessEngineCommandResult>(
            MailboxRelay.Decide(
                ServiceTaskResult.Defer(TimeSpan.FromMinutes(1)),
                ServiceTaskType,
                Guid.Empty,
                Delivered(),
                new WorkflowCallbackStateCarry(),
                ArchivingReplyIndex,
                OpeningStageIndex
            )
        );
    }

    [Fact]
    public async Task SuccessorReceiver_IsAHeadThatDependsOnHeads_AndCarriesTheExchangesMailbox()
    {
        var recorder = new RelayRecorder();

        await CreateRelay(recorder)
            .Continue(
                new MailboxContinuation.AwaitNextMessage(_mailboxId, ServiceTaskType, ArchivingReplyIndex, position: 2),
                CreateRequest(Guid.NewGuid()),
                CancellationToken.None
            );

        (string ns, _, string? collectionKey, WorkflowEnqueueRequest request) = Assert.Single(recorder.Enqueues);
        Assert.Equal("ttd/test-app", ns);
        Assert.Equal(_instanceGuid.ToString(), collectionKey);

        WorkflowRequest successor = Assert.Single(request.Workflows);
        Assert.True(successor.IsHead);
        Assert.True(successor.DependsOnHeads);
        Assert.Null(successor.StartAt);
        Assert.Equal(_mailboxId, successor.Mailbox?.Id);
        Assert.Equal("published-state", successor.State);

        Assert.NotNull(request.Labels);
        Assert.Equal(
            _instanceGuid.ToString("N", CultureInfo.InvariantCulture),
            request.Labels[ProcessNextRequestFactory.ProcessNextInstanceGuidLabel]
        );
        Assert.Equal("Task_2:0", request.Labels[ProcessNextRequestFactory.ProcessNextTargetIdLabel]);
        Assert.Equal("Task_2", request.Labels[ProcessNextRequestFactory.ProcessNextTargetTaskLabel]);
        Assert.False(request.Labels.ContainsKey(ProcessNextRequestFactory.ProcessNextSourceIdLabel));

        StepRequest step = Assert.Single(successor.Steps);
        Assert.Equal($"{ExecuteServiceTask.Key}: {ArchivingReplyIndex}", step.OperationId);
        Assert.Contains(ServiceTaskType, step.Command.Data.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task SuccessorReceiver_NamesTheHandlerTheContinuationCarried()
    {
        var recorder = new RelayRecorder();

        await CreateRelay(recorder)
            .Continue(
                new MailboxContinuation.AwaitNextMessage(_mailboxId, ServiceTaskType, ArchivingReplyIndex, position: 4),
                CreateRequest(Guid.NewGuid()),
                CancellationToken.None
            );

        StepRequest step = Assert.Single(Assert.Single(Assert.Single(recorder.Enqueues).Request.Workflows).Steps);
        var appData = JsonSerializer.Deserialize<AppCommandData>(step.Command.Data!.Value)!;
        Assert.Equal(ExecuteServiceTask.Key, appData.CommandKey);

        var payload = CommandPayloadSerializer.Deserialize<ExecuteServiceTaskPayload>(appData.Payload)!;
        Assert.Equal(ServiceTaskType, payload.ServiceTaskType);
        Assert.Equal(ArchivingReplyIndex, payload.ItemIndex);
        Assert.Equal(ArchivingReplyIndex, step.ServiceTaskItemIndex);
    }

    [Fact]
    public async Task SuccessorReceiver_CarriesAFreshCallbackTokenAndTheTransitionsLockToken()
    {
        var recorder = new RelayRecorder();

        await CreateRelay(recorder)
            .Continue(
                new MailboxContinuation.AwaitNextMessage(_mailboxId, ServiceTaskType, ArchivingReplyIndex, position: 0),
                CreateRequest(Guid.NewGuid()),
                CancellationToken.None
            );

        AppWorkflowContext context = Assert
            .Single(recorder.Enqueues)
            .Request.Context!.Value.Deserialize<AppWorkflowContext>()!;
        Assert.Equal("callback-token", context.CallbackToken);
        Assert.Equal("lock-token", context.LockToken);
        Assert.Equal(_instanceGuid, context.InstanceGuid);
    }

    [Fact]
    public async Task AfterWorkflow_DependsOnTheConcludingReceiverAndCarriesItsPublishedState()
    {
        var workflowId = Guid.NewGuid();
        var recorder = new RelayRecorder();

        await CreateRelay(recorder)
            .Continue(
                new MailboxContinuation.Conclude(_mailboxId),
                CreateRequest(Guid.NewGuid(), workflowId, action: "reject"),
                CancellationToken.None
            );

        (Guid dependsOn, string collectionKey, string state, string? action, _) = Assert.Single(
            recorder.AfterWorkflows
        );
        Assert.Equal(workflowId, dependsOn);
        Assert.Equal(_instanceGuid.ToString(), collectionKey);
        Assert.Equal("published-state", state);
        Assert.Equal("reject", action);
    }

    /// <summary>
    /// A verdict the saga has no move for. Reachable from app code by chaining a record's protected copy
    /// constructor, so it must converge rather than throw into the caller's retry ladder — and it must leave
    /// the exchange alone: what closes the mailbox here is the app having concluded, and an unrecognised
    /// verdict is no conclusion. Closing would pick one of the three readings it could have meant and lose
    /// the answer even after the author fixes the bug.
    /// </summary>
    /// <remarks>
    /// Self-cleaning: closing the copy-constructor route properly stops <c>base(original)</c> compiling, and
    /// this test disappears with the arm it pins.
    /// </remarks>
    private sealed record RogueVerdict : ServiceTaskExchangeResult
    {
        public RogueVerdict(ServiceTaskExchangeResult original)
            : base(original) { }
    }

    [Fact]
    public void UnrecognisedVerdict_FailsPermanentlyNamesTheTypeAndLeavesTheExchangeOpen()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStageIndex, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.Decide(
            new RogueVerdict(ServiceTaskResult.Success()),
            ServiceTaskType,
            _stepId,
            Delivered(),
            carry,
            ArchivingReplyIndex,
            OpeningStageIndex
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ServiceTaskResultUnknown", failed.ExceptionType);
        Assert.Contains(nameof(RogueVerdict), failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Null(failed.MailboxContinuation);
    }

    [Fact]
    public void Success_ConcludesAndStopsTheMailboxIdTraveling()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStageIndex, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.Decide(
            ServiceTaskResult.Success("confirm"),
            ServiceTaskType,
            _stepId,
            Delivered(),
            carry,
            ArchivingReplyIndex,
            OpeningStageIndex
        );

        SuccessfulProcessEngineCommandResult success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.True(success.AutoAdvanceProcess);
        Assert.Equal("confirm", success.AutoAdvanceAction);
        Assert.IsType<MailboxContinuation.Conclude>(success.MailboxContinuation);
        Assert.Null(carry.FindMailbox(OpeningStageIndex));
    }

    [Fact]
    public void SuccessWithoutAutoAdvance_ConcludesTheExchangeWithoutAdvancingTheProcess()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStageIndex, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.Decide(
            ServiceTaskResult.SuccessWithoutAutoAdvance(),
            ServiceTaskType,
            _stepId,
            Delivered(),
            carry,
            ArchivingReplyIndex,
            OpeningStageIndex
        );

        SuccessfulProcessEngineCommandResult success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.False(success.AutoAdvanceProcess);
        Assert.IsType<MailboxContinuation.Conclude>(success.MailboxContinuation);
    }

    [Fact]
    public void AwaitNextReply_OnADeliveredMessage_ContinuesTheExchangeWithoutAdvancing()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStageIndex, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.Decide(
            ServiceTaskExchangeResult.AwaitNextReply(),
            ServiceTaskType,
            _stepId,
            Delivered(seq: 4),
            carry,
            ArchivingReplyIndex,
            OpeningStageIndex
        );

        SuccessfulProcessEngineCommandResult success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.False(success.AutoAdvanceProcess);
        MailboxContinuation.AwaitNextMessage awaiting = Assert.IsType<MailboxContinuation.AwaitNextMessage>(
            success.MailboxContinuation
        );
        Assert.Equal(_mailboxId, awaiting.MailboxId);
        Assert.Equal(ServiceTaskType, awaiting.ServiceTaskType);
        Assert.Equal(ArchivingReplyIndex, awaiting.HandlerItemIndex);
        Assert.Equal(4, awaiting.Position);
        Assert.NotNull(carry.FindMailbox(OpeningStageIndex));
    }

    [Fact]
    public void FailedPermanent_ConcludesTheExchangeAndFailsTheStep()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStageIndex, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.Decide(
            ServiceTaskResult.FailedPermanent("the archive never confirmed"),
            ServiceTaskType,
            _stepId,
            Closed(MailboxDisposedReason.Deadline),
            carry,
            ArchivingReplyIndex,
            OpeningStageIndex
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Contains("the archive never confirmed", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.IsType<MailboxContinuation.Conclude>(failed.MailboxContinuation);
        Assert.NotNull(carry.FindMailbox(OpeningStageIndex));
    }

    [Fact]
    public void FailedRetryable_StartsNoSagaAtAll()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStageIndex, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.Decide(
            ServiceTaskResult.FailedRetryable("the archive is down"),
            ServiceTaskType,
            _stepId,
            Delivered(),
            carry,
            ArchivingReplyIndex,
            OpeningStageIndex
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
        Assert.Null(failed.MailboxContinuation);
        Assert.NotNull(carry.FindMailbox(OpeningStageIndex));
    }

    [Fact]
    public void Defer_ParksTheReceiverAndChangesNothingAboutTheExchange()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStageIndex, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.Decide(
            ServiceTaskResult.Defer(TimeSpan.FromMinutes(5), "waiting for the archive to settle"),
            ServiceTaskType,
            _stepId,
            Delivered(),
            carry,
            ArchivingReplyIndex,
            OpeningStageIndex
        );

        DeferredProcessEngineCommandResult deferred = Assert.IsType<DeferredProcessEngineCommandResult>(result);
        Assert.Equal(TimeSpan.FromMinutes(5), deferred.Delay);
        Assert.NotNull(carry.FindMailbox(OpeningStageIndex));
    }

    // ---------------------------------------------------------------------------------------------
    // The stage vocabulary — a handler the pipeline carries on past, and the moves its verdicts start.
    // ---------------------------------------------------------------------------------------------

    /// <summary>
    /// The fourth of the copy-constructor probes, one per root the runtime maps: a verdict
    /// <see cref="MailboxRelay.DecideSegment"/> has no move for. Reachable from app code by chaining a
    /// record's protected copy constructor, so it must converge rather than throw into the caller's retry
    /// ladder — and leave the exchange alone, for the reason its terminal-vocabulary sibling gives.
    /// </summary>
    /// <remarks>
    /// Self-cleaning, like its three siblings: closing the copy-constructor route properly stops
    /// <c>base(original)</c> compiling, and this test disappears with the arm it pins.
    /// </remarks>
    private sealed record RogueStageVerdict : ServiceTaskStageExchangeResult
    {
        public RogueStageVerdict(ServiceTaskStageExchangeResult original)
            : base(original) { }
    }

    [Fact]
    public void UnrecognisedStageVerdict_FailsPermanentlyNamesTheTypeAndLeavesTheExchangeOpen()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStageIndex, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.DecideSegment(
            new RogueStageVerdict(ServiceTaskStageResult.Completed()),
            ServiceTaskType,
            _stepId,
            Delivered(),
            carry,
            SegmentHandlerIndex,
            OpeningStageIndex
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ServiceTaskResultUnknown", failed.ExceptionType);
        Assert.Contains(nameof(RogueStageVerdict), failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Null(failed.MailboxContinuation);
        Assert.NotNull(carry.FindMailbox(OpeningStageIndex));
    }

    [Fact]
    public void SegmentCompleted_ConcludesTheExchangeAndAsksForThePipelinesNextSegment()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStageIndex, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.DecideSegment(
            ServiceTaskStageResult.Completed(),
            ServiceTaskType,
            _stepId,
            Delivered(),
            carry,
            SegmentHandlerIndex,
            OpeningStageIndex
        );

        SuccessfulProcessEngineCommandResult success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.False(success.AutoAdvanceProcess);
        Assert.Null(success.AutoAdvanceAction);

        MailboxContinuation.ConcludeAndContinue continuing = Assert.IsType<MailboxContinuation.ConcludeAndContinue>(
            success.MailboxContinuation
        );
        Assert.Equal(_mailboxId, continuing.MailboxId);
        Assert.Equal(ServiceTaskType, continuing.ServiceTaskType);
        Assert.Equal(SegmentHandlerIndex, continuing.HandlerItemIndex);
        Assert.Equal(OpeningStageIndex, continuing.OpeningStageIndex);

        Assert.Null(carry.FindMailbox(OpeningStageIndex));
    }

    [Fact]
    public void SegmentAwaitNextReply_ContinuesTheExchangeExactlyAsATerminalsDoes()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStageIndex, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.DecideSegment(
            ServiceTaskStageExchangeResult.AwaitNextReply(),
            ServiceTaskType,
            _stepId,
            Delivered(seq: 6),
            carry,
            SegmentHandlerIndex,
            OpeningStageIndex
        );

        SuccessfulProcessEngineCommandResult success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        MailboxContinuation.AwaitNextMessage awaiting = Assert.IsType<MailboxContinuation.AwaitNextMessage>(
            success.MailboxContinuation
        );
        Assert.Equal(_mailboxId, awaiting.MailboxId);
        Assert.Equal(ServiceTaskType, awaiting.ServiceTaskType);
        Assert.Equal(SegmentHandlerIndex, awaiting.HandlerItemIndex);
        Assert.Equal(6, awaiting.Position);
        Assert.NotNull(carry.FindMailbox(OpeningStageIndex));
    }

    /// <summary>
    /// The failure closes the exchange it belongs to and starts nothing — not the next segment either. A
    /// later mailbox already open is untouched, which is what lets a resume replay this handler and carry the
    /// chain on.
    /// </summary>
    [Fact]
    public void SegmentFailedPermanent_ClosesItsOwnMailboxAndStartsNothing()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStageIndex, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.DecideSegment(
            ServiceTaskStageResult.FailedPermanent("the archive never confirmed"),
            ServiceTaskType,
            _stepId,
            Closed(),
            carry,
            SegmentHandlerIndex,
            OpeningStageIndex
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Contains("the archive never confirmed", failed.ErrorMessage, StringComparison.Ordinal);
        MailboxContinuation.Conclude conclude = Assert.IsType<MailboxContinuation.Conclude>(failed.MailboxContinuation);
        Assert.Equal(_mailboxId, conclude.MailboxId);
        Assert.NotNull(carry.FindMailbox(OpeningStageIndex));
    }

    [Fact]
    public void SegmentFailedRetryable_StartsNoSagaAtAll()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStageIndex, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.DecideSegment(
            ServiceTaskStageResult.FailedRetryable("the archive is down"),
            ServiceTaskType,
            _stepId,
            Delivered(),
            carry,
            SegmentHandlerIndex,
            OpeningStageIndex
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
        Assert.Null(failed.MailboxContinuation);
        Assert.NotNull(carry.FindMailbox(OpeningStageIndex));
    }

    [Fact]
    public void SegmentDefer_ParksTheReceiverAndChangesNothingAboutTheExchange()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStageIndex, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.DecideSegment(
            ServiceTaskStageResult.Defer(TimeSpan.FromMinutes(5), "waiting for the archive to settle"),
            ServiceTaskType,
            _stepId,
            Delivered(),
            carry,
            SegmentHandlerIndex,
            OpeningStageIndex
        );

        DeferredProcessEngineCommandResult deferred = Assert.IsType<DeferredProcessEngineCommandResult>(result);
        Assert.Equal(TimeSpan.FromMinutes(5), deferred.Delay);
        Assert.Equal("waiting for the archive to settle", deferred.Reason);
        Assert.NotNull(carry.FindMailbox(OpeningStageIndex));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void ASegmentVerdictThatWouldMakeAKeyedCall_IsRefusedWhenTheEngineSuppliedNoStepId(bool awaitNext)
    {
        // Both of this vocabulary's keyed verdicts: the successor's key and the continuation's are both the
        // executing step's, and an empty id is a constant every exchange in the application would share.
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStageIndex, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.DecideSegment(
            awaitNext ? ServiceTaskStageExchangeResult.AwaitNextReply() : ServiceTaskStageResult.Completed(),
            ServiceTaskType,
            Guid.Empty,
            Delivered(),
            carry,
            SegmentHandlerIndex,
            OpeningStageIndex
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxStepIdMissing", failed.ExceptionType);
        Assert.Null(failed.MailboxContinuation);
        // Refused before anything is recorded: the exchange is untouched, so a fixed engine replays it.
        Assert.NotNull(carry.FindMailbox(OpeningStageIndex));
    }

    [Fact]
    public void ASegmentVerdictThatMakesNoKeyedCall_IsUnaffectedByAMissingStepId()
    {
        FailedProcessEngineCommandResult permanent = Assert.IsType<FailedProcessEngineCommandResult>(
            MailboxRelay.DecideSegment(
                ServiceTaskStageResult.FailedPermanent("the archive never confirmed"),
                ServiceTaskType,
                Guid.Empty,
                Closed(),
                new WorkflowCallbackStateCarry(),
                SegmentHandlerIndex,
                OpeningStageIndex
            )
        );
        Assert.IsType<MailboxContinuation.Conclude>(permanent.MailboxContinuation);

        Assert.IsType<DeferredProcessEngineCommandResult>(
            MailboxRelay.DecideSegment(
                ServiceTaskStageResult.Defer(TimeSpan.FromMinutes(1)),
                ServiceTaskType,
                Guid.Empty,
                Delivered(),
                new WorkflowCallbackStateCarry(),
                SegmentHandlerIndex,
                OpeningStageIndex
            )
        );
    }

    // ---------------------------------------------------------------------------------------------
    // The continuation — close mailbox k, then start segment k.
    // ---------------------------------------------------------------------------------------------

    private static MailboxContinuation.ConcludeAndContinue Continuing(
        int handlerItemIndex = SegmentHandlerIndex,
        int openingStageIndex = OpeningStageIndex
    ) => new(_mailboxId, ServiceTaskType, handlerItemIndex, openingStageIndex);

    private static List<string> StepOperationIds(WorkflowRequest workflow) =>
        workflow.Steps.Select(step => step.OperationId).ToList();

    private static EnqueueReceiveWorkflowPayload ReceiveEnqueuePayload(WorkflowRequest workflow)
    {
        StepRequest step = workflow.Steps.Single(s => s.OperationId == EnqueueReceiveWorkflow.Key);
        var appData = JsonSerializer.Deserialize<AppCommandData>(step.Command.Data!.Value)!;
        Assert.Equal(EnqueueReceiveWorkflow.Key, appData.CommandKey);
        return CommandPayloadSerializer.Deserialize<EnqueueReceiveWorkflowPayload>(appData.Payload)!;
    }

    [Fact]
    public async Task ConcludeAndContinue_ClosesTheMailboxBeforeEnqueueingTheContinuation()
    {
        var recorder = new RelayRecorder();

        await CreateRelay(recorder, new ArchiveThenJournalTask())
            .Continue(Continuing(), CreateRequest(Guid.NewGuid()), CancellationToken.None);

        // The reverse order compiles, and would let a message land in an exchange the pipeline has moved past.
        Assert.Equal(["close-mailbox", "enqueue:mailbox-continue"], recorder.Calls);
        Assert.Equal(_mailboxId, Assert.Single(recorder.Closes));
        Assert.Empty(recorder.AfterWorkflows);
    }

    [Fact]
    public async Task Continuation_IsAHeadThatDependsOnHeads_AndCarriesThePublishedStateButNoRendezvous()
    {
        var stepId = new Guid("018f4e00-0000-7000-8000-00000000beef");
        var recorder = new RelayRecorder();

        await CreateRelay(recorder, new ArchiveThenJournalTask())
            .Continue(Continuing(), CreateRequest(stepId), CancellationToken.None);

        (string ns, string idempotencyKey, string? collectionKey, WorkflowEnqueueRequest request) = Assert.Single(
            recorder.Enqueues
        );
        Assert.Equal("ttd/test-app", ns);
        Assert.Equal(MailboxRelay.CreateContinuationIdempotencyKey(stepId), idempotencyKey);
        Assert.Equal($"{stepId}:mailbox-continue", idempotencyKey);
        Assert.Equal(_instanceGuid.ToString(), collectionKey);

        WorkflowRequest continuation = Assert.Single(request.Workflows);
        Assert.True(continuation.IsHead);
        Assert.True(continuation.DependsOnHeads);
        Assert.Null(continuation.StartAt);
        Assert.Equal("published-state", continuation.State);
        Assert.Null(continuation.Mailbox);
        Assert.Equal("Mailbox continue: Task_2 · after 0", continuation.OperationId);

        Assert.NotNull(request.Labels);
        Assert.Equal(
            _instanceGuid.ToString("N", CultureInfo.InvariantCulture),
            request.Labels[ProcessNextRequestFactory.ProcessNextInstanceGuidLabel]
        );
        Assert.Equal("Task_2:0", request.Labels[ProcessNextRequestFactory.ProcessNextTargetIdLabel]);
        Assert.Equal("Task_2", request.Labels[ProcessNextRequestFactory.ProcessNextTargetTaskLabel]);

        AppWorkflowContext context = request.Context!.Value.Deserialize<AppWorkflowContext>()!;
        Assert.Equal("callback-token", context.CallbackToken);
        Assert.Equal("lock-token", context.LockToken);
        Assert.Equal(_instanceGuid, context.InstanceGuid);
    }

    /// <summary>
    /// Frontier-never-empty on this hop: the step that enqueues the next exchange's receiver is the
    /// continuation's <em>last</em>, exactly as it is Main's — so the continuation cannot settle before the
    /// receiver it hands over to exists.
    /// </summary>
    [Fact]
    public async Task Continuation_RunsTheItemsAfterTheHandler_AndEndsByEnqueueingTheNextExchangesReceiver()
    {
        var recorder = new RelayRecorder();

        await CreateRelay(recorder, new ArchiveThenJournalTask())
            .Continue(Continuing(), CreateRequest(Guid.NewGuid()), CancellationToken.None);

        WorkflowRequest continuation = Assert.Single(Assert.Single(recorder.Enqueues).Request.Workflows);
        Assert.Equal(
            [
                $"{ExecuteServiceTask.Key}: 2",
                $"{MintMailbox.Key}: {JournalIndex}",
                $"{ExecuteServiceTask.Key}: {JournalIndex}",
                EnqueueReceiveWorkflow.Key,
            ],
            StepOperationIds(continuation)
        );

        // The exchange just concluded is behind it: nothing re-mints or re-sends the archive.
        Assert.DoesNotContain($"{MintMailbox.Key}: {OpeningStageIndex}", StepOperationIds(continuation));

        EnqueueReceiveWorkflowPayload receive = ReceiveEnqueuePayload(continuation);
        Assert.Equal(JournalIndex, receive.OpeningStageIndex);
        WorkflowRequest receiver = Assert.Single(receive.EnqueueRequest.Workflows);
        Assert.True(receiver.IsHead);
        Assert.True(receiver.DependsOnHeads);
        Assert.StartsWith(
            ProcessNextRequestFactory.MailboxReceiveOperationIdPrefix,
            receiver.OperationId,
            StringComparison.Ordinal
        );
        // Filled in when that step executes, from the state and carry it is handed then.
        Assert.Null(receiver.Mailbox);
        Assert.Null(receiver.State);

        StepRequest receiveStep = Assert.Single(receiver.Steps);
        var appData = JsonSerializer.Deserialize<AppCommandData>(receiveStep.Command.Data!.Value)!;
        var payload = CommandPayloadSerializer.Deserialize<ExecuteServiceTaskPayload>(appData.Payload)!;
        Assert.Equal(ServiceTaskType, payload.ServiceTaskType);
        Assert.Equal(JournalTerminalIndex, payload.ItemIndex);
    }

    /// <summary>
    /// The segment is planned from the handler index the continuation carries, with no lookup of its own: a
    /// continuation whose <em>opening</em> index is nonsense plans exactly the same segment.
    /// </summary>
    [Fact]
    public async Task Continuation_PlansFromTheCarriedHandlerIndex_NotFromTheExchangeItClosed()
    {
        var recorder = new RelayRecorder();

        await CreateRelay(recorder, new ArchiveThenJournalTask())
            .Continue(
                Continuing(handlerItemIndex: SegmentHandlerIndex, openingStageIndex: 99),
                CreateRequest(Guid.NewGuid()),
                CancellationToken.None
            );

        WorkflowRequest continuation = Assert.Single(Assert.Single(recorder.Enqueues).Request.Workflows);
        Assert.Equal(
            [
                $"{ExecuteServiceTask.Key}: 2",
                $"{MintMailbox.Key}: {JournalIndex}",
                $"{ExecuteServiceTask.Key}: {JournalIndex}",
                EnqueueReceiveWorkflow.Key,
            ],
            StepOperationIds(continuation)
        );

        Assert.Equal("Mailbox continue: Task_2 · after 99", continuation.OperationId);
    }

    /// <summary>
    /// Decision 3 from the planner's side: with both sends composed up front, the segment after the first
    /// handler holds no step of its own and is a bare hand-over to the next exchange's receiver.
    /// </summary>
    [Fact]
    public async Task Continuation_ForUpFrontSends_IsABareReceiveEnqueue()
    {
        var recorder = new RelayRecorder();

        await CreateRelay(recorder, new UpFrontSendsTask())
            .Continue(
                // Both sends come first here, so the archive's handler sits at item index 2.
                Continuing(handlerItemIndex: 2),
                CreateRequest(Guid.NewGuid()),
                CancellationToken.None
            );

        WorkflowRequest continuation = Assert.Single(Assert.Single(recorder.Enqueues).Request.Workflows);
        Assert.Equal([EnqueueReceiveWorkflow.Key], StepOperationIds(continuation));
        // UpFrontSendsTask composes the journal's send at item index 1, and its handler — the terminal — at 3.
        Assert.Equal(1, ReceiveEnqueuePayload(continuation).OpeningStageIndex);
    }

    [Fact]
    public async Task Continuation_OfAPipelineThatEndsWithAFinalStep_EndsWithTheConcludingStep()
    {
        var recorder = new RelayRecorder();

        await CreateRelay(recorder, new ArchiveThenRecordTask())
            .Continue(Continuing(), CreateRequest(Guid.NewGuid()), CancellationToken.None);

        WorkflowRequest continuation = Assert.Single(Assert.Single(recorder.Enqueues).Request.Workflows);
        Assert.Equal([$"{ExecuteServiceTask.Key}: 2", $"{ExecuteServiceTask.Key}: 3"], StepOperationIds(continuation));

        var appData = JsonSerializer.Deserialize<AppCommandData>(continuation.Steps[^1].Command.Data!.Value)!;
        var payload = CommandPayloadSerializer.Deserialize<ExecuteServiceTaskPayload>(appData.Payload)!;
        Assert.Equal(3, payload.ItemIndex);
    }

    /// <summary>
    /// The continuation's steps resolve their options the way the factory resolves Main's: each step's own,
    /// found by the identity it carries, over the task's.
    /// </summary>
    [Fact]
    public async Task Continuation_ResolvesEachStepsOwnOptions()
    {
        var recorder = new RelayRecorder();

        await CreateRelay(recorder, new ArchiveThenJournalTask())
            .Continue(Continuing(), CreateRequest(Guid.NewGuid()), CancellationToken.None);

        WorkflowRequest continuation = Assert.Single(Assert.Single(recorder.Enqueues).Request.Workflows);

        StepRequest record = continuation.Steps.Single(s => s.OperationId == $"{ExecuteServiceTask.Key}: 2");
        Assert.Equal(TimeSpan.FromMinutes(7), record.Command.MaxExecutionTime);

        StepRequest send = continuation.Steps.Single(s => s.OperationId == $"{ExecuteServiceTask.Key}: {JournalIndex}");
        Assert.Equal(TimeSpan.FromMinutes(30), send.Command.MaxExecutionTime);

        // One HTTP call: the mint takes the engine's defaults, never the declaring stage's or the task's.
        StepRequest mint = continuation.Steps.Single(s => s.OperationId == $"{MintMailbox.Key}: {JournalIndex}");
        Assert.Null(mint.Command.MaxExecutionTime);

        // The receiver's step is the terminal's, resolved through the handler item index it carries.
        StepRequest receiveStep = Assert.Single(
            Assert.Single(ReceiveEnqueuePayload(continuation).EnqueueRequest.Workflows).Steps
        );
        Assert.Equal(TimeSpan.FromMinutes(3), receiveStep.Command.MaxExecutionTime);
    }

    [Fact]
    public async Task ReplayedContinuationOfOneStep_ProducesTheSameKey()
    {
        var stepId = Guid.NewGuid();
        var recorder = new RelayRecorder();
        MailboxRelay relay = CreateRelay(recorder, new ArchiveThenJournalTask());

        await relay.Continue(Continuing(), CreateRequest(stepId), CancellationToken.None);
        await relay.Continue(Continuing(), CreateRequest(stepId), CancellationToken.None);

        Assert.Equal(2, recorder.Enqueues.Count);
        Assert.Equal(recorder.Enqueues[0].IdempotencyKey, recorder.Enqueues[1].IdempotencyKey);
        Assert.Equal(
            ["close-mailbox", "enqueue:mailbox-continue", "close-mailbox", "enqueue:mailbox-continue"],
            recorder.Calls
        );
    }
}
