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
/// The relay saga: the three invariants the mailbox design trades an engine-enforced conclusion for.
/// Every test here exists because the property it pins is one a wrong implementation would still
/// compile with.
/// </summary>
public class MailboxRelayTests
{
    private static readonly Guid _instanceGuid = new("2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde");
    private static readonly Guid _mailboxId = new("018f4e00-0000-7000-8000-0000000000aa");
    private const string ServiceTaskType = "archiving";

    /// <summary>An ordinary engine-supplied step id — what every callback but the guarded ones carries.</summary>
    private static readonly Guid _stepId = new("018f4e00-0000-7000-8000-0000000000fe");

    /// <summary>
    /// One log of every engine call the relay makes, in the order it made them — across both the
    /// engine client and the process engine, because the ordering invariant spans the two.
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
            recorder.Calls.Add("enqueue-receiver");
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

    private static MailboxRelay CreateRelay(RelayRecorder recorder)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        services.AddSingleton<IPipelineServiceTask>(new ArchivingTask());
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
            processEngine.Object
        );
    }

    /// <summary>A task whose conclusion is the reply handler, so the relay has a step shape to build.</summary>
    private sealed class ArchivingTask : IPipelineServiceTask
    {
        public string Type => ServiceTaskType;

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage("SendToArchive", _ => Task.FromResult(ServiceTaskStageResult.Completed()))
                .Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()))
                .WithReplyFrom("SendToArchive", new MailboxOptions { Timeout = TimeSpan.FromDays(3) });
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
        // Saga invariant 1, and the whole reason the two calls live in one method. The reverse order
        // compiles and passes every other test in this file: it opens a window in which the
        // continuation runs while the mailbox still accepts messages, so a message could be
        // delivered into an exchange the app has already concluded and would never be read.
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
        // A task that concludes without advancing the process starts nothing — but the exchange is
        // over either way, and an open mailbox nobody will ever read from is a leak that only its
        // deadline closes.
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
        // The failure path carries no published state, so the relay must not reach for one. The close
        // still happens: an exchange the app gave up on must stop accepting messages.
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
    public void MailboxContinuation_HasExactlyTwoAnswers_AndNeitherCanMeanBoth()
    {
        // Saga invariant 2 is structural, and this is the structure: the continuation type's
        // constructor is private to itself, so the set is closed at two, and neither member carries
        // any way to express the other's action. A handler that asked for another message cannot
        // also dispose; the concluding handler cannot also enqueue a successor. Nothing is left for
        // review to catch, which is the point — the alternative was a bool a wrong branch could read
        // the wrong way.
        Type[] members = typeof(MailboxContinuation)
            .GetNestedTypes(System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Public)
            .Where(t => typeof(MailboxContinuation).IsAssignableFrom(t))
            .ToArray();

        Assert.Equal(2, members.Length);
        Assert.Contains(typeof(MailboxContinuation.AwaitNextMessage), members);
        Assert.Contains(typeof(MailboxContinuation.Conclude), members);
        Assert.All(members, member => Assert.True(member.IsSealed));

        // Every real constructor on the base is private, so a third answer cannot be declared outside
        // the file that declares these two. The record's synthesized copy constructor is protected and
        // is excluded deliberately: it can only clone an instance that already exists, so it adds no
        // member to the set — and the relay's switch throws on anything that is not one of the two.
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
                    $"MailboxContinuation exposes a constructor a third answer could chain to: {constructor}"
                );
            }
        );
    }

    [Fact]
    public async Task AwaitingTheNextMessage_ClosesNothing()
    {
        // The other half of "at most one concludes": the continuing handler must not dispose. If it
        // did, the successor it just enqueued would be born holding the closing signal, and the
        // exchange would end on a message that never came.
        var recorder = new RelayRecorder();

        await CreateRelay(recorder)
            .Continue(
                new MailboxContinuation.AwaitNextMessage(_mailboxId, ServiceTaskType, position: 0),
                CreateRequest(Guid.NewGuid()),
                CancellationToken.None
            );

        Assert.Equal(["enqueue-receiver"], recorder.Calls);
        Assert.Empty(recorder.Closes);
        Assert.Empty(recorder.AfterWorkflows);
    }

    [Fact]
    public void AwaitNextReply_OnAClosedMailbox_IsRejectedNonRetryably()
    {
        // The one contract violation the engine explicitly does not enforce — it guarantees only the
        // callback's meaning. A callback with no message means the mailbox is closed and no message
        // can ever arrive at this position, so there is no next message to ask for; a retry
        // re-derives the same closed truth, so the ladder cannot help.
        var carry = new WorkflowCallbackStateCarry();

        ProcessEngineCommandResult result = MailboxRelay.Decide(
            ServiceTaskResult.AwaitNextReply(),
            ServiceTaskType,
            _stepId,
            Closed(),
            carry
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxExchangeAlreadyClosed", failed.ExceptionType);
        Assert.Null(failed.MailboxContinuation);
        // It is a violation, not a conclusion: nothing here may close the mailbox on the handler's
        // behalf, and the blob must keep saying what it said.
        Assert.False(carry.MailboxConcluded);
    }

    // ---------------------------------------------------------------------------------------------
    // Saga invariant 3 — every mid-callback call keys off the executing step.
    // ---------------------------------------------------------------------------------------------

    [Fact]
    public async Task EverySagaEnqueue_KeysOffTheExecutingStep()
    {
        // Saga invariant 3. Both keys are functions of this step's id and nothing else — not the
        // workflow, not the mailbox, not a clock — so a crashed attempt's replay lands on the
        // workflow the first attempt created instead of forking the relay into two.
        var stepId = new Guid("018f4e00-0000-7000-8000-00000000dead");

        var awaiting = new RelayRecorder();
        await CreateRelay(awaiting)
            .Continue(
                new MailboxContinuation.AwaitNextMessage(_mailboxId, ServiceTaskType, position: 1),
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

        // Different steps, different keys — otherwise two hops would collapse onto one workflow.
        var otherStep = new RelayRecorder();
        await CreateRelay(otherStep)
            .Continue(
                new MailboxContinuation.AwaitNextMessage(_mailboxId, ServiceTaskType, position: 1),
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
        // The property the key derivation exists for, stated as the retry it protects: the engine
        // hands a retried step the same step id, so a second attempt of the same hop enqueues under
        // the same key and the engine deduplicates it.
        var stepId = Guid.NewGuid();
        var recorder = new RelayRecorder();
        MailboxRelay relay = CreateRelay(recorder);

        var continuation = new MailboxContinuation.AwaitNextMessage(_mailboxId, ServiceTaskType, position: 0);
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
        // Saga invariant 3 from the other side: the key must exist before a continuation promises to
        // use it. StepId is deliberately not required on the callback payload — an engine predating
        // the field leaves it empty — and an empty id is a constant, so every exchange in this
        // application would enqueue under the same two keys and all but the first would silently
        // stall. Reachable exactly where this design lives: an engine rolled back while a receiver is
        // Held, days into an exchange.
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(_mailboxId);

        ProcessEngineCommandResult result = MailboxRelay.Decide(
            awaitNext ? ServiceTaskResult.AwaitNextReply() : ServiceTaskResult.Success(),
            ServiceTaskType,
            Guid.Empty,
            Delivered(),
            carry
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxStepIdMissing", failed.ExceptionType);
        // Refused before anything exists to act on: nothing is closed, nothing is enqueued, and the
        // blob still says what it said.
        Assert.Null(failed.MailboxContinuation);
        Assert.False(carry.MailboxConcluded);
    }

    [Fact]
    public void AVerdictThatMakesNoKeyedCall_IsUnaffectedByAMissingStepId()
    {
        // The guard is narrow on purpose. A conclusion that starts nothing only closes the mailbox,
        // which takes no key; a retryable failure and a deferral touch nothing at all. Refusing these
        // as well would turn a working callback permanently failed over a key it never uses — and
        // would take the close with it.
        var carry = new WorkflowCallbackStateCarry();

        Assert.IsType<SuccessfulProcessEngineCommandResult>(
            MailboxRelay.Decide(
                ServiceTaskResult.SuccessWithoutAutoAdvance(),
                ServiceTaskType,
                Guid.Empty,
                Delivered(),
                carry
            )
        );

        FailedProcessEngineCommandResult permanent = Assert.IsType<FailedProcessEngineCommandResult>(
            MailboxRelay.Decide(
                ServiceTaskResult.FailedPermanent("the archive never confirmed"),
                ServiceTaskType,
                Guid.Empty,
                Closed(),
                new WorkflowCallbackStateCarry()
            )
        );
        Assert.IsType<MailboxContinuation.Conclude>(permanent.MailboxContinuation);

        FailedProcessEngineCommandResult retryable = Assert.IsType<FailedProcessEngineCommandResult>(
            MailboxRelay.Decide(
                ServiceTaskResult.FailedRetryable("the archive is down"),
                ServiceTaskType,
                Guid.Empty,
                Delivered(),
                new WorkflowCallbackStateCarry()
            )
        );
        Assert.False(retryable.NonRetryable);

        Assert.IsType<DeferredProcessEngineCommandResult>(
            MailboxRelay.Decide(
                ServiceTaskResult.Defer(TimeSpan.FromMinutes(1)),
                ServiceTaskType,
                Guid.Empty,
                Delivered(),
                new WorkflowCallbackStateCarry()
            )
        );
    }

    // ---------------------------------------------------------------------------------------------
    // The successor's shape.
    // ---------------------------------------------------------------------------------------------

    [Fact]
    public async Task SuccessorReceiver_IsAHeadThatDependsOnNoHead_AndCarriesTheExchangesMailbox()
    {
        // The same shape the first receiver gets, because it is the same kind of workflow. A head, so
        // the exchange stays visible to everything that reads the collection's frontier; depending on
        // no head, so neither the receiver that enqueued it nor a terminal head an earlier transition
        // left behind gates a workflow whose only release is the rendezvous.
        var recorder = new RelayRecorder();

        await CreateRelay(recorder)
            .Continue(
                new MailboxContinuation.AwaitNextMessage(_mailboxId, ServiceTaskType, position: 2),
                CreateRequest(Guid.NewGuid()),
                CancellationToken.None
            );

        (string ns, _, string? collectionKey, WorkflowEnqueueRequest request) = Assert.Single(recorder.Enqueues);
        Assert.Equal("ttd/test-app", ns);
        Assert.Equal(_instanceGuid.ToString(), collectionKey);

        WorkflowRequest successor = Assert.Single(request.Workflows);
        Assert.True(successor.IsHead);
        Assert.False(successor.DependsOnHeads);
        Assert.Null(successor.StartAt);
        Assert.Equal(_mailboxId, successor.Mailbox?.Id);
        Assert.Equal("published-state", successor.State);

        // The transition's labels, which is where "the same shape as the first receiver" stops being
        // a comment and starts being checkable. Two readers need them: the read-path annotation takes
        // the task it names from processNextTargetTask, and the lookup that finds the instance's
        // collection at all filters on processNextTargetId. A successor without them reports a failed
        // exchange with no task, and becomes invisible to the frontier lookup once retention has
        // purged the earlier workflows of the transition.
        Assert.NotNull(request.Labels);
        Assert.Equal(
            _instanceGuid.ToString("N", CultureInfo.InvariantCulture),
            request.Labels[ProcessNextRequestFactory.ProcessNextInstanceGuidLabel]
        );
        Assert.Equal("Task_2:0", request.Labels[ProcessNextRequestFactory.ProcessNextTargetIdLabel]);
        Assert.Equal("Task_2", request.Labels[ProcessNextRequestFactory.ProcessNextTargetTaskLabel]);
        // The task the transition left cannot be recovered from a later hop, and no lookup a receiver
        // is the answer to uses it.
        Assert.False(request.Labels.ContainsKey(ProcessNextRequestFactory.ProcessNextSourceIdLabel));

        // One step, and it is the pipeline's conclusion — a null stage name, here as everywhere else.
        StepRequest step = Assert.Single(successor.Steps);
        Assert.Equal(ExecuteServiceTask.Key, step.OperationId);
        Assert.Contains(ServiceTaskType, step.Command.Data.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task SuccessorReceiver_CarriesAFreshCallbackTokenAndTheTransitionsLockToken()
    {
        // Per-hop credential freshness, and the one thing that is deliberately not fresh. The
        // callback token is minted at this hop, from whatever app code is current now — together
        // with the state blob, re-signed by the same code above, that is what lets an exchange
        // outlive the code that opened it. The instance lock token is carried verbatim, exactly as
        // every other workflow this app-lib enqueues carries it: re-acquiring an instance lock from
        // inside a callback is a different feature, and a deferring service task with a long wait
        // budget already outlives the lock's five-minute TTL the same way.
        var recorder = new RelayRecorder();

        await CreateRelay(recorder)
            .Continue(
                new MailboxContinuation.AwaitNextMessage(_mailboxId, ServiceTaskType, position: 0),
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
        // The conclusion's own workflow: it waits for the receiver that concluded (so it cannot run
        // while the conclusion's data is still being saved) and starts on the state that conclusion
        // published.
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

    // ---------------------------------------------------------------------------------------------
    // The verdict mapping.
    // ---------------------------------------------------------------------------------------------

    [Fact]
    public void Success_ConcludesAndStopsTheMailboxIdTraveling()
    {
        // The conclusion has to un-say what the blob has been saying since the declaring stage. The
        // workflow this conclusion starts inherits its captured blob, and its own service task may
        // open a mailbox — a blob still naming the finished exchange's mailbox would make that mint
        // refuse and fail the next transition permanently.
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(_mailboxId);

        ProcessEngineCommandResult result = MailboxRelay.Decide(
            ServiceTaskResult.Success("confirm"),
            ServiceTaskType,
            _stepId,
            Delivered(),
            carry
        );

        SuccessfulProcessEngineCommandResult success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.True(success.AutoAdvanceProcess);
        Assert.Equal("confirm", success.AutoAdvanceAction);
        Assert.IsType<MailboxContinuation.Conclude>(success.MailboxContinuation);
        Assert.True(carry.MailboxConcluded);
    }

    [Fact]
    public void SuccessWithoutAutoAdvance_ConcludesTheExchangeWithoutAdvancingTheProcess()
    {
        var carry = new WorkflowCallbackStateCarry();

        ProcessEngineCommandResult result = MailboxRelay.Decide(
            ServiceTaskResult.SuccessWithoutAutoAdvance(),
            ServiceTaskType,
            _stepId,
            Delivered(),
            carry
        );

        SuccessfulProcessEngineCommandResult success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.False(success.AutoAdvanceProcess);
        Assert.IsType<MailboxContinuation.Conclude>(success.MailboxContinuation);
    }

    [Fact]
    public void AwaitNextReply_OnADeliveredMessage_ContinuesTheExchangeWithoutAdvancing()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(_mailboxId);

        ProcessEngineCommandResult result = MailboxRelay.Decide(
            ServiceTaskResult.AwaitNextReply(),
            ServiceTaskType,
            _stepId,
            Delivered(seq: 4),
            carry
        );

        SuccessfulProcessEngineCommandResult success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.False(success.AutoAdvanceProcess);
        MailboxContinuation.AwaitNextMessage awaiting = Assert.IsType<MailboxContinuation.AwaitNextMessage>(
            success.MailboxContinuation
        );
        Assert.Equal(_mailboxId, awaiting.MailboxId);
        Assert.Equal(ServiceTaskType, awaiting.ServiceTaskType);
        Assert.Equal(4, awaiting.Position);
        // The exchange goes on, so the mailbox keeps traveling in the blob.
        Assert.False(carry.MailboxConcluded);
    }

    [Fact]
    public void FailedPermanent_ConcludesTheExchangeAndFailsTheStep()
    {
        var carry = new WorkflowCallbackStateCarry();

        ProcessEngineCommandResult result = MailboxRelay.Decide(
            ServiceTaskResult.FailedPermanent("the archive never confirmed"),
            ServiceTaskType,
            _stepId,
            Closed(MailboxDisposedReason.Deadline),
            carry
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Contains("the archive never confirmed", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.IsType<MailboxContinuation.Conclude>(failed.MailboxContinuation);
        // And it records nothing on the carry: a failing callback publishes no blob at all, so there
        // would be no consumer for the record. Asserting one would pin an effect nothing can observe.
        Assert.False(carry.MailboxConcluded);
    }

    [Fact]
    public void FailedRetryable_StartsNoSagaAtAll()
    {
        // Nothing is closed and nothing is enqueued, so the next attempt is handed the same message
        // and the handler may still reach any verdict.
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(_mailboxId);

        ProcessEngineCommandResult result = MailboxRelay.Decide(
            ServiceTaskResult.FailedRetryable("the archive is down"),
            ServiceTaskType,
            _stepId,
            Delivered(),
            carry
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
        Assert.Null(failed.MailboxContinuation);
        Assert.False(carry.MailboxConcluded);
    }

    [Fact]
    public void Defer_ParksTheReceiverAndChangesNothingAboutTheExchange()
    {
        var carry = new WorkflowCallbackStateCarry();

        ProcessEngineCommandResult result = MailboxRelay.Decide(
            ServiceTaskResult.Defer(TimeSpan.FromMinutes(5), "waiting for the archive to settle"),
            ServiceTaskType,
            _stepId,
            Delivered(),
            carry
        );

        DeferredProcessEngineCommandResult deferred = Assert.IsType<DeferredProcessEngineCommandResult>(result);
        Assert.Equal(TimeSpan.FromMinutes(5), deferred.Delay);
        Assert.False(carry.MailboxConcluded);
    }
}
