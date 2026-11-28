using System.Globalization;
using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;
using Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;
using Altinn.Platform.Storage.Interface.Models;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

/// <summary>
/// The relay saga: a mailbox closes before anything downstream starts, only the step done with the one open
/// mailbox closes it, and every enqueue is a head keyed on the executing step. Every test here exists because the
/// property it pins is one a wrong implementation would still compile with.
/// </summary>
public class ServiceTaskRelayTests
{
    private static readonly Guid _instanceGuid = new("2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde");
    private static readonly Guid _mailboxId = new("018f4e00-0000-7000-8000-0000000000aa");
    private static readonly DateTimeOffset _mailboxDeadline = new(2026, 8, 30, 12, 0, 0, TimeSpan.Zero);
    private static readonly Guid _stepId = new("018f4e00-0000-7000-8000-0000000000fe");
    private const string ServiceTaskType = "archiving";

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

        public RecordingCallbackTokenGenerator Tokens { get; } = new();

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
            CancellationToken cancellationToken = default
        )
        {
            // The workflow's shape, not a bare "enqueue": a receiver and a continuation are two different
            // moves through this one client method, and an ordering assertion that could not tell them apart
            // would pass on the wrong one. A receiver is the workflow with a mailbox declaration.
            recorder.Calls.Add(request.Workflows[0].Mailbox is null ? "enqueue-continuation" : "enqueue-receiver");
            recorder.Enqueues.Add((ns, idempotencyKey, collectionKey, request));
            return Task.FromResult(
                new WorkflowEnqueueResponse.Accepted
                {
                    Workflows = [new WorkflowResult { DatabaseId = Guid.NewGuid(), Namespace = ns }],
                }
            );
        }

        public Task<MailboxResponse?> CloseMailbox(
            string ns,
            Guid mailboxId,
            CancellationToken cancellationToken = default
        )
        {
            recorder.Calls.Add("close-mailbox");
            recorder.Closes.Add(mailboxId);
            return Task.FromResult<MailboxResponse?>(null);
        }

        public Task<MailboxDeliveryResult> DeliverToMailbox(
            string ns,
            Guid mailboxId,
            MailboxDeliveryRequest request,
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();

        public Task<WorkflowStatusResponse?> GetWorkflow(
            string ns,
            Guid workflowId,
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();

        public Task<WorkflowCollectionDetailResponse?> GetCollection(
            string ns,
            string key,
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();

        public Task<IReadOnlyList<WorkflowStatusResponse>> ListWorkflows(
            string ns,
            string? collectionKey = null,
            Dictionary<string, string>? labels = null,
            IReadOnlyList<PersistentItemStatus>? statuses = null,
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();

        public Task<CancelWorkflowResponse> CancelWorkflow(
            string ns,
            Guid workflowId,
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();

        public Task<ResumeWorkflowResponse> ResumeWorkflow(
            string ns,
            Guid workflowId,
            bool cascade = false,
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();

        public Task<MailboxMintResult> MintMailbox(
            string ns,
            MailboxCreateRequest request,
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();
    }

    /// <summary>
    /// The relay, wired to the recorder. It is handed no service task: every hop enqueues the plan its result
    /// carried and resolves no pipeline.
    /// </summary>
    private static ServiceTaskRelay CreateRelay(RelayRecorder recorder)
    {
        var processEngine = new Mock<IProcessEngine>(MockBehavior.Strict);
        processEngine
            .Setup(x =>
                x.EnqueueProcessNext(
                    It.IsAny<IInstanceDataAccessor>(),
                    It.IsAny<Actor>(),
                    It.IsAny<Guid>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<DateTimeOffset>(),
                    It.IsAny<string?>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<
                IInstanceDataAccessor,
                Actor,
                Guid,
                string,
                string,
                DateTimeOffset,
                string?,
                string?,
                CancellationToken
            >(
                (_, _, dependsOn, collectionKey, state, _, action, idempotencyKey, _) =>
                {
                    recorder.Calls.Add("enqueue-after-workflow");
                    recorder.AfterWorkflows.Add((dependsOn, collectionKey, state, action, idempotencyKey));
                }
            )
            .Returns(Task.CompletedTask);

        return new ServiceTaskRelay(
            new RecordingEngineClient(recorder),
            recorder.Tokens,
            new ProcessStepOptionsResolver([]),
            processEngine.Object
        );
    }

    private static Task<ServiceTaskResult> SendToArchive(StageContext context, ReplyAddress address) =>
        Task.FromResult(ServiceTaskResult.Completed());

    private static Task<ServiceTaskReplyResult> HandleArchiveReply(StageContext context, ServiceTaskReply reply) =>
        Task.FromResult(ServiceTaskReplyResult.Completed());

    private static Task<ServiceTaskResult> HandleArchiveTimeout(StageContext context) =>
        Task.FromResult(ServiceTaskResult.Completed());

    private static Task<ServiceTaskResult> RecordArchived(StageContext context) =>
        Task.FromResult(ServiceTaskResult.Completed());

    private static Task<ServiceTaskResult> SendToJournal(StageContext context, ReplyAddress address) =>
        Task.FromResult(ServiceTaskResult.Completed());

    private static Task<ServiceTaskReplyResult> HandleJournalReply(StageContext context, ServiceTaskReply reply) =>
        Task.FromResult(ServiceTaskReplyResult.Completed());

    private static readonly ProcessStepOptions _archiveOptions = new() { MaxExecutionTime = TimeSpan.FromMinutes(3) };

    private static readonly ProcessStepOptions _recordOptions = new() { MaxExecutionTime = TimeSpan.FromMinutes(7) };

    /// <summary>The name the archive's receive steps go by: its reply handler's and its timeout handler's.</summary>
    private const string ArchiveReplyStepName = "Handle archive reply / Handle archive timeout";

    private const int ArchiveIndex = 0;
    private const int RecordIndex = 1;
    private const int JournalIndex = 2;

    /// <summary>
    /// The archive's external stage, a stage recording the result, then the journal's external stage: every kind of
    /// hand-over a pipeline makes.
    /// </summary>
    private static readonly ServiceTaskPipeline _archiveRecordJournal = new PipelineBuilder.ServiceTask()
        .ExternalStage(SendToArchive, HandleArchiveReply, TimeSpan.FromDays(3), HandleArchiveTimeout, _archiveOptions)
        .Stage(RecordArchived, _recordOptions)
        .ExternalStage(SendToJournal, HandleJournalReply)
        .ToPipeline();

    /// <summary>Two external stages back to back: how a task does two exchanges.</summary>
    private static readonly ServiceTaskPipeline _archiveThenJournal = new PipelineBuilder.ServiceTask()
        .ExternalStage(SendToArchive, HandleArchiveReply)
        .ExternalStage(SendToJournal, HandleJournalReply)
        .ToPipeline();

    private static ServiceTaskItem.ExternalStage External(ServiceTaskPipeline pipeline, int index) =>
        Assert.IsType<ServiceTaskItem.ExternalStage>(pipeline.Items[index]);

    private static ServiceTaskRelayRequest CreateRequest(Guid stepId, Guid? workflowId = null, string? action = null) =>
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
            DataAccessor = new InstanceDataAccessorFake(
                new Instance
                {
                    Id = $"1337/{_instanceGuid}",
                    Org = "ttd",
                    AppId = "ttd/test-app",
                    InstanceOwner = new InstanceOwner { PartyId = "1337" },
                    Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_2" } },
                },
                applicationMetadata: null,
                translationService: null,
                layout: null,
                frontEndSettings: null,
                gatewayAction: null,
                language: null
            ),
            State = "published-state",
            AutoAdvanceAction = action,
        };

    /// <summary>
    /// The hand-over an external stage's completed send makes: its receive workflow, parked on the mailbox its mint
    /// opened.
    /// </summary>
    private static ServiceTaskContinuation.ContinueAfterStage FirstReceiver() =>
        new(
            new ServiceTaskHandover(
                ArchiveIndex,
                WorkflowStepSet.PlanReceive(
                    ServiceTaskType,
                    External(_archiveRecordJournal, ArchiveIndex),
                    ArchiveIndex
                ),
                new MailboxTarget(_mailboxId, ArchiveIndex)
            )
        );

    /// <summary>The hand-over a completed stage makes: the next item's workflow, with nothing to close.</summary>
    private static ServiceTaskContinuation.ContinueAfterStage NextItem(
        ServiceTaskPipeline pipeline,
        int afterItemIndex
    ) =>
        new(
            new ServiceTaskHandover(
                afterItemIndex,
                WorkflowStepSet.PlanItem(ServiceTaskType, pipeline, afterItemIndex + 1)
            )
        );

    /// <summary>
    /// The hand-over a reply handler done with its replies makes: close the stage's mailbox, then the next item's
    /// workflow.
    /// </summary>
    private static ServiceTaskContinuation.CloseAndContinue Continuing(
        ServiceTaskPipeline? pipeline = null,
        int afterItemIndex = ArchiveIndex
    ) =>
        new(
            _mailboxId,
            new ServiceTaskHandover(
                afterItemIndex,
                WorkflowStepSet.PlanItem(ServiceTaskType, pipeline ?? _archiveRecordJournal, afterItemIndex + 1)
            )
        );

    /// <summary>The archive's reply handler waiting for the reply after <paramref name="position"/>.</summary>
    private static ServiceTaskContinuation.AwaitNextMessage AwaitNext(long position) =>
        new(_mailboxId, ServiceTaskType, ArchiveIndex, position, _archiveOptions, ArchiveReplyStepName);

    private static List<string> StepOperationIds(WorkflowRequest workflow) =>
        workflow.Steps.Select(step => step.OperationId).ToList();

    private static ExecuteServiceTaskPayload StepPayload(StepRequest step)
    {
        JsonElement data = Assert.NotNull(step.Command.Data);
        AppCommandData? appData = data.Deserialize<AppCommandData>();
        Assert.NotNull(appData);
        Assert.Equal(ExecuteServiceTask.Key, appData.CommandKey);
        ExecuteServiceTaskPayload? payload = CommandPayloadSerializer.Deserialize<ExecuteServiceTaskPayload>(
            appData.Payload
        );
        Assert.NotNull(payload);
        return payload;
    }

    /// <summary>The labels and context every successor carries, whatever it is.</summary>
    private static void AssertSuccessorEnvelope(RelayRecorder recorder, WorkflowEnqueueRequest request)
    {
        Assert.NotNull(request.Labels);
        Assert.Equal(
            _instanceGuid.ToString("N", CultureInfo.InvariantCulture),
            request.Labels[ProcessNextRequestFactory.ProcessNextInstanceGuidLabel]
        );
        Assert.Equal("Task_2", request.Labels[ProcessNextRequestFactory.ProcessNextTargetTaskLabel]);
        Assert.False(request.Labels.ContainsKey(ProcessNextRequestFactory.ProcessNextSourceTaskLabel));
        Assert.False(request.Labels.ContainsKey(ProcessNextRequestFactory.ProcessNextSourceFlowLabel));

        AppWorkflowContext? context = request.Context?.Deserialize<AppWorkflowContext>();
        Assert.NotNull(context);
        Assert.Equal(_instanceGuid, context.InstanceGuid);
        Assert.Equal(new Actor { UserId = 1337 }, context.Actor);
        recorder.Tokens.AssertMintedFor(request);
    }

    // ---------------------------------------------------------------------------------------------
    // A mailbox closes before anything downstream starts.
    // ---------------------------------------------------------------------------------------------

    [Fact]
    public async Task Conclude_ClosesTheMailboxBeforeEnqueueingTheAfterWorkflow()
    {
        var workflowId = Guid.NewGuid();
        var recorder = new RelayRecorder();

        await CreateRelay(recorder)
            .Continue(
                new ServiceTaskContinuation.CloseAndEndTask(_mailboxId),
                CreateRequest(_stepId, workflowId, action: "reject"),
                CancellationToken.None
            );

        Assert.Equal(["close-mailbox", "enqueue-after-workflow"], recorder.Calls);
        Assert.Equal(_mailboxId, Assert.Single(recorder.Closes));
        (Guid dependsOn, string collectionKey, string state, string? action, string? key) = Assert.Single(
            recorder.AfterWorkflows
        );
        Assert.Equal(workflowId, dependsOn);
        Assert.Equal(_instanceGuid.ToString(), collectionKey);
        Assert.Equal("published-state", state);
        Assert.Equal("reject", action);
        Assert.Equal(_stepId.ToString(), key);
    }

    [Fact]
    public async Task ConcludeAndContinue_ClosesTheMailboxBeforeEnqueueingTheNextItem()
    {
        var recorder = new RelayRecorder();

        await CreateRelay(recorder).Continue(Continuing(), CreateRequest(_stepId), CancellationToken.None);

        // The reverse order compiles, and would let a reply land in a stage the pipeline has moved past.
        Assert.Equal(["close-mailbox", "enqueue-continuation"], recorder.Calls);
        Assert.Equal(_mailboxId, Assert.Single(recorder.Closes));
        Assert.Empty(recorder.AfterWorkflows);
    }

    // ---------------------------------------------------------------------------------------------
    // Only the step done with the mailbox closes it, and nothing else does.
    // ---------------------------------------------------------------------------------------------

    [Fact]
    public void MailboxContinuation_HasExactlyFourAnswers_AndNoneCanMeanAnothers()
    {
        // Structural proof: the continuation type's constructor is private to itself, so the set is closed
        // at four.
        Type[] members = typeof(ServiceTaskContinuation)
            .GetNestedTypes(System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Public)
            .Where(t => typeof(ServiceTaskContinuation).IsAssignableFrom(t))
            .ToArray();

        Assert.Equal(4, members.Length);
        Assert.Contains(typeof(ServiceTaskContinuation.AwaitNextMessage), members);
        Assert.Contains(typeof(ServiceTaskContinuation.ContinueAfterStage), members);
        Assert.Contains(typeof(ServiceTaskContinuation.CloseAndEndTask), members);
        Assert.Contains(typeof(ServiceTaskContinuation.CloseAndContinue), members);
        Assert.All(members, member => Assert.True(member.IsSealed));

        // The record's synthesized copy constructor is excluded deliberately: it can only clone an instance
        // that already exists, so it adds no member to the set.
        Assert.All(
            typeof(ServiceTaskContinuation).GetConstructors(
                System.Reflection.BindingFlags.Instance
                    | System.Reflection.BindingFlags.Public
                    | System.Reflection.BindingFlags.NonPublic
            ),
            constructor =>
            {
                System.Reflection.ParameterInfo[] parameters = constructor.GetParameters();
                bool isCopyConstructor =
                    parameters.Length == 1 && parameters[0].ParameterType == typeof(ServiceTaskContinuation);
                Assert.True(
                    isCopyConstructor || constructor.IsPrivate,
                    $"ServiceTaskContinuation exposes a constructor a fifth answer could chain to: {constructor}"
                );
            }
        );
    }

    public static TheoryData<string> NonClosingHops => new() { "receiver", "first-receiver", "next-item" };

    /// <summary>
    /// Waiting for the next reply, starting a stage's first receiver and starting the item after a stage close
    /// nothing and start no next transition: none of them is done with a mailbox.
    /// </summary>
    [Theory]
    [MemberData(nameof(NonClosingHops))]
    public async Task HopsThatAreNotDoneWithTheMailbox_CloseNothing(string hop)
    {
        var recorder = new RelayRecorder();

        await CreateRelay(recorder).Continue(Hop(hop), CreateRequest(_stepId), CancellationToken.None);

        Assert.Single(recorder.Enqueues);
        Assert.Empty(recorder.Closes);
        Assert.Empty(recorder.AfterWorkflows);
    }

    // ---------------------------------------------------------------------------------------------
    // The successors: each one workflow, a head that depends on heads.
    // ---------------------------------------------------------------------------------------------

    /// <summary>
    /// The first receiver, enqueued from inside the send's still-unsettled step: the stage's reply step alone,
    /// parked on the stage's mailbox, with the stage's options and the reply step's name.
    /// </summary>
    [Fact]
    public async Task FirstReceiver_IsAHeadThatDependsOnHeads_ParkedOnTheStagesMailbox()
    {
        var recorder = new RelayRecorder();

        await CreateRelay(recorder).Continue(FirstReceiver(), CreateRequest(_stepId), CancellationToken.None);

        Assert.Equal(["enqueue-receiver"], recorder.Calls);
        (string ns, string idempotencyKey, string? collectionKey, WorkflowEnqueueRequest request) = Assert.Single(
            recorder.Enqueues
        );
        Assert.Equal("ttd/test-app", ns);
        Assert.Equal(_stepId.ToString(), idempotencyKey);
        Assert.Equal(_instanceGuid.ToString(), collectionKey);

        WorkflowRequest receiver = Assert.Single(request.Workflows);
        Assert.True(receiver.IsHead);
        Assert.True(receiver.DependsOnHeads);
        Assert.Null(receiver.StartAt);
        Assert.Equal(_mailboxId, receiver.Mailbox?.Id);
        Assert.Equal("published-state", receiver.State);
        Assert.Equal($"Mailbox receive: Task_2 · {ArchiveIndex}", receiver.OperationId);

        StepRequest step = Assert.Single(receiver.Steps);
        Assert.Equal($"{ExecuteServiceTask.Key}: {ArchiveIndex}", step.OperationId);
        Assert.Equal(new ExecuteServiceTaskPayload(ServiceTaskType, ArchiveIndex), StepPayload(step));
        Assert.Equal(TimeSpan.FromMinutes(3), step.Command.MaxExecutionTime);
        Assert.NotNull(step.Labels);
        Assert.Equal(ArchiveReplyStepName, step.Labels[WorkflowStepSet.StepNameLabel]);

        AssertSuccessorEnvelope(recorder, request);
    }

    /// <summary>
    /// The receiver after a reply the handler answered with <c>AwaitNextReply</c>: the same stage's reply step,
    /// parked on the same mailbox, with the options and step name the continuation carried, and named for the
    /// position just answered.
    /// </summary>
    [Fact]
    public async Task SuccessorReceiver_IsAHeadThatDependsOnHeads_WithTheStagesOptionsAndStepName()
    {
        var recorder = new RelayRecorder();

        await CreateRelay(recorder).Continue(AwaitNext(position: 4), CreateRequest(_stepId), CancellationToken.None);

        Assert.Equal(["enqueue-receiver"], recorder.Calls);
        (_, string idempotencyKey, string? collectionKey, WorkflowEnqueueRequest request) = Assert.Single(
            recorder.Enqueues
        );
        Assert.Equal(_stepId.ToString(), idempotencyKey);
        Assert.Equal(_instanceGuid.ToString(), collectionKey);

        WorkflowRequest receiver = Assert.Single(request.Workflows);
        Assert.True(receiver.IsHead);
        Assert.True(receiver.DependsOnHeads);
        Assert.Null(receiver.StartAt);
        Assert.Equal(_mailboxId, receiver.Mailbox?.Id);
        Assert.Equal("published-state", receiver.State);
        Assert.Equal("Mailbox receive: Task_2 · after message 4", receiver.OperationId);

        StepRequest step = Assert.Single(receiver.Steps);
        Assert.Equal($"{ExecuteServiceTask.Key}: {ArchiveIndex}", step.OperationId);
        Assert.Equal(new ExecuteServiceTaskPayload(ServiceTaskType, ArchiveIndex), StepPayload(step));
        Assert.Equal(TimeSpan.FromMinutes(3), step.Command.MaxExecutionTime);
        Assert.NotNull(step.Labels);
        Assert.Equal(ArchiveReplyStepName, step.Labels[WorkflowStepSet.StepNameLabel]);

        AssertSuccessorEnvelope(recorder, request);
    }

    /// <summary>
    /// After a reply handler is done, the next item runs alone in a continuation named for the stage it follows:
    /// no mailbox, and that item's own options. Completing that item is what starts the workflow after it, so the
    /// continuation cannot settle before its successor exists.
    /// </summary>
    [Fact]
    public async Task Continuation_AfterAnExternalStage_RunsTheNextItemAlone()
    {
        var recorder = new RelayRecorder();

        await CreateRelay(recorder).Continue(Continuing(), CreateRequest(_stepId), CancellationToken.None);

        (_, string idempotencyKey, string? collectionKey, WorkflowEnqueueRequest request) = Assert.Single(
            recorder.Enqueues
        );
        Assert.Equal(_stepId.ToString(), idempotencyKey);
        Assert.Equal(_instanceGuid.ToString(), collectionKey);

        WorkflowRequest continuation = Assert.Single(request.Workflows);
        Assert.True(continuation.IsHead);
        Assert.True(continuation.DependsOnHeads);
        Assert.Null(continuation.StartAt);
        Assert.Null(continuation.Mailbox);
        Assert.Equal("published-state", continuation.State);
        Assert.Equal($"Service task stage: Task_2 · {ArchiveIndex + 1}", continuation.OperationId);

        StepRequest step = Assert.Single(continuation.Steps);
        Assert.Equal($"{ExecuteServiceTask.Key}: {RecordIndex}", step.OperationId);
        Assert.Equal(new ExecuteServiceTaskPayload(ServiceTaskType, RecordIndex), StepPayload(step));
        Assert.Equal(TimeSpan.FromMinutes(7), step.Command.MaxExecutionTime);

        AssertSuccessorEnvelope(recorder, request);
    }

    /// <summary>
    /// Two exchanges are two external stages: once the first's handler is done, its mailbox closes and the second
    /// stage's workflow starts, minting its own mailbox before its send. The mint takes no options, never the
    /// stage's.
    /// </summary>
    [Fact]
    public async Task Continuation_IntoAnotherExternalStage_RunsItsMintThenItsSend()
    {
        var recorder = new RelayRecorder();

        await CreateRelay(recorder)
            .Continue(Continuing(_archiveThenJournal), CreateRequest(_stepId), CancellationToken.None);

        Assert.Equal(["close-mailbox", "enqueue-continuation"], recorder.Calls);
        WorkflowRequest continuation = Assert.Single(Assert.Single(recorder.Enqueues).Request.Workflows);
        Assert.Null(continuation.Mailbox);
        Assert.Equal("Service task stage: Task_2 · 1", continuation.OperationId);
        Assert.Equal([$"{MintMailbox.Key}: 1", $"{ExecuteServiceTask.Key}: 1"], StepOperationIds(continuation));
        Assert.Equal(new ExecuteServiceTaskPayload(ServiceTaskType, 1), StepPayload(continuation.Steps[^1]));
        Assert.Null(continuation.Steps[0].Command.MaxExecutionTime);
    }

    /// <summary>
    /// The hop a stage ends its workflow on: nothing closes, and the next item's workflow starts, named for the
    /// stage. Here the next item is an external stage, so its mint comes first, with no options of its own.
    /// </summary>
    [Fact]
    public async Task NextItem_AfterAStage_ClosesNothingAndRunsTheExternalStagesMintThenSend()
    {
        var recorder = new RelayRecorder();

        await CreateRelay(recorder)
            .Continue(NextItem(_archiveRecordJournal, RecordIndex), CreateRequest(_stepId), CancellationToken.None);

        Assert.Equal(["enqueue-continuation"], recorder.Calls);
        (_, string idempotencyKey, _, WorkflowEnqueueRequest request) = Assert.Single(recorder.Enqueues);
        Assert.Equal(_stepId.ToString(), idempotencyKey);

        WorkflowRequest continuation = Assert.Single(request.Workflows);
        Assert.True(continuation.IsHead);
        Assert.True(continuation.DependsOnHeads);
        Assert.Null(continuation.Mailbox);
        Assert.Equal("published-state", continuation.State);
        Assert.Equal($"Service task stage: Task_2 · {RecordIndex + 1}", continuation.OperationId);
        Assert.Equal(
            [$"{MintMailbox.Key}: {JournalIndex}", $"{ExecuteServiceTask.Key}: {JournalIndex}"],
            StepOperationIds(continuation)
        );
        Assert.All(continuation.Steps, step => Assert.Null(step.Command.MaxExecutionTime));

        AssertSuccessorEnvelope(recorder, request);
    }

    // ---------------------------------------------------------------------------------------------
    // Every enqueue keys on the executing step.
    // ---------------------------------------------------------------------------------------------

    /// <summary>A hop the relay runs, by the successor it enqueues.</summary>
    private static ServiceTaskContinuation Hop(string hop) =>
        hop switch
        {
            "receiver" => AwaitNext(position: 2),
            "first-receiver" => FirstReceiver(),
            "continuation" => Continuing(),
            "next-item" => NextItem(_archiveRecordJournal, RecordIndex),
            "after-workflow" => new ServiceTaskContinuation.CloseAndEndTask(_mailboxId),
            _ => throw new ArgumentOutOfRangeException(nameof(hop), hop, null),
        };

    public static TheoryData<string> Hops =>
        new() { "receiver", "first-receiver", "continuation", "next-item", "after-workflow" };

    /// <summary>
    /// Each hop makes one keyed enqueue, keyed on the bare executing step id: a replayed attempt of the step lands
    /// on the same key, and another step never does.
    /// </summary>
    [Theory]
    [MemberData(nameof(Hops))]
    public async Task EveryHop_KeysItsEnqueueOnTheExecutingStep(string hop)
    {
        var recorder = new RelayRecorder();
        ServiceTaskRelay relay = CreateRelay(recorder);
        var otherStepId = Guid.NewGuid();

        await relay.Continue(Hop(hop), CreateRequest(_stepId), CancellationToken.None);
        await relay.Continue(Hop(hop), CreateRequest(_stepId), CancellationToken.None);
        await relay.Continue(Hop(hop), CreateRequest(otherStepId), CancellationToken.None);

        List<string?> keys =
            hop == "after-workflow"
                ? recorder.AfterWorkflows.Select(after => after.IdempotencyKey).ToList()
                : recorder.Enqueues.Select(enqueue => (string?)enqueue.IdempotencyKey).ToList();
        Assert.Equal([_stepId.ToString(), _stepId.ToString(), otherStepId.ToString()], keys);
    }

    // ---------------------------------------------------------------------------------------------
    // The decisions, where only a direct call reaches them.
    // ---------------------------------------------------------------------------------------------

    private static WorkflowCallbackStateCarry OpenCarry()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(ArchiveIndex, _mailboxId, _mailboxDeadline);
        return carry;
    }

    private static readonly CarriedMailbox _carried = new() { Id = _mailboxId, Deadline = _mailboxDeadline };

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

    /// <summary>The archive's external stage, then a stage that is the pipeline's last item.</summary>
    private static readonly ServiceTaskPipeline _archiveThenRecord = new PipelineBuilder.ServiceTask()
        .ExternalStage(SendToArchive, HandleArchiveReply)
        .Stage(RecordArchived)
        .ToPipeline();

    /// <summary>
    /// A stage that ends the task while a mailbox is still carried closes it first, as any step ending the task
    /// does, whether it ends the task with an action or by completing the last item. No dispatch reaches this — a
    /// stage never runs while a mailbox is open — so it is called directly.
    /// </summary>
    [Theory]
    [InlineData("reject", false)]
    [InlineData(null, true)]
    public void Stage_EndingTheTask_WithAMailboxStillCarried_ClosesItBeforeTheNextTransition(
        string? action,
        bool byCompletingTheLastItem
    )
    {
        WorkflowCallbackStateCarry carry = OpenCarry();

        WorkflowEngineCommandResult result = ServiceTaskRelay.DecideStage(
            byCompletingTheLastItem ? ServiceTaskResult.Completed() : ServiceTaskResult.EndTask(action),
            ServiceTaskType,
            _stepId,
            carry,
            RecordIndex,
            byCompletingTheLastItem ? _archiveThenRecord : _archiveRecordJournal
        );

        SuccessfulWorkflowEngineCommandResult success = Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        Assert.NotNull(success.ProcessNextContinuation);
        Assert.Equal(action, success.ProcessNextContinuation.Action);
        Assert.Equal(
            _mailboxId,
            Assert.IsType<ServiceTaskContinuation.CloseAndEndTask>(success.ServiceTaskContinuation).MailboxId
        );
        Assert.Null(carry.Mailboxes);
    }

    /// <summary>
    /// The decisions that make a keyed call: an enqueue, or a close before the next transition. An empty step id
    /// is a constant every task in the application would share, so each is refused before anything is recorded,
    /// and a fixed engine replays the step against the carry as it was.
    /// </summary>
    public static TheoryData<string> KeyedDecisions =>
        new()
        {
            "stage completed mid-pipeline",
            "stage ended with a mailbox carried",
            "stage completed the last item with a mailbox carried",
            "send completed",
            "send ended",
            "reply awaits the next",
            "reply completed mid-pipeline",
            "reply completed on the last item",
            "reply ended",
        };

    [Theory]
    [MemberData(nameof(KeyedDecisions))]
    public void KeyedDecision_WithoutAStepId_IsRefusedAndLeavesTheCarry(string decision)
    {
        WorkflowCallbackStateCarry carry = OpenCarry();

        WorkflowEngineCommandResult result = Decide(decision, Guid.Empty, carry);

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxStepIdMissing", failed.ExceptionType);
        Assert.Equal(_mailboxId, carry.FindMailbox(ArchiveIndex)?.Id);
    }

    public static TheoryData<string> UnkeyedDecisions =>
        new()
        {
            "stage completed on the last item",
            "stage ended with nothing carried",
            "send deferred",
            "reply failed permanently",
            "reply failed retryably",
        };

    /// <summary>The decisions that make no keyed call are not refused for want of a step id.</summary>
    [Theory]
    [MemberData(nameof(UnkeyedDecisions))]
    public void UnkeyedDecision_WithoutAStepId_IsUnaffected(string decision)
    {
        WorkflowEngineCommandResult result = Decide(decision, Guid.Empty, OpenCarry());

        if (result is FailedWorkflowEngineCommandResult failed)
        {
            Assert.Equal(ExecuteServiceTask.FailedReasonCode, failed.ExceptionType);
        }
        else if (result is SuccessfulWorkflowEngineCommandResult success)
        {
            Assert.NotNull(success.ProcessNextContinuation);
            Assert.Null(success.ServiceTaskContinuation);
        }
        else
        {
            Assert.IsType<DeferredWorkflowEngineCommandResult>(result);
        }
    }

    private static WorkflowEngineCommandResult Decide(string decision, Guid stepId, WorkflowCallbackStateCarry carry)
    {
        ServiceTaskItem.ExternalStage archive = External(_archiveRecordJournal, ArchiveIndex);
        ServiceTaskItem.ExternalStage journal = External(_archiveRecordJournal, JournalIndex);
        return decision switch
        {
            "stage completed mid-pipeline" => ServiceTaskRelay.DecideStage(
                ServiceTaskResult.Completed(),
                ServiceTaskType,
                stepId,
                carry,
                RecordIndex,
                _archiveRecordJournal
            ),
            "stage completed on the last item" => ServiceTaskRelay.DecideStage(
                ServiceTaskResult.Completed(),
                ServiceTaskType,
                stepId,
                new WorkflowCallbackStateCarry(),
                RecordIndex,
                new PipelineBuilder.ServiceTask().Stage(RecordArchived).Stage(RecordArchived).ToPipeline()
            ),
            "stage ended with a mailbox carried" => ServiceTaskRelay.DecideStage(
                ServiceTaskResult.EndTask("reject"),
                ServiceTaskType,
                stepId,
                carry,
                RecordIndex,
                _archiveRecordJournal
            ),
            "stage completed the last item with a mailbox carried" => ServiceTaskRelay.DecideStage(
                ServiceTaskResult.Completed(),
                ServiceTaskType,
                stepId,
                carry,
                RecordIndex,
                _archiveThenRecord
            ),
            "stage ended with nothing carried" => ServiceTaskRelay.DecideStage(
                ServiceTaskResult.EndTask("reject"),
                ServiceTaskType,
                stepId,
                new WorkflowCallbackStateCarry(),
                RecordIndex,
                _archiveRecordJournal
            ),
            "send completed" => ServiceTaskRelay.DecideSend(
                ServiceTaskResult.Completed(),
                ServiceTaskType,
                stepId,
                carry,
                _carried,
                archive,
                ArchiveIndex
            ),
            "send ended" => ServiceTaskRelay.DecideSend(
                ServiceTaskResult.EndTask(),
                ServiceTaskType,
                stepId,
                carry,
                _carried,
                archive,
                ArchiveIndex
            ),
            "send deferred" => ServiceTaskRelay.DecideSend(
                ServiceTaskResult.Defer(TimeSpan.FromMinutes(1)),
                ServiceTaskType,
                stepId,
                carry,
                _carried,
                archive,
                ArchiveIndex
            ),
            "reply awaits the next" => ServiceTaskRelay.DecideReply(
                ServiceTaskReplyResult.AwaitNextReply(),
                ServiceTaskType,
                stepId,
                Delivered(),
                carry,
                archive,
                ArchiveIndex,
                _archiveRecordJournal
            ),
            "reply completed mid-pipeline" => ServiceTaskRelay.DecideReply(
                ServiceTaskReplyResult.Completed(),
                ServiceTaskType,
                stepId,
                Delivered(),
                carry,
                archive,
                ArchiveIndex,
                _archiveRecordJournal
            ),
            "reply completed on the last item" => ServiceTaskRelay.DecideReply(
                ServiceTaskReplyResult.Completed(),
                ServiceTaskType,
                stepId,
                Delivered(),
                carry,
                journal,
                JournalIndex,
                _archiveRecordJournal
            ),
            "reply ended" => ServiceTaskRelay.DecideReply(
                ServiceTaskReplyResult.EndTask("reject"),
                ServiceTaskType,
                stepId,
                Delivered(),
                carry,
                archive,
                ArchiveIndex,
                _archiveRecordJournal
            ),
            "reply failed permanently" => ServiceTaskRelay.DecideReply(
                ServiceTaskReplyResult.FailedPermanent("the archive rejected the record"),
                ServiceTaskType,
                stepId,
                Delivered(),
                carry,
                archive,
                ArchiveIndex,
                _archiveRecordJournal
            ),
            "reply failed retryably" => ServiceTaskRelay.DecideReply(
                ServiceTaskReplyResult.FailedRetryable("the archive is down"),
                ServiceTaskType,
                stepId,
                Delivered(),
                carry,
                archive,
                ArchiveIndex,
                _archiveRecordJournal
            ),
            _ => throw new ArgumentOutOfRangeException(nameof(decision), decision, null),
        };
    }
}
