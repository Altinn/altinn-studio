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
            // The workflow's shape, not a bare "enqueue": a receiver and a continuation are two different
            // moves through this one client method — sharing one key now — and an ordering assertion that
            // could not tell them apart would pass on the wrong one. A receiver is the workflow with a
            // mailbox declaration.
            recorder.Calls.Add(request.Workflows[0].Mailbox is null ? "enqueue-continuation" : "enqueue-receiver");
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
                    It.IsAny<Guid>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<Instance, Actor, Guid, string, string, string?, string?, CancellationToken>(
                (_, _, dependsOn, collectionKey, state, action, idempotencyKey, _) =>
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
            processEngine.Object
        );
    }

    private static readonly MailboxOptions _mailboxThreeDays = new() { Timeout = TimeSpan.FromDays(3) };

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

    /// <summary>
    /// The pipeline the segment-decide tests resolve against — the same composition
    /// <see cref="ArchiveThenJournalTask"/> defines, with the tested handler at item index 1 and a
    /// non-empty segment after it.
    /// </summary>
    private static readonly ServiceTaskPipeline _archiveThenJournalPipeline =
        new ArchiveThenJournalTask().ResolvePipeline();

    /// <summary>
    /// Both sends up front, so both handlers are composed back to back: what follows the handler at item
    /// index 2 is the terminal at 3, alone in a receive workflow of its own. It is also the shape whose second
    /// send opens a <em>later</em> exchange than the handler composed after it answers.
    /// </summary>
    private static readonly ServiceTaskPipeline _upFrontSendsPipeline = new UpFrontSendsTask().ResolvePipeline();

    /// <summary>
    /// The single-exchange shape: the terminal answers the opening stage's exchange directly, so what follows
    /// that stage is the terminal alone — the receive workflow whose one step is the handler.
    /// </summary>
    private static readonly ServiceTaskPipeline _archivingPipeline = new ArchivingTask().ResolvePipeline();

    /// <summary>The mid-pipeline reply followed by a trailing stage and an ordinary <c>Finally</c>.</summary>
    private static readonly ServiceTaskPipeline _archiveThenRecordPipeline =
        new ArchiveThenRecordTask().ResolvePipeline();

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
                new MailboxContinuation.Conclude([_mailboxId]),
                CreateRequest(Guid.NewGuid()),
                CancellationToken.None
            );

        Assert.Equal(["close-mailbox", "enqueue-after-workflow"], recorder.Calls);
        Assert.Equal(_mailboxId, Assert.Single(recorder.Closes));
    }

    /// <summary>
    /// A conclusion from the opening stage names every mailbox the carry held: all of them close, and every
    /// one before the after-workflow starts — the task is over, so no exchange of its may keep accepting
    /// messages while the process moves on.
    /// </summary>
    [Fact]
    public async Task Conclusion_WithSeveralMailboxes_ClosesEveryOneBeforeTheAfterWorkflow()
    {
        var secondMailboxId = new Guid("018f4e00-0000-7000-8000-0000000000bb");
        var recorder = new RelayRecorder();

        await CreateRelay(recorder)
            .Continue(
                new MailboxContinuation.Conclude([_mailboxId, secondMailboxId]),
                CreateRequest(Guid.NewGuid()),
                CancellationToken.None
            );

        Assert.Equal(["close-mailbox", "close-mailbox", "enqueue-after-workflow"], recorder.Calls);
        Assert.Equal([_mailboxId, secondMailboxId], recorder.Closes);
    }

    [Fact]
    public async Task Conclusion_WithoutAutoAdvance_StillClosesTheMailbox()
    {
        var recorder = new RelayRecorder();

        await CreateRelay(recorder)
            .Continue(
                new MailboxContinuation.Conclude([_mailboxId]),
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
                new MailboxContinuation.Conclude([_mailboxId]),
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
    public void MailboxContinuation_HasExactlyFourAnswers_AndNoneCanMeanAnothers()
    {
        // Structural proof: the continuation type's constructor is private to itself, so the set is closed
        // at four.
        Type[] members = typeof(MailboxContinuation)
            .GetNestedTypes(System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Public)
            .Where(t => typeof(MailboxContinuation).IsAssignableFrom(t))
            .ToArray();

        Assert.Equal(4, members.Length);
        Assert.Contains(typeof(MailboxContinuation.AwaitNextMessage), members);
        Assert.Contains(typeof(MailboxContinuation.ContinueAfterStage), members);
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
                    $"MailboxContinuation exposes a constructor a fifth answer could chain to: {constructor}"
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

        Assert.Equal(["enqueue-receiver"], recorder.Calls);
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
            .Continue(new MailboxContinuation.Conclude([_mailboxId]), CreateRequest(stepId), CancellationToken.None);

        Assert.Equal(stepId.ToString(), Assert.Single(awaiting.Enqueues).IdempotencyKey);
        Assert.Equal(stepId.ToString(), Assert.Single(concluding.AfterWorkflows).IdempotencyKey);

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
    public async Task SuccessorReceiver_CarriesAFreshCallbackToken()
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
        Assert.Equal(_instanceGuid, context.InstanceGuid);
    }

    // ---------------------------------------------------------------------------------------------
    // The first receiver — enqueued from the segment's last stage, from inside its still-unsettled step.
    // ---------------------------------------------------------------------------------------------

    /// <summary>
    /// The hand-over a stage's completion makes when the exchange's handler is composed right after it: the
    /// receive workflow the deciding hop planned, plus the target it resolved from the carry.
    /// </summary>
    private static MailboxContinuation.ContinueAfterStage FirstReceiver(
        ServiceTaskPipeline? pipeline = null,
        int openingStageIndex = OpeningStageIndex
    ) =>
        new(
            ServiceTaskType,
            new MailboxHandover(
                openingStageIndex,
                WorkflowCommandSet.PlanSegment(ServiceTaskType, pipeline ?? _archivingPipeline, openingStageIndex),
                new MailboxTarget(_mailboxId, openingStageIndex)
            )
        );

    [Fact]
    public async Task FirstReceiver_IsAHeadThatDependsOnHeads_ParkedOnTheExchangesMailbox()
    {
        var stepId = new Guid("018f4e00-0000-7000-8000-00000000f00d");
        var recorder = new RelayRecorder();

        await CreateRelay(recorder).Continue(FirstReceiver(), CreateRequest(stepId), CancellationToken.None);

        Assert.Equal(["enqueue-receiver"], recorder.Calls);
        Assert.Empty(recorder.Closes);
        Assert.Empty(recorder.AfterWorkflows);

        (string ns, string idempotencyKey, string? collectionKey, WorkflowEnqueueRequest request) = Assert.Single(
            recorder.Enqueues
        );
        Assert.Equal("ttd/test-app", ns);
        Assert.Equal(stepId.ToString(), idempotencyKey);
        Assert.Equal(_instanceGuid.ToString(), collectionKey);

        WorkflowRequest receiver = Assert.Single(request.Workflows);
        Assert.True(receiver.IsHead);
        Assert.True(receiver.DependsOnHeads);
        Assert.Null(receiver.StartAt);
        Assert.Equal(_mailboxId, receiver.Mailbox?.Id);
        Assert.Equal("published-state", receiver.State);
        Assert.Equal($"Mailbox receive: Task_2 · {OpeningStageIndex}", receiver.OperationId);

        Assert.NotNull(request.Labels);
        Assert.Equal(
            _instanceGuid.ToString("N", CultureInfo.InvariantCulture),
            request.Labels[ProcessNextRequestFactory.ProcessNextInstanceGuidLabel]
        );
        Assert.Equal("Task_2:0", request.Labels[ProcessNextRequestFactory.ProcessNextTargetIdLabel]);
        Assert.Equal("Task_2", request.Labels[ProcessNextRequestFactory.ProcessNextTargetTaskLabel]);

        ExecuteServiceTaskPayload payload = StepPayload(Assert.Single(receiver.Steps));
        Assert.Equal(ServiceTaskType, payload.ServiceTaskType);
        Assert.Equal(ArchivingReplyIndex, payload.ItemIndex);

        AppWorkflowContext context = request.Context!.Value.Deserialize<AppWorkflowContext>()!;
        Assert.Equal("callback-token", context.CallbackToken);
    }

    /// <summary>
    /// The receiver's step resolves the options of the handler that answers <em>this</em> exchange — the
    /// mid-pipeline handler here, never the terminal's, whose budget belongs to a different exchange.
    /// </summary>
    [Fact]
    public async Task FirstReceiver_ResolvesTheAnsweringHandlersOwnOptions()
    {
        var recorder = new RelayRecorder();

        await CreateRelay(recorder, new ArchiveThenJournalTask())
            .Continue(
                FirstReceiver(_archiveThenJournalPipeline, JournalIndex),
                CreateRequest(Guid.NewGuid()),
                CancellationToken.None
            );

        StepRequest step = Assert.Single(Assert.Single(Assert.Single(recorder.Enqueues).Request.Workflows).Steps);
        Assert.Equal(TimeSpan.FromMinutes(3), step.Command.MaxExecutionTime);
        Assert.Equal(JournalTerminalIndex, step.ServiceTaskItemIndex);
    }

    [Fact]
    public async Task ReplayedFirstReceiverEnqueueOfOneStep_ProducesTheSameKey()
    {
        var stepId = Guid.NewGuid();
        var recorder = new RelayRecorder();
        MailboxRelay relay = CreateRelay(recorder);

        await relay.Continue(FirstReceiver(), CreateRequest(stepId), CancellationToken.None);
        await relay.Continue(FirstReceiver(), CreateRequest(stepId), CancellationToken.None);

        Assert.Equal(2, recorder.Enqueues.Count);
        Assert.Equal(recorder.Enqueues[0].IdempotencyKey, recorder.Enqueues[1].IdempotencyKey);
    }

    [Fact]
    public async Task AfterWorkflow_DependsOnTheConcludingReceiverAndCarriesItsPublishedState()
    {
        var workflowId = Guid.NewGuid();
        var recorder = new RelayRecorder();

        await CreateRelay(recorder)
            .Continue(
                new MailboxContinuation.Conclude([_mailboxId]),
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
            OpeningStageIndex,
            _archiveThenJournalPipeline
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
            OpeningStageIndex,
            _archiveThenJournalPipeline
        );

        SuccessfulProcessEngineCommandResult success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.False(success.AutoAdvanceProcess);
        Assert.Null(success.AutoAdvanceAction);

        MailboxContinuation.ConcludeAndContinue continuing = Assert.IsType<MailboxContinuation.ConcludeAndContinue>(
            success.MailboxContinuation
        );
        Assert.Equal(_mailboxId, continuing.MailboxId);
        Assert.Equal(ServiceTaskType, continuing.ServiceTaskType);
        // The next segment has steps of its own, so it receives nothing: what starts the journal's receive
        // leg is that segment's own last step, not this hop.
        Assert.Equal(SegmentHandlerIndex, continuing.Handover.AfterItemIndex);
        Assert.Null(continuing.Handover.Target);
        Assert.Equal(
            [
                $"{ExecuteServiceTask.Key}: 2",
                $"{MintMailbox.Key}: {JournalIndex}",
                $"{ExecuteServiceTask.Key}: {JournalIndex}",
            ],
            continuing.Handover.Plan.Steps.Select(step => step.OperationId).ToList()
        );

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
            OpeningStageIndex,
            _archiveThenJournalPipeline
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
            OpeningStageIndex,
            _archiveThenJournalPipeline
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Contains("the archive never confirmed", failed.ErrorMessage, StringComparison.Ordinal);
        MailboxContinuation.Conclude conclude = Assert.IsType<MailboxContinuation.Conclude>(failed.MailboxContinuation);
        Assert.Equal(_mailboxId, Assert.Single(conclude.MailboxIds));
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
            OpeningStageIndex,
            _archiveThenJournalPipeline
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
            OpeningStageIndex,
            _archiveThenJournalPipeline
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
            OpeningStageIndex,
            _archiveThenJournalPipeline
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
                OpeningStageIndex,
                _archiveThenJournalPipeline
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
                OpeningStageIndex,
                _archiveThenJournalPipeline
            )
        );
    }

    // ---------------------------------------------------------------------------------------------
    // The continuation — close mailbox k, then start segment k.
    // ---------------------------------------------------------------------------------------------

    /// <summary>
    /// A concluded handler's continuation carrying the hand-over its decide would have produced: the segment
    /// planned after that handler, from <paramref name="pipeline"/> (the archive-then-journal shape by
    /// default, which is what <see cref="CreateRelay"/>'s tasks compose).
    /// </summary>
    private static MailboxContinuation.ConcludeAndContinue Continuing(
        int handlerItemIndex = SegmentHandlerIndex,
        ServiceTaskPipeline? pipeline = null
    ) =>
        new(
            _mailboxId,
            ServiceTaskType,
            new MailboxHandover(
                handlerItemIndex,
                WorkflowCommandSet.PlanSegment(
                    ServiceTaskType,
                    pipeline ?? _archiveThenJournalPipeline,
                    afterItemIndex: handlerItemIndex
                ),
                target: null
            )
        );

    /// <summary>
    /// The same continuation for a next segment that is a receive workflow: one handler step, and the
    /// target the decide resolved for it.
    /// </summary>
    private static MailboxContinuation.ConcludeAndContinue ContinuingToReceiver(
        Guid mailboxId,
        int handlerItemIndex,
        int openingStageIndex
    ) =>
        new(
            _mailboxId,
            ServiceTaskType,
            new MailboxHandover(
                handlerItemIndex - 1,
                new ServiceTaskSegmentPlan(
                    [WorkflowCommandSet.CreateItemStep(ServiceTaskType, handlerItemIndex)],
                    ReceiveOpeningIndex: openingStageIndex
                ),
                new MailboxTarget(mailboxId, openingStageIndex)
            )
        );

    /// <summary>An opening stage's continuation, carrying the plan its decide made.</summary>
    private static MailboxContinuation.ContinueAfterStage ContinuingAfterStage(
        ServiceTaskPipeline pipeline,
        int openingStageIndex = OpeningStageIndex
    ) =>
        new(
            ServiceTaskType,
            new MailboxHandover(
                openingStageIndex,
                WorkflowCommandSet.PlanSegment(ServiceTaskType, pipeline, afterItemIndex: openingStageIndex),
                target: null
            )
        );

    /// <summary>
    /// The three invariants the hand-over makes structural, at the one place a plan becomes one. An empty plan
    /// would enqueue a workflow the engine settles at once, emptying the frontier under an open mailbox; a plan
    /// and a target that disagree would either park ordinary steps on a mailbox or enqueue a handler step with
    /// nothing to receive from; and a receiving plan with a second step would run that step with no rendezvous
    /// at all, after the first had already consumed the message.
    /// </summary>
    [Fact]
    public void MailboxHandover_WithAnEmptyPlan_IsRefusedAtConstruction()
    {
        ArgumentException thrown = Assert.Throws<ArgumentException>(() =>
            new MailboxHandover(0, new ServiceTaskSegmentPlan([], ReceiveOpeningIndex: null), target: null)
        );

        Assert.Contains("at least one step", thrown.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void MailboxHandover_WhosePlanAndTargetDisagree_IsRefusedAtConstruction(bool planReceives)
    {
        var plan = new ServiceTaskSegmentPlan(
            [WorkflowCommandSet.CreateItemStep(ServiceTaskType, ArchivingReplyIndex)],
            planReceives ? OpeningStageIndex : null
        );
        MailboxTarget? target = planReceives ? null : new MailboxTarget(_mailboxId, OpeningStageIndex);

        ArgumentException thrown = Assert.Throws<ArgumentException>(() => new MailboxHandover(0, plan, target));

        Assert.Contains("mailbox travels with it", thrown.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void MailboxHandover_WhoseReceivingPlanHasASecondStep_IsRefusedAtConstruction()
    {
        var plan = new ServiceTaskSegmentPlan(
            [
                WorkflowCommandSet.CreateItemStep(ServiceTaskType, ArchivingReplyIndex),
                WorkflowCommandSet.CreateItemStep(ServiceTaskType, ArchivingReplyIndex + 1),
            ],
            OpeningStageIndex
        );

        ArgumentException thrown = Assert.Throws<ArgumentException>(() =>
            new MailboxHandover(0, plan, new MailboxTarget(_mailboxId, OpeningStageIndex))
        );

        Assert.Contains("runs exactly one step", thrown.Message, StringComparison.Ordinal);
        Assert.Contains("carries 2", thrown.Message, StringComparison.Ordinal);
    }

    private static List<string> StepOperationIds(WorkflowRequest workflow) =>
        workflow.Steps.Select(step => step.OperationId).ToList();

    private static List<string> StepOperationIds(MailboxHandover handover) =>
        handover.Plan.Steps.Select(step => step.OperationId).ToList();

    private static ExecuteServiceTaskPayload StepPayload(StepRequest step)
    {
        var appData = JsonSerializer.Deserialize<AppCommandData>(step.Command.Data!.Value)!;
        Assert.Equal(ExecuteServiceTask.Key, appData.CommandKey);
        return CommandPayloadSerializer.Deserialize<ExecuteServiceTaskPayload>(appData.Payload)!;
    }

    [Fact]
    public async Task ConcludeAndContinue_ClosesTheMailboxBeforeEnqueueingTheContinuation()
    {
        var recorder = new RelayRecorder();

        await CreateRelay(recorder, new ArchiveThenJournalTask())
            .Continue(Continuing(), CreateRequest(Guid.NewGuid()), CancellationToken.None);

        // The reverse order compiles, and would let a message land in an exchange the pipeline has moved past.
        Assert.Equal(["close-mailbox", "enqueue-continuation"], recorder.Calls);
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
        Assert.Equal(stepId.ToString(), idempotencyKey);
        Assert.Equal(_instanceGuid.ToString(), collectionKey);

        WorkflowRequest continuation = Assert.Single(request.Workflows);
        Assert.True(continuation.IsHead);
        Assert.True(continuation.DependsOnHeads);
        Assert.Null(continuation.StartAt);
        Assert.Equal("published-state", continuation.State);
        Assert.Null(continuation.Mailbox);
        // Named for the item it follows — the handler that just concluded its exchange.
        Assert.Equal($"Mailbox continue: Task_2 · after {SegmentHandlerIndex}", continuation.OperationId);

        Assert.NotNull(request.Labels);
        Assert.Equal(
            _instanceGuid.ToString("N", CultureInfo.InvariantCulture),
            request.Labels[ProcessNextRequestFactory.ProcessNextInstanceGuidLabel]
        );
        Assert.Equal("Task_2:0", request.Labels[ProcessNextRequestFactory.ProcessNextTargetIdLabel]);
        Assert.Equal("Task_2", request.Labels[ProcessNextRequestFactory.ProcessNextTargetTaskLabel]);

        AppWorkflowContext context = request.Context!.Value.Deserialize<AppWorkflowContext>()!;
        Assert.Equal("callback-token", context.CallbackToken);
        Assert.Equal(_instanceGuid, context.InstanceGuid);
    }

    /// <summary>
    /// Frontier-never-empty on this hop: the continuation's last step is the segment's last stage, and
    /// completing that step is what enqueues the receiver — worked out there, exactly as it is on Main — so
    /// the continuation cannot settle before the receiver that follows it exists.
    /// </summary>
    [Fact]
    public async Task Continuation_RunsTheItemsAfterTheHandler_EndingOnTheNextSend()
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
            ],
            StepOperationIds(continuation)
        );

        // The exchange just concluded is behind it: nothing re-mints or re-sends the archive.
        Assert.DoesNotContain($"{MintMailbox.Key}: {OpeningStageIndex}", StepOperationIds(continuation));

        // Each step names the one item it runs, and nothing about what follows it.
        Assert.Equal(2, StepPayload(continuation.Steps[0]).ItemIndex);
        Assert.Equal(JournalIndex, StepPayload(continuation.Steps[^1]).ItemIndex);
    }

    /// <summary>
    /// The hop a mailbox-opening stage ends its own workflow on: nothing closes — its exchange has not even
    /// started — and one continuation carries the items composed after the stage, planned from the stage index
    /// the continuation carries and named for it. The up-front shape is the one that has such a stage:
    /// its second send is composed right after the first.
    /// </summary>
    [Fact]
    public async Task ContinueAfterStage_ClosesNothingAndEnqueuesTheSegmentAfterTheStage()
    {
        var stepId = new Guid("018f4e00-0000-7000-8000-0000000000ab");
        var recorder = new RelayRecorder();

        await CreateRelay(recorder, new UpFrontSendsTask())
            .Continue(ContinuingAfterStage(_upFrontSendsPipeline), CreateRequest(stepId), CancellationToken.None);

        Assert.Equal(["enqueue-continuation"], recorder.Calls);
        Assert.Empty(recorder.Closes);
        Assert.Empty(recorder.AfterWorkflows);

        (_, string idempotencyKey, _, WorkflowEnqueueRequest request) = Assert.Single(recorder.Enqueues);
        Assert.Equal(stepId.ToString(), idempotencyKey);

        WorkflowRequest continuation = Assert.Single(request.Workflows);
        Assert.True(continuation.IsHead);
        Assert.True(continuation.DependsOnHeads);
        Assert.Null(continuation.Mailbox);
        Assert.Equal("published-state", continuation.State);
        Assert.Equal($"Mailbox continue: Task_2 · after {OpeningStageIndex}", continuation.OperationId);

        // The second send and its mint, and nothing more: the handler that answers the first exchange is
        // composed right after this second send, so starting it is that send's own step's job.
        Assert.Equal([$"{MintMailbox.Key}: 1", $"{ExecuteServiceTask.Key}: 1"], StepOperationIds(continuation));
        Assert.Equal(1, StepPayload(continuation.Steps[^1]).ItemIndex);
    }

    [Fact]
    public async Task ReplayedContinueAfterStageOfOneStep_ProducesTheSameKey()
    {
        var stepId = Guid.NewGuid();
        var recorder = new RelayRecorder();
        MailboxRelay relay = CreateRelay(recorder, new UpFrontSendsTask());

        MailboxContinuation.ContinueAfterStage continuation = ContinuingAfterStage(_upFrontSendsPipeline);
        await relay.Continue(continuation, CreateRequest(stepId), CancellationToken.None);
        await relay.Continue(continuation, CreateRequest(stepId), CancellationToken.None);

        Assert.Equal(2, recorder.Enqueues.Count);
        Assert.Equal(recorder.Enqueues[0].IdempotencyKey, recorder.Enqueues[1].IdempotencyKey);
        Assert.Equal(["enqueue-continuation", "enqueue-continuation"], recorder.Calls);
    }

    /// <summary>
    /// Decision 3 from the planner's side: with both sends composed up front, two reply handlers are composed
    /// back to back, so what follows the first is simply the second — alone in a receive workflow of its own,
    /// parked on the other exchange, enqueued from this hop with the target its decide resolved.
    /// </summary>
    [Fact]
    public async Task Continuation_ForUpFrontSends_EnqueuesTheNextExchangesReceiver()
    {
        var stepId = new Guid("018f4e00-0000-7000-8000-00000000cafe");
        var journalMailboxId = new Guid("018f4e00-0000-7000-8000-0000000000bb");
        var recorder = new RelayRecorder();

        await CreateRelay(recorder, new UpFrontSendsTask())
            .Continue(
                // Both sends come first here, so the archive's handler sits at item index 2; the journal's
                // send is at 1 and its handler — the terminal — at 3.
                ContinuingToReceiver(journalMailboxId, handlerItemIndex: 3, openingStageIndex: 1),
                CreateRequest(stepId),
                CancellationToken.None
            );

        Assert.Equal(["close-mailbox", "enqueue-receiver"], recorder.Calls);
        (_, string idempotencyKey, _, WorkflowEnqueueRequest request) = Assert.Single(recorder.Enqueues);
        Assert.Equal(stepId.ToString(), idempotencyKey);

        WorkflowRequest receiver = Assert.Single(request.Workflows);
        Assert.True(receiver.IsHead);
        Assert.True(receiver.DependsOnHeads);
        Assert.Equal(journalMailboxId, receiver.Mailbox?.Id);
        Assert.Equal("published-state", receiver.State);
        Assert.Equal("Mailbox receive: Task_2 · 1", receiver.OperationId);

        ExecuteServiceTaskPayload payload = StepPayload(Assert.Single(receiver.Steps));
        Assert.Equal(3, payload.ItemIndex);
    }

    /// <summary>
    /// The target of a next segment that receives is resolved when the verdict is mapped, not in the relay
    /// tail: the mailbox is the one an earlier segment minted, read from the carry — so a broken carry can
    /// fail the verdict legibly instead of throwing after it.
    /// </summary>
    [Fact]
    public void SegmentCompleted_WhoseNextSegmentReceives_ResolvesItsTargetFromTheCarry()
    {
        var journalMailboxId = new Guid("018f4e00-0000-7000-8000-0000000000bb");
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStageIndex, _mailboxId, _mailboxDeadline);
        // UpFrontSendsTask composes the journal's send at item index 1, and its handler — the terminal — at 3.
        carry.RecordMailbox(1, journalMailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.DecideSegment(
            ServiceTaskStageResult.Completed(),
            ServiceTaskType,
            _stepId,
            Delivered(),
            carry,
            handlerItemIndex: 2,
            OpeningStageIndex,
            _upFrontSendsPipeline
        );

        MailboxContinuation.ConcludeAndContinue continuing = Assert.IsType<MailboxContinuation.ConcludeAndContinue>(
            Assert.IsType<SuccessfulProcessEngineCommandResult>(result).MailboxContinuation
        );
        Assert.Equal([$"{ExecuteServiceTask.Key}: 3"], StepOperationIds(continuing.Handover));
        MailboxTarget next = Assert.IsType<MailboxTarget>(continuing.Handover.Target);
        Assert.Equal(journalMailboxId, next.MailboxId);
        Assert.Equal(1, next.OpeningStageIndex);

        // The concluded exchange dropped, the next one still traveling.
        Assert.Null(carry.FindMailbox(OpeningStageIndex));
        Assert.NotNull(carry.FindMailbox(1));
    }

    /// <summary>
    /// The one cause for a missing entry here: the carry broke between the mint and this handler. Failed at
    /// decide time, permanently and named — never a throw from the relay tail grinding the retry ladder.
    /// </summary>
    [Fact]
    public void SegmentCompleted_WhoseNextSegmentReceivesWithABrokenCarry_FailsPermanentlyNamingTheIndex()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStageIndex, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.DecideSegment(
            ServiceTaskStageResult.Completed(),
            ServiceTaskType,
            _stepId,
            Delivered(),
            carry,
            handlerItemIndex: 2,
            OpeningStageIndex,
            _upFrontSendsPipeline
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxIdMissingFromState", failed.ExceptionType);
        Assert.Contains("index 1", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Null(failed.MailboxContinuation);
        // Refused before anything is recorded: the concluded exchange is untouched, so a resume replays
        // this handler.
        Assert.NotNull(carry.FindMailbox(OpeningStageIndex));
    }

    [Fact]
    public async Task Continuation_OfAPipelineThatEndsWithAFinalStep_EndsWithTheConcludingStep()
    {
        var recorder = new RelayRecorder();

        await CreateRelay(recorder, new ArchiveThenRecordTask())
            .Continue(
                Continuing(pipeline: _archiveThenRecordPipeline),
                CreateRequest(Guid.NewGuid()),
                CancellationToken.None
            );

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
    }

    /// <summary>
    /// The enqueue runs the plan it was handed and plans nothing of its own. Pinned by disagreement, which is
    /// the only way to tell a carried plan from a re-derived one: the registered task composes the
    /// archive-then-<em>record</em> shape while the continuation carries a plan made from the
    /// archive-then-<em>journal</em> shape, and the journal's steps are what reach the engine. A hop that
    /// resolved the pipeline again would enqueue the record shape instead.
    /// </summary>
    [Fact]
    public async Task Continuation_EnqueuesTheCarriedPlan_WithoutPlanningAgain()
    {
        var recorder = new RelayRecorder();

        await CreateRelay(recorder, new ArchiveThenRecordTask())
            .Continue(
                Continuing(pipeline: _archiveThenJournalPipeline),
                CreateRequest(Guid.NewGuid()),
                CancellationToken.None
            );

        WorkflowRequest continuation = Assert.Single(Assert.Single(recorder.Enqueues).Request.Workflows);
        Assert.Equal(
            [
                $"{ExecuteServiceTask.Key}: 2",
                $"{MintMailbox.Key}: {JournalIndex}",
                $"{ExecuteServiceTask.Key}: {JournalIndex}",
            ],
            StepOperationIds(continuation)
        );
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
            ["close-mailbox", "enqueue-continuation", "close-mailbox", "enqueue-continuation"],
            recorder.Calls
        );
    }

    // ---------------------------------------------------------------------------------------------
    // A workflow's last stage — completing it starts what the pipeline composes after it;
    // concluding from a mailbox-opening one ends the task.
    // ---------------------------------------------------------------------------------------------

    /// <summary>
    /// A handler composed right after the stage: the plan is that handler alone, and the exchange it parks on
    /// is resolved from the carry here, at the verdict, where a missing entry can still fail the step legibly.
    /// </summary>
    [Fact]
    public void StageEnd_WhoseHandlerIsComposedNext_PlansTheReceiverAndResolvesItsMailbox()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStageIndex, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.DecideStageEnd(
            ServiceTaskType,
            _stepId,
            carry,
            OpeningStageIndex,
            _archivingPipeline
        );

        SuccessfulProcessEngineCommandResult success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.False(success.AutoAdvanceProcess);
        MailboxContinuation.ContinueAfterStage continuing = Assert.IsType<MailboxContinuation.ContinueAfterStage>(
            success.MailboxContinuation
        );
        Assert.Equal(ServiceTaskType, continuing.ServiceTaskType);
        Assert.Equal(OpeningStageIndex, continuing.Handover.AfterItemIndex);
        Assert.Equal([$"{ExecuteServiceTask.Key}: {ArchivingReplyIndex}"], StepOperationIds(continuing.Handover));

        MailboxTarget target = Assert.IsType<MailboxTarget>(continuing.Handover.Target);
        Assert.Equal(_mailboxId, target.MailboxId);
        Assert.Equal(OpeningStageIndex, target.OpeningStageIndex);
        // The exchange is only starting: its entry keeps traveling.
        Assert.NotNull(carry.FindMailbox(OpeningStageIndex));
    }

    /// <summary>
    /// The exchange belongs to the <em>handler</em>, not to the stage that just completed. Up-front sends are
    /// the shape where the two differ: the send at item index 1 opened the journal's exchange, and the handler
    /// composed after it answers the <em>archive's</em> — so the receiver must park on the archive's mailbox,
    /// keyed by the plan's own `ReceiveOpeningIndex` and never by the index of the item this hop ran.
    /// </summary>
    [Fact]
    public void StageEnd_FromAStageThatOpenedALaterExchange_ParksOnTheOneItsHandlerAnswers()
    {
        var journalMailboxId = new Guid("018f4e00-0000-7000-8000-0000000000bb");
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStageIndex, _mailboxId, _mailboxDeadline);
        carry.RecordMailbox(1, journalMailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.DecideStageEnd(
            ServiceTaskType,
            _stepId,
            carry,
            stageIndex: 1,
            _upFrontSendsPipeline
        );

        var continuing = Assert.IsType<MailboxContinuation.ContinueAfterStage>(
            Assert.IsType<SuccessfulProcessEngineCommandResult>(result).MailboxContinuation
        );
        // The archive's handler at item index 2, parked on the archive's mailbox — not the journal's, whose
        // send is the very stage that completed here.
        Assert.Equal([$"{ExecuteServiceTask.Key}: 2"], StepOperationIds(continuing.Handover));
        MailboxTarget target = Assert.IsType<MailboxTarget>(continuing.Handover.Target);
        Assert.Equal(_mailboxId, target.MailboxId);
        Assert.Equal(OpeningStageIndex, target.OpeningStageIndex);
        // Named for the item it follows, which is this stage.
        Assert.Equal(1, continuing.Handover.AfterItemIndex);
        // Nothing is closed or concluded: both exchanges keep traveling.
        Assert.NotNull(carry.FindMailbox(OpeningStageIndex));
        Assert.NotNull(carry.FindMailbox(1));
    }

    /// <summary>
    /// The plan's index is what resolves the exchange, so a second carried mailbox is no obstacle: the
    /// receiver is enqueued against the exchange its own handler answers, never against "the one entry there
    /// is".
    /// </summary>
    [Fact]
    public void StageEnd_WithMailboxesFromTwoStages_ResolvesTheIndexedOne()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStageIndex, _mailboxId, _mailboxDeadline);
        carry.RecordMailbox(1, Guid.NewGuid(), _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.DecideStageEnd(
            ServiceTaskType,
            _stepId,
            carry,
            OpeningStageIndex,
            _archivingPipeline
        );

        var continuing = Assert.IsType<MailboxContinuation.ContinueAfterStage>(
            Assert.IsType<SuccessfulProcessEngineCommandResult>(result).MailboxContinuation
        );
        Assert.Equal(_mailboxId, Assert.IsType<MailboxTarget>(continuing.Handover.Target).MailboxId);
    }

    /// <summary>
    /// A broken carry: the mint step for this exchange's stage recorded nothing that reached here. Naming the
    /// index is what makes the failure diagnosable.
    /// </summary>
    [Fact]
    public void StageEnd_WithoutTheCarriedMailbox_FailsPermanentlyNamingTheIndex()
    {
        // The journal's send at item index 3, whose terminal answers it at 4.
        ProcessEngineCommandResult result = MailboxRelay.DecideStageEnd(
            ServiceTaskType,
            _stepId,
            new WorkflowCallbackStateCarry(),
            JournalIndex,
            _archiveThenJournalPipeline
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxIdMissingFromState", failed.ExceptionType);
        Assert.Contains($"index {JournalIndex}", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Null(failed.MailboxContinuation);
    }

    [Fact]
    public void StageEnd_WithoutAStepId_IsRefused()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStageIndex, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.DecideStageEnd(
            ServiceTaskType,
            Guid.Empty,
            carry,
            OpeningStageIndex,
            _archivingPipeline
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxStepIdMissing", failed.ExceptionType);
        Assert.Null(failed.MailboxContinuation);
    }

    /// <summary>
    /// The other completion such a stage can have: no handler follows it, so what its completion starts is an
    /// ordinary continuation and no target rides along. Nothing about any exchange changes — neither this
    /// stage's, which has not begun, nor an earlier one's.
    /// </summary>
    [Fact]
    public void StageEnd_WithNoHandlerComposedNext_PlansTheNextSegmentAndTouchesNoExchange()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStageIndex, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.DecideStageEnd(
            ServiceTaskType,
            _stepId,
            carry,
            OpeningStageIndex,
            _upFrontSendsPipeline
        );

        SuccessfulProcessEngineCommandResult success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.False(success.AutoAdvanceProcess);
        MailboxContinuation.ContinueAfterStage continuing = Assert.IsType<MailboxContinuation.ContinueAfterStage>(
            success.MailboxContinuation
        );
        Assert.Equal(ServiceTaskType, continuing.ServiceTaskType);
        // The plan the decide made travels on the verdict: the second send and its mint.
        Assert.Equal(OpeningStageIndex, continuing.Handover.AfterItemIndex);
        Assert.Equal([$"{MintMailbox.Key}: 1", $"{ExecuteServiceTask.Key}: 1"], StepOperationIds(continuing.Handover));
        Assert.Null(continuing.Handover.Target);
        Assert.NotNull(carry.FindMailbox(OpeningStageIndex));
    }

    /// <summary>
    /// The one way a plan can come back empty: the composition ends on the very item this step ran, which no
    /// well-formed pipeline does — hence the direct call, since dispatch cannot produce it. Failed at decide
    /// time, permanently and named, because the alternatives are worse either way: a throw would grind the
    /// retry ladder and re-run the send on every attempt, and an empty workflow would settle at once and empty
    /// the frontier under an open mailbox.
    /// </summary>
    [Fact]
    public void StageEnd_WithNothingComposedAfterTheStage_FailsPermanently()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStageIndex, _mailboxId, _mailboxDeadline);
        int lastIndex = _archivingPipeline.Items.Count - 1;

        ProcessEngineCommandResult result = MailboxRelay.DecideStageEnd(
            ServiceTaskType,
            _stepId,
            carry,
            lastIndex,
            _archivingPipeline
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("PipelineSegmentNotFound", failed.ExceptionType);
        Assert.Contains($"nothing after the item at index {lastIndex}", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Contains("always ends with its conclusion", failed.ErrorMessage, StringComparison.Ordinal);
        // Refusing the verdict starts nothing and concludes nothing: the exchange stays open, bounded by its
        // own deadline, so a resume on the enqueueing code carries the pipeline on.
        Assert.Null(failed.MailboxContinuation);
        Assert.NotNull(carry.FindMailbox(OpeningStageIndex));
    }

    [Fact]
    public void OpeningStageConclusion_Success_ClosesEveryCarriedMailboxAndAdvances()
    {
        var laterMailboxId = new Guid("018f4e00-0000-7000-8000-0000000000bb");
        var carry = new WorkflowCallbackStateCarry();
        // Recorded out of stage order on purpose: the closes are ordered by opening stage index, not by
        // whatever order the entries happened to be recorded (or restored) in.
        carry.RecordMailbox(2, laterMailboxId, _mailboxDeadline);
        carry.RecordMailbox(OpeningStageIndex, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.DecideOpeningStageConclusion(
            ServiceTaskResult.Success("reject"),
            ServiceTaskType,
            _stepId,
            carry
        );

        SuccessfulProcessEngineCommandResult success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.True(success.AutoAdvanceProcess);
        Assert.Equal("reject", success.AutoAdvanceAction);

        MailboxContinuation.Conclude conclude = Assert.IsType<MailboxContinuation.Conclude>(
            success.MailboxContinuation
        );
        Assert.Equal([_mailboxId, laterMailboxId], conclude.MailboxIds);

        // Dropped before the capture, so the published blob carries no concluded exchange.
        Assert.Null(carry.FindMailbox(OpeningStageIndex));
        Assert.Null(carry.FindMailbox(2));
    }

    [Fact]
    public void OpeningStageConclusion_SuccessWithoutAutoAdvance_ClosesWithoutAdvancing()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStageIndex, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.DecideOpeningStageConclusion(
            ServiceTaskResult.SuccessWithoutAutoAdvance(),
            ServiceTaskType,
            // No keyed call is made, so the missing id must not refuse the verdict.
            Guid.Empty,
            carry
        );

        SuccessfulProcessEngineCommandResult success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.False(success.AutoAdvanceProcess);
        MailboxContinuation.Conclude conclude = Assert.IsType<MailboxContinuation.Conclude>(
            success.MailboxContinuation
        );
        Assert.Equal(_mailboxId, Assert.Single(conclude.MailboxIds));
    }

    [Fact]
    public void OpeningStageConclusion_FailedPermanent_ClosesEveryCarriedMailboxAndStartsNothing()
    {
        var secondMailboxId = new Guid("018f4e00-0000-7000-8000-0000000000bb");
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStageIndex, _mailboxId, _mailboxDeadline);
        carry.RecordMailbox(1, secondMailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.DecideOpeningStageConclusion(
            ServiceTaskResult.FailedPermanent("the recipient account does not exist"),
            ServiceTaskType,
            _stepId,
            carry
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ServiceTaskFailedException", failed.ExceptionType);
        Assert.Contains("the recipient account does not exist", failed.ErrorMessage, StringComparison.Ordinal);

        MailboxContinuation.Conclude conclude = Assert.IsType<MailboxContinuation.Conclude>(failed.MailboxContinuation);
        Assert.Equal([_mailboxId, secondMailboxId], conclude.MailboxIds);
        // A failing callback publishes no blob, so there is nothing for the carry to un-say.
        Assert.NotNull(carry.FindMailbox(OpeningStageIndex));
    }

    [Fact]
    public void OpeningStageConclusion_WrappedNonConcludingVerdicts_ActAsTheStageVocabularysOwn()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStageIndex, _mailboxId, _mailboxDeadline);

        FailedProcessEngineCommandResult retryable = Assert.IsType<FailedProcessEngineCommandResult>(
            MailboxRelay.DecideOpeningStageConclusion(
                ServiceTaskResult.FailedRetryable("the archive is down"),
                ServiceTaskType,
                _stepId,
                carry
            )
        );
        Assert.False(retryable.NonRetryable);
        Assert.Null(retryable.MailboxContinuation);
        Assert.NotNull(carry.FindMailbox(OpeningStageIndex));

        DeferredProcessEngineCommandResult deferred = Assert.IsType<DeferredProcessEngineCommandResult>(
            MailboxRelay.DecideOpeningStageConclusion(
                ServiceTaskResult.Defer(TimeSpan.FromMinutes(5), "waiting"),
                ServiceTaskType,
                _stepId,
                carry
            )
        );
        Assert.Equal(TimeSpan.FromMinutes(5), deferred.Delay);
        Assert.NotNull(carry.FindMailbox(OpeningStageIndex));
    }

    [Fact]
    public void OpeningStageConclusion_AdvancingWithoutAStepId_IsRefused()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStageIndex, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.DecideOpeningStageConclusion(
            ServiceTaskResult.Success(),
            ServiceTaskType,
            Guid.Empty,
            carry
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxStepIdMissing", failed.ExceptionType);
        // Refused before anything is recorded: the exchange is untouched, so a fixed engine replays it.
        Assert.NotNull(carry.FindMailbox(OpeningStageIndex));
    }

    /// <summary>
    /// The fifth of the copy-constructor probes: a wrapped conclusion
    /// <see cref="MailboxRelay.DecideOpeningStageConclusion"/> has no move for. Same convergence
    /// requirement, same untouched exchange, same self-cleaning property as its four siblings.
    /// </summary>
    private sealed record RogueConclusion : ServiceTaskResult
    {
        public RogueConclusion(ServiceTaskResult original)
            : base(original) { }
    }

    [Fact]
    public void UnrecognisedWrappedConclusion_FailsPermanentlyNamesTheTypeAndLeavesTheExchangeOpen()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStageIndex, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.DecideOpeningStageConclusion(
            new RogueConclusion(ServiceTaskResult.Success()),
            ServiceTaskType,
            _stepId,
            carry
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ServiceTaskResultUnknown", failed.ExceptionType);
        Assert.Contains(nameof(RogueConclusion), failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Null(failed.MailboxContinuation);
        Assert.NotNull(carry.FindMailbox(OpeningStageIndex));
    }
}
