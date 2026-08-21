using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Instances;
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

/// <summary>The frontier-never-empty invariant, walked across a multi-hop relay.</summary>
/// <remarks>
/// Every workflow the exchange needs is enqueued from inside a still-unsettled workflow's step, as a head —
/// getting it wrong is silent early execution of downstream work, so the walk asserts at every boundary.
/// The reader is the app-lib's own <see cref="WorkflowEngineService.GetCurrentTaskWorkflowState"/>, and the
/// walk asserts both that the answer is not <c>Unblocked</c> and <em>which</em> workflow holds it open.
/// </remarks>
public class MailboxRelayFrontierTests
{
    private const string Org = "ttd";
    private const string App = "test-app";
    private const string Namespace = "ttd/test-app";
    private const string ServiceTaskType = "archiving";
    private const string TaskId = "Task_2";

    private static readonly Guid _instanceGuid = new("2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde");
    private static readonly Guid _mailboxId = new("018f4e00-0000-7000-8000-0000000000aa");

    /// <summary>
    /// The engine, reduced to what the frontier depends on: which workflows are heads, and their statuses.
    /// </summary>
    private sealed class CollectionModel : IWorkflowEngineClient
    {
        private readonly List<Row> _workflows = [];

        private sealed record Row(
            Guid Id,
            PersistentItemStatus Status,
            bool IsHead,
            string Name,
            IReadOnlyDictionary<string, string> Labels
        );

        public string CollectionKey { get; } = _instanceGuid.ToString();

        private static Dictionary<string, string> TransitionLabels =>
            new(StringComparer.Ordinal)
            {
                [ProcessNextRequestFactory.ProcessNextInstanceGuidLabel] = _instanceGuid.ToString("N"),
                [ProcessNextRequestFactory.ProcessNextSourceIdLabel] = "Task_1:2",
                [ProcessNextRequestFactory.ProcessNextTargetIdLabel] = $"{TaskId}:3",
                [ProcessNextRequestFactory.ProcessNextTargetTaskLabel] = TaskId,
            };

        public Guid Seed(string name, PersistentItemStatus status, bool isHead = true)
        {
            var id = Guid.NewGuid();
            _workflows.Add(new Row(id, status, isHead, name, TransitionLabels));
            return id;
        }

        /// <summary>Retention purging the transition's earlier workflows.</summary>
        public void Purge(params Guid[] ids) => _workflows.RemoveAll(w => Array.IndexOf(ids, w.Id) >= 0);

        public void Settle(Guid id)
        {
            int index = _workflows.FindIndex(w => w.Id == id);
            _workflows[index] = _workflows[index] with { Status = PersistentItemStatus.Completed };
        }

        public IReadOnlyList<Guid> EnqueuedByTheRelay => _enqueuedByTheRelay;

        private readonly List<Guid> _enqueuedByTheRelay = [];

        public Task<WorkflowEnqueueResponse.Accepted> EnqueueWorkflows(
            string ns,
            string idempotencyKey,
            string? collectionKey,
            WorkflowEnqueueRequest request,
            CancellationToken ct = default
        )
        {
            var accepted = new List<WorkflowResult>();
            foreach (WorkflowRequest workflow in request.Workflows)
            {
                var id = Guid.NewGuid();

                // The engine's own rule: false never a head, true always, null falls back to leaf detection.
                bool isHead = workflow.IsHead ?? true;

                bool joinsTheCollection = string.Equals(collectionKey, CollectionKey, StringComparison.Ordinal);

                // A receive workflow with no message waiting is born Held.
                PersistentItemStatus status = workflow.Mailbox is null
                    ? PersistentItemStatus.Enqueued
                    : PersistentItemStatus.Held;

                if (joinsTheCollection)
                {
                    _workflows.Add(
                        new Row(
                            id,
                            status,
                            isHead,
                            workflow.OperationId,
                            request.Labels ?? new Dictionary<string, string>(StringComparer.Ordinal)
                        )
                    );
                    _enqueuedByTheRelay.Add(id);
                }

                accepted.Add(new WorkflowResult { DatabaseId = id, Namespace = ns });
            }

            return Task.FromResult(new WorkflowEnqueueResponse.Accepted { Workflows = accepted });
        }

        public Task<WorkflowCollectionDetailResponse?> GetCollection(
            string ns,
            string key,
            CancellationToken ct = default
        ) =>
            Task.FromResult<WorkflowCollectionDetailResponse?>(
                new WorkflowCollectionDetailResponse
                {
                    Key = key,
                    Namespace = ns,
                    Heads =
                    [
                        .. _workflows
                            .Where(w => w.IsHead)
                            .Select(w => new CollectionHeadStatus { DatabaseId = w.Id, Status = w.Status }),
                    ],
                    CreatedAt = DateTimeOffset.UtcNow,
                }
            );

