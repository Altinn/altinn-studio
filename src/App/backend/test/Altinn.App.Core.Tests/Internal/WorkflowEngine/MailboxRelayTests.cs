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
    private const string OpeningStage = "SendToArchive";
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
    public void MailboxContinuation_HasExactlyTwoAnswers_AndNeitherCanMeanBoth()
    {
        // Structural proof: the continuation type's constructor is private to itself, so the set is closed at
        // two, and neither member can express the other's action.
        Type[] members = typeof(MailboxContinuation)
            .GetNestedTypes(System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Public)
            .Where(t => typeof(MailboxContinuation).IsAssignableFrom(t))
            .ToArray();

        Assert.Equal(2, members.Length);
        Assert.Contains(typeof(MailboxContinuation.AwaitNextMessage), members);
        Assert.Contains(typeof(MailboxContinuation.Conclude), members);
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
                    $"MailboxContinuation exposes a constructor a third answer could chain to: {constructor}"
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
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStage, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.Decide(
            ServiceTaskResult.AwaitNextReply(),
            ServiceTaskType,
            _stepId,
            Closed(),
            carry,
            OpeningStage
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxExchangeAlreadyClosed", failed.ExceptionType);
        Assert.Null(failed.MailboxContinuation);
        Assert.NotNull(carry.FindMailbox(OpeningStage));
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
        // StepId is deliberately not required on the payload, and an empty id is a constant — every exchange
        // would share two keys. Reachable: an engine rolled back while a receiver is Held.
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStage, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.Decide(
            awaitNext ? ServiceTaskResult.AwaitNextReply() : ServiceTaskResult.Success(),
            ServiceTaskType,
            Guid.Empty,
            Delivered(),
            carry,
            OpeningStage
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxStepIdMissing", failed.ExceptionType);
        Assert.Null(failed.MailboxContinuation);
        Assert.NotNull(carry.FindMailbox(OpeningStage));
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
                OpeningStage
            )
        );

        FailedProcessEngineCommandResult permanent = Assert.IsType<FailedProcessEngineCommandResult>(
            MailboxRelay.Decide(
                ServiceTaskResult.FailedPermanent("the archive never confirmed"),
                ServiceTaskType,
                Guid.Empty,
                Closed(),
                new WorkflowCallbackStateCarry(),
                OpeningStage
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
                OpeningStage
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
                OpeningStage
            )
        );
    }

    [Fact]
    public async Task SuccessorReceiver_IsAHeadThatDependsOnNoHead_AndCarriesTheExchangesMailbox()
    {
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

        Assert.NotNull(request.Labels);
        Assert.Equal(
            _instanceGuid.ToString("N", CultureInfo.InvariantCulture),
            request.Labels[ProcessNextRequestFactory.ProcessNextInstanceGuidLabel]
        );
        Assert.Equal("Task_2:0", request.Labels[ProcessNextRequestFactory.ProcessNextTargetIdLabel]);
        Assert.Equal("Task_2", request.Labels[ProcessNextRequestFactory.ProcessNextTargetTaskLabel]);
        Assert.False(request.Labels.ContainsKey(ProcessNextRequestFactory.ProcessNextSourceIdLabel));

        StepRequest step = Assert.Single(successor.Steps);
        Assert.Equal(ExecuteServiceTask.Key, step.OperationId);
        Assert.Contains(ServiceTaskType, step.Command.Data.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task SuccessorReceiver_CarriesAFreshCallbackTokenAndTheTransitionsLockToken()
    {
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

    [Fact]
    public void Success_ConcludesAndStopsTheMailboxIdTraveling()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStage, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.Decide(
            ServiceTaskResult.Success("confirm"),
            ServiceTaskType,
            _stepId,
            Delivered(),
            carry,
            OpeningStage
        );

        SuccessfulProcessEngineCommandResult success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.True(success.AutoAdvanceProcess);
        Assert.Equal("confirm", success.AutoAdvanceAction);
        Assert.IsType<MailboxContinuation.Conclude>(success.MailboxContinuation);
        Assert.Null(carry.FindMailbox(OpeningStage));
    }

    [Fact]
    public void SuccessWithoutAutoAdvance_ConcludesTheExchangeWithoutAdvancingTheProcess()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStage, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.Decide(
            ServiceTaskResult.SuccessWithoutAutoAdvance(),
            ServiceTaskType,
            _stepId,
            Delivered(),
            carry,
            OpeningStage
        );

        SuccessfulProcessEngineCommandResult success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.False(success.AutoAdvanceProcess);
        Assert.IsType<MailboxContinuation.Conclude>(success.MailboxContinuation);
    }

    [Fact]
    public void AwaitNextReply_OnADeliveredMessage_ContinuesTheExchangeWithoutAdvancing()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStage, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.Decide(
            ServiceTaskResult.AwaitNextReply(),
            ServiceTaskType,
            _stepId,
            Delivered(seq: 4),
            carry,
            OpeningStage
        );

        SuccessfulProcessEngineCommandResult success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.False(success.AutoAdvanceProcess);
        MailboxContinuation.AwaitNextMessage awaiting = Assert.IsType<MailboxContinuation.AwaitNextMessage>(
            success.MailboxContinuation
        );
        Assert.Equal(_mailboxId, awaiting.MailboxId);
        Assert.Equal(ServiceTaskType, awaiting.ServiceTaskType);
        Assert.Equal(4, awaiting.Position);
        Assert.NotNull(carry.FindMailbox(OpeningStage));
    }

    [Fact]
    public void FailedPermanent_ConcludesTheExchangeAndFailsTheStep()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStage, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.Decide(
            ServiceTaskResult.FailedPermanent("the archive never confirmed"),
            ServiceTaskType,
            _stepId,
            Closed(MailboxDisposedReason.Deadline),
            carry,
            OpeningStage
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Contains("the archive never confirmed", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.IsType<MailboxContinuation.Conclude>(failed.MailboxContinuation);
        Assert.NotNull(carry.FindMailbox(OpeningStage));
    }

    [Fact]
    public void FailedRetryable_StartsNoSagaAtAll()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStage, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.Decide(
            ServiceTaskResult.FailedRetryable("the archive is down"),
            ServiceTaskType,
            _stepId,
            Delivered(),
            carry,
            OpeningStage
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
        Assert.Null(failed.MailboxContinuation);
        Assert.NotNull(carry.FindMailbox(OpeningStage));
    }

    [Fact]
    public void Defer_ParksTheReceiverAndChangesNothingAboutTheExchange()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningStage, _mailboxId, _mailboxDeadline);

        ProcessEngineCommandResult result = MailboxRelay.Decide(
            ServiceTaskResult.Defer(TimeSpan.FromMinutes(5), "waiting for the archive to settle"),
            ServiceTaskType,
            _stepId,
            Delivered(),
            carry,
            OpeningStage
        );

        DeferredProcessEngineCommandResult deferred = Assert.IsType<DeferredProcessEngineCommandResult>(result);
        Assert.Equal(TimeSpan.FromMinutes(5), deferred.Delay);
        Assert.NotNull(carry.FindMailbox(OpeningStage));
    }
}
