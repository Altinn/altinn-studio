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
/// The design gives up v2's structural gate and replaces it with a convention: every workflow the exchange
/// needs is enqueued from inside a step of a workflow that is still unsettled, and lands as a collection head.
/// The failure mode of getting it wrong is silent early execution of downstream work, which is why the walk
/// asserts at every boundary rather than at the end. The reader is the app-lib's own —
/// <see cref="WorkflowEngineService.GetCurrentTaskWorkflowState"/>, whose <c>Unblocked</c> answer <em>is</em>
/// "the collection reads all-settled, go ahead" — and the walk asserts both that the answer is not
/// <c>Unblocked</c> and <em>which</em> workflow is holding it open.
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
    /// The engine, reduced to the two things the frontier depends on: which workflows are heads of the instance's
    /// collection, and what status each of them is in.
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

        /// <summary>
        /// The labels the factory puts on every workflow of this transition — what Main and the first
        /// receiver carry.
        /// </summary>
        private static Dictionary<string, string> TransitionLabels =>
            new(StringComparer.Ordinal)
            {
                [ProcessNextRequestFactory.ProcessNextInstanceGuidLabel] = _instanceGuid.ToString("N"),
                [ProcessNextRequestFactory.ProcessNextSourceIdLabel] = "Task_1:2",
                [ProcessNextRequestFactory.ProcessNextTargetIdLabel] = $"{TaskId}:3",
                [ProcessNextRequestFactory.ProcessNextTargetTaskLabel] = TaskId,
            };

        /// <summary>Adds a workflow the way an enqueue outside this relay would have.</summary>
        public Guid Seed(string name, PersistentItemStatus status, bool isHead = true)
        {
            var id = Guid.NewGuid();
            _workflows.Add(new Row(id, status, isHead, name, TransitionLabels));
            return id;
        }

        /// <summary>
        /// Retention purging the transition's earlier workflows. The instance's collection outlives them, so whatever
        /// is still open must be findable on its own.
        /// </summary>
        public void Purge(params Guid[] ids) => _workflows.RemoveAll(w => Array.IndexOf(ids, w.Id) >= 0);

        /// <summary>The engine settling a workflow whose last step has answered.</summary>
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

                // The engine's own rule, modeled exactly: false is never a head, true always, and null falls back to
                // natural leaf detection.
                bool isHead = workflow.IsHead ?? true;

                // A workflow only joins this instance's collection if it was enqueued into it.
                bool joinsTheCollection = string.Equals(collectionKey, CollectionKey, StringComparison.Ordinal);

                // A receive workflow with no message waiting is born Held; anything else is runnable.
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

        // The engine's label filter, modeled rather than stubbed, because this is the hop that finds the
        // instance's collection *at all*: GetCurrentTaskWorkflowState answers Unblocked when it finds no
        // workflow carrying the current task's process-next id, however alive that workflow is.
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
    /// The relay, wired to the collection model. The after-workflow goes through the same
    /// <see cref="IProcessEngine"/> entry point production uses; here it is intercepted and enqueued into the model
    /// with the shape that entry point gives it.
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
        // Three messages, then a conclusion that advances the process. The assertion runs at every step boundary —
        // the only instant at which the frontier can go empty — and names the workflow holding it open.
        var collection = new CollectionModel();
        MailboxRelay relay = CreateRelay(collection);
        WorkflowEngineService reader = CreateReader(collection);
        Instance instance = CreateInstance();

        // Where 7b leaves off: Main has run its last step, which enqueued receiver 1 as a head, and is about to
        // settle. The exchange is open.
        Guid main = collection.Seed("Process next: Task_1 -> Task_2", PersistentItemStatus.Processing);
        Guid receiver = collection.Seed("Mailbox receive: Task_1 -> Task_2", PersistentItemStatus.Held);
        collection.Settle(main);
        await AssertFrontierHeldOpenBy(reader, instance, receiver, "Main settled after enqueueing receiver 1");

        for (long hop = 0; hop < 3; hop++)
        {
            // The message arrives, the receiver runs, and its handler asks for another. The relay's enqueue happens
            // inside that callback — the receiver is still unsettled.
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

        // The last message concludes the exchange: the mailbox closes and the after-workflow takes over the
        // frontier before the concluding receiver settles.
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
        // The frontier's other half, and the one a head-only assertion cannot see: GetCurrentTaskWorkflowState has
        // to *find* the instance's collection before it can read any heads, and it finds it by listing workflows
        // labeled with the current task's process-next id. For as long as Main or receiver 1 survives the answer
        // is right for an unrelated reason, so they are purged as retention eventually does. Shipped defaults
        // keep this out of reach, which is why it is pinned rather than left to two settings agreeing.
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
        // The other side of the invariant, so the walk above cannot be read as "the frontier is never empty,
        // ever": once the task has concluded and asked for nothing downstream, all-settled is correct.
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