        // Modeled rather than stubbed, because this hop finds the collection *at all*: with no workflow
        // carrying the process-next label, the answer is Unblocked however alive the workflow is.
        public Task<IReadOnlyList<WorkflowStatusResponse>> ListWorkflows(
            string ns,
            string? collectionKey = null,
            Dictionary<string, string>? labels = null,
            IReadOnlyList<PersistentItemStatus>? statuses = null,
            CancellationToken ct = default
        ) =>
            Task.FromResult<IReadOnlyList<WorkflowStatusResponse>>([
                .. _workflows
                    .Where(w =>
                        labels is null
                        || labels.All(filter =>
                            w.Labels.TryGetValue(filter.Key, out string? value)
                            && string.Equals(value, filter.Value, StringComparison.Ordinal)
                        )
                    )
                    .Select(w => new WorkflowStatusResponse
                    {
                        DatabaseId = w.Id,
                        Namespace = ns,
                        OperationId = w.Name,
                        IdempotencyKey = $"key-{w.Id:N}",
                        OverallStatus = w.Status,
                        CollectionKey = CollectionKey,
                        Steps = [],
                        CreatedAt = DateTimeOffset.UtcNow,
                        UpdatedAt = DateTimeOffset.UtcNow,
                    }),
            ]);

        public Task<MailboxResponse?> CloseMailbox(string ns, Guid mailboxId, CancellationToken ct = default) =>
            Task.FromResult<MailboxResponse?>(null);

        public Task<MailboxDeliveryResult> DeliverToMailbox(
            string ns,
            Guid mailboxId,
            MailboxDeliveryRequest request,
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

    private sealed class ArchivingTask : IPipelineServiceTask
    {
        public string Type => ServiceTaskType;

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage("SendToArchive", _ => Task.FromResult(ServiceTaskStageResult.Completed()))
                .Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()))
                .WithReplyFrom("SendToArchive", new MailboxOptions { Timeout = TimeSpan.FromDays(3) });
    }

    private static Instance CreateInstance() =>
        new()
        {
            Id = $"1337/{_instanceGuid}",
            Org = Org,
            AppId = Namespace,
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { ElementId = TaskId, Flow = 3 },
            },
        };

    /// <summary>
    /// The relay, wired to the model; the after-workflow is intercepted at the same <see cref="IProcessEngine"/>
    /// entry point production uses and enqueued with the shape it gives it.
    /// </summary>
    private static MailboxRelay CreateRelay(CollectionModel collection)
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
            .Returns<Instance, Actor, string, Guid, string, string, string?, string?, CancellationToken>(
                (_, _, _, _, collectionKey, _, _, idempotencyKey, ct) =>
                    collection.EnqueueWorkflows(
                        Namespace,
                        idempotencyKey!,
                        collectionKey,
                        new WorkflowEnqueueRequest
                        {
                            Workflows =
                            [
                                new WorkflowRequest { OperationId = "Process next: Task_2 -> Task_3", Steps = [] },
                            ],
                        },
                        ct
                    )
            );

        return new MailboxRelay(
            collection,
            Mock.Of<IWorkflowCallbackTokenGenerator>(g => g.GenerateToken(It.IsAny<Guid>()) == "callback-token"),
            new ProcessStepOptionsResolver([], sp.GetRequiredService<AppImplementationFactory>()),
            processEngine.Object
        );
    }

    private static WorkflowEngineService CreateReader(CollectionModel collection) =>
        new(processNextRequestFactory: null!, collection, Mock.Of<IInstanceClient>(), new AppIdentifier(Org, App));

    private static MailboxRelayRequest CreateRequest(Guid receiverWorkflowId, Guid stepId) =>
        new()
        {
            AppId = new AppIdentifier(Org, App),
            InstanceId = new InstanceIdentifier(1337, _instanceGuid),
            Payload = new AppCallbackPayload
            {
                CommandKey = ExecuteServiceTask.Key,
                Actor = new Actor { UserId = 1337 },
                LockToken = "lock-token",
                ExecutionReferenceTime = new DateTimeOffset(2026, 8, 19, 10, 0, 0, TimeSpan.Zero),
                WorkflowId = receiverWorkflowId,
                StepId = stepId,
                State = "incoming-state",
            },
            Instance = CreateInstance(),
            State = "published-state",
            AutoAdvanceProcess = true,
            AutoAdvanceAction = null,
        };

    [Fact]
    public async Task MultiHopRelay_NeverLetsTheCollectionReadAllSettled()
    {
        // Asserting at every step boundary — the only instant the frontier can go empty — and naming the
        // workflow holding it open.
        var collection = new CollectionModel();
        MailboxRelay relay = CreateRelay(collection);
        WorkflowEngineService reader = CreateReader(collection);
        Instance instance = CreateInstance();

        Guid main = collection.Seed("Process next: Task_1 -> Task_2", PersistentItemStatus.Processing);
        Guid receiver = collection.Seed("Mailbox receive: Task_1 -> Task_2", PersistentItemStatus.Held);
        collection.Settle(main);
        await AssertFrontierHeldOpenBy(reader, instance, receiver, "Main settled after enqueueing receiver 1");

        for (long hop = 0; hop < 3; hop++)
        {
            // The relay's enqueue happens inside the callback — the receiver is still unsettled.
            int headsBefore = collection.EnqueuedByTheRelay.Count;
            await relay.Continue(
                new MailboxContinuation.AwaitNextMessage(_mailboxId, ServiceTaskType, hop),
                CreateRequest(receiver, Guid.NewGuid()),
                CancellationToken.None
            );
            Assert.Equal(headsBefore + 1, collection.EnqueuedByTheRelay.Count);
            Guid successor = collection.EnqueuedByTheRelay[^1];

            // Only now does the engine settle the step that answered.
            collection.Settle(receiver);
            await AssertFrontierHeldOpenBy(reader, instance, successor, $"receiver at position {hop} settled");

            receiver = successor;
        }

        // The conclusion: the mailbox closes and the after-workflow takes over the frontier before the
        // concluding receiver settles.
        int beforeConclusion = collection.EnqueuedByTheRelay.Count;
        await relay.Continue(
            new MailboxContinuation.Conclude(_mailboxId),
            CreateRequest(receiver, Guid.NewGuid()),
            CancellationToken.None
        );
        Assert.Equal(beforeConclusion + 1, collection.EnqueuedByTheRelay.Count);
        Guid afterWorkflow = collection.EnqueuedByTheRelay[^1];

        collection.Settle(receiver);
        await AssertFrontierHeldOpenBy(reader, instance, afterWorkflow, "the concluding receiver settled");
    }

    [Fact]
    public async Task ASuccessorReceiver_HoldsTheFrontierAloneOnceTheEarlierWorkflowsArePurged()
    {
        // The half a head-only assertion cannot see: the collection is *found* by the process-next label, and
        // while Main or receiver 1 survives the answer is right for an unrelated reason — so they are purged,
        // as retention eventually does. Pinned rather than left to two settings agreeing.
        var collection = new CollectionModel();
        MailboxRelay relay = CreateRelay(collection);
        WorkflowEngineService reader = CreateReader(collection);

        Guid main = collection.Seed("Process next: Task_1 -> Task_2", PersistentItemStatus.Completed);
        Guid receiver = collection.Seed("Mailbox receive: Task_1 -> Task_2", PersistentItemStatus.Processing);

        await relay.Continue(
            new MailboxContinuation.AwaitNextMessage(_mailboxId, ServiceTaskType, 0),
            CreateRequest(receiver, Guid.NewGuid()),
            CancellationToken.None
        );
        Guid successor = collection.EnqueuedByTheRelay[^1];
        collection.Settle(receiver);

        collection.Purge(main, receiver);

        await AssertFrontierHeldOpenBy(reader, CreateInstance(), successor, "retention purged Main and receiver 1");
    }

    [Fact]
    public async Task AConcludedExchangeThatAdvancesNothing_LetsTheFrontierEmpty()
    {
        // The bound: once the task concluded and asked for nothing downstream, all-settled is correct.
        var collection = new CollectionModel();
        MailboxRelay relay = CreateRelay(collection);
        WorkflowEngineService reader = CreateReader(collection);

        Guid main = collection.Seed("Process next: Task_1 -> Task_2", PersistentItemStatus.Completed);
        Guid receiver = collection.Seed("Mailbox receive: Task_1 -> Task_2", PersistentItemStatus.Processing);
        Assert.NotEqual(Guid.Empty, main);

        await relay.Continue(
            new MailboxContinuation.Conclude(_mailboxId),
            CreateRequest(receiver, Guid.NewGuid()) with
            {
                AutoAdvanceProcess = false,
            },
            CancellationToken.None
        );
        collection.Settle(receiver);

        CurrentTaskWorkflowState state = await reader.GetCurrentTaskWorkflowState(
            CreateInstance(),
            CancellationToken.None
        );
        Assert.IsType<CurrentTaskWorkflowState.Unblocked>(state);
    }

    private static async Task AssertFrontierHeldOpenBy(
        WorkflowEngineService reader,
        Instance instance,
        Guid expected,
        string boundary
    )
    {
        CurrentTaskWorkflowState state = await reader.GetCurrentTaskWorkflowState(instance, CancellationToken.None);

        CurrentTaskWorkflowState.Retrying? active = state as CurrentTaskWorkflowState.Retrying;
        Assert.True(
            active is not null,
            $"The collection read all-settled at the boundary '{boundary}', so the next process action would have "
                + $"started while the exchange was still open. Got {state.GetType().Name}."
        );
        Assert.Equal(expected, active.WorkflowId);
    }
}
