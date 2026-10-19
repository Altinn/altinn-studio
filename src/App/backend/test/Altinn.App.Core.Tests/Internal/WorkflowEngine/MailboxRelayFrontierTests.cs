using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;
using Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

/// <summary>The frontier-never-empty invariant, walked across a multi-hop relay.</summary>
/// <remarks>
/// Every workflow the exchange needs is enqueued from inside a still-unsettled workflow's step, as a head —
/// getting it wrong is silent early execution of downstream work, so the walk asserts at every boundary.
/// The reader is the app-lib's own <see cref="WorkflowEngineService.ResolveWorkflowTaskStatus"/>, and the
/// walk asserts both that the answer is processing and <em>which</em> workflow holds it open.
/// </remarks>
public class MailboxRelayFrontierTests
{
    private const string Org = "ttd";
    private const string App = "test-app";
    private const string Namespace = "ttd/test-app";
    private const string ServiceTaskType = "archiving";

    /// <summary>The item index of the stage that opens the exchange.</summary>
    private const int OpeningStageIndex = 0;
    private const string TaskId = "Task_2";

    private static readonly Guid _instanceGuid = new("2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde");
    private static readonly Guid _mailboxId = new("018f4e00-0000-7000-8000-0000000000aa");

    /// <summary>
    /// The engine, reduced to what the frontier depends on: which workflows are heads, and their statuses.
    /// </summary>
    private sealed class CollectionModel : IWorkflowEngineClient
    {
        private readonly List<Row> _workflows = [];

        private sealed record Row(Guid Id, PersistentItemStatus Status, bool IsHead, string Name);

        public string CollectionKey { get; } = _instanceGuid.ToString();

        public Guid Seed(string name, PersistentItemStatus status, bool isHead = true)
        {
            var id = Guid.NewGuid();
            _workflows.Add(new Row(id, status, isHead, name));
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

        /// <summary>The heads a process action would have to wait for.</summary>
        public IEnumerable<Guid> ActiveHeads =>
            _workflows
                .Where(w =>
                    w.IsHead
                    && w.Status
                        is PersistentItemStatus.Enqueued
                            or PersistentItemStatus.Processing
                            or PersistentItemStatus.Requeued
                            or PersistentItemStatus.Waiting
                            or PersistentItemStatus.Held
                )
                .Select(w => w.Id);

        private readonly List<Guid> _enqueuedByTheRelay = [];

        public Task<WorkflowEnqueueResponse.Accepted> EnqueueWorkflows(
            string ns,
            string idempotencyKey,
            string? collectionKey,
            WorkflowEnqueueRequest request,
            CancellationToken cancellationToken = default
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
                    _workflows.Add(new Row(id, status, isHead, workflow.OperationId));
                    _enqueuedByTheRelay.Add(id);
                }

                accepted.Add(new WorkflowResult { DatabaseId = id, Namespace = ns });
            }

            return Task.FromResult(new WorkflowEnqueueResponse.Accepted { Workflows = accepted });
        }

        public Task<WorkflowStatusResponse?> GetWorkflow(
            string ns,
            Guid workflowId,
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();

        public Task<WorkflowCollectionDetailResponse?> GetCollection(
            string ns,
            string key,
            CancellationToken cancellationToken = default
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

        public Task<IReadOnlyList<WorkflowStatusResponse>> ListWorkflows(
            string ns,
            string? collectionKey = null,
            Dictionary<string, string>? labels = null,
            IReadOnlyList<PersistentItemStatus>? statuses = null,
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();

        public Task<MailboxResponse?> CloseMailbox(
            string ns,
            Guid mailboxId,
            CancellationToken cancellationToken = default
        ) => Task.FromResult<MailboxResponse?>(null);

        public Task<MailboxDeliveryResult> DeliverToMailbox(
            string ns,
            Guid mailboxId,
            MailboxDeliveryRequest request,
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

    private sealed class ArchivingTask : IPipelineServiceTask
    {
        public string Type => ServiceTaskType;

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(SendStage, _mailboxThreeDays, out MailboxHandle archive)
                .ConcludeOnReplies(archive, OnMessage, OnClosed);
    }

    /// <summary>Two exchanges: the first answered mid-pipeline, so concluding it starts a continuation.</summary>
    private sealed class ArchiveThenJournalTask : IPipelineServiceTask
    {
        public string Type => ServiceTaskType;

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(SendStage, _mailboxThreeDays, out MailboxHandle archive)
                .HandleReplies(
                    archive,
                    (_, _) => Task.FromResult<ServiceTaskStageExchangeResult>(ServiceTaskStageResult.Completed()),
                    (_, _) => Task.FromResult(ServiceTaskStageResult.Completed())
                )
                .Stage(PlainStage)
                .Stage(SendStage, _mailboxThreeDays, out MailboxHandle journal)
                .ConcludeOnReplies(journal, OnMessage, OnClosed);
    }

    /// <summary>
    /// Both sends up front, so the first send's own step ends Main and the second rides a continuation — the
    /// hop where a workflow hands over to the next segment with no exchange in between.
    /// </summary>
    private sealed class UpFrontSendsTask : IPipelineServiceTask
    {
        public string Type => ServiceTaskType;

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(SendStage, _mailboxThreeDays, out MailboxHandle alpha)
                .Stage(SendStage, _mailboxThreeDays, out MailboxHandle beta)
                .HandleReplies(
                    alpha,
                    (_, _) => Task.FromResult<ServiceTaskStageExchangeResult>(ServiceTaskStageResult.Completed()),
                    (_, _) => Task.FromResult(ServiceTaskStageResult.Completed())
                )
                .ConcludeOnReplies(beta, OnMessage, OnClosed);
    }

    /// <summary>
    /// The hand-over a deciding hop would have made: the segment planned after that item. Both call sites
    /// pass an item the plan after which is an ordinary continuation, so no target rides along.
    /// </summary>
    private static MailboxHandover Handover(ServiceTaskPipeline pipeline, int afterItemIndex) =>
        new(afterItemIndex, WorkflowCommandSet.PlanSegment(ServiceTaskType, pipeline, afterItemIndex), target: null);

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
    private static MailboxRelay CreateRelay(CollectionModel collection, IPipelineServiceTask? serviceTask = null)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        services.AddSingleton(serviceTask ?? new ArchivingTask());
        ServiceProvider sp = services.BuildServiceProvider();

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
            .Returns<
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
                (_, _, _, collectionKey, _, _, _, idempotencyKey, cancellationToken) =>
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
                        cancellationToken
                    )
            );

        return new MailboxRelay(
            collection,
            Mock.Of<IWorkflowCallbackTokenGenerator>(g =>
                g.GenerateToken(It.IsAny<Guid>(), It.IsAny<Actor>(), It.IsAny<IEnumerable<WorkflowRequest>>())
                == "callback-token"
            ),
            new ProcessStepOptionsResolver([], sp.GetRequiredService<AppImplementationFactory>()),
            processEngine.Object
        );
    }

    private static WorkflowEngineService CreateReader(CollectionModel collection) =>
        new(
            processNextRequestFactory: null!,
            collection,
            Mock.Of<IInstanceClientWithStorageMetadata>(),
            new AppIdentifier(Org, App)
        );

    private static MailboxRelayRequest CreateRequest(Guid receiverWorkflowId, Guid stepId) =>
        new()
        {
            AppId = new AppIdentifier(Org, App),
            InstanceId = new InstanceIdentifier(1337, _instanceGuid),
            Payload = new AppCallbackPayload
            {
                CommandKey = ExecuteServiceTask.Key,
                Actor = new Actor { UserId = 1337 },
                ExecutionReferenceTime = new DateTimeOffset(2026, 8, 19, 10, 0, 0, TimeSpan.Zero),
                WorkflowId = receiverWorkflowId,
                StepId = stepId,
                State = "incoming-state",
            },
            DataAccessor = new InstanceDataAccessorFake(
                CreateInstance(),
                applicationMetadata: null,
                translationService: null,
                layout: null,
                frontEndSettings: null,
                gatewayAction: null,
                language: null
            ),
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
        await AssertFrontierHeldOpenBy(
            reader,
            collection,
            instance,
            receiver,
            "Main settled after enqueueing receiver 1"
        );

        for (long hop = 0; hop < 3; hop++)
        {
            // The relay's enqueue happens inside the callback — the receiver is still unsettled.
            int headsBefore = collection.EnqueuedByTheRelay.Count;
            await relay.Continue(
                new MailboxContinuation.AwaitNextMessage(_mailboxId, ServiceTaskType, OpeningStageIndex, hop),
                CreateRequest(receiver, Guid.NewGuid()),
                CancellationToken.None
            );
            Assert.Equal(headsBefore + 1, collection.EnqueuedByTheRelay.Count);
            Guid successor = collection.EnqueuedByTheRelay[^1];

            // Only now does the engine settle the step that answered.
            collection.Settle(receiver);
            await AssertFrontierHeldOpenBy(
                reader,
                collection,
                instance,
                successor,
                $"receiver at position {hop} settled"
            );

            receiver = successor;
        }

        // The conclusion: the mailbox closes and the after-workflow takes over the frontier before the
        // concluding receiver settles.
        int beforeConclusion = collection.EnqueuedByTheRelay.Count;
        await relay.Continue(
            new MailboxContinuation.Conclude([_mailboxId]),
            CreateRequest(receiver, Guid.NewGuid()),
            CancellationToken.None
        );
        Assert.Equal(beforeConclusion + 1, collection.EnqueuedByTheRelay.Count);
        Guid afterWorkflow = collection.EnqueuedByTheRelay[^1];

        collection.Settle(receiver);
        await AssertFrontierHeldOpenBy(reader, collection, instance, afterWorkflow, "the concluding receiver settled");
    }

    /// <summary>
    /// The same invariant across the new hop: a continuation is enqueued from inside the receiver that
    /// concluded the exchange before it, so the collection never reads all-settled at the hand-over — and it
    /// still holds the frontier alone once retention purges the workflows before it.
    /// </summary>
    [Fact]
    public async Task AContinuation_HoldsTheFrontierFromInsideTheReceiverThatConcludedTheExchange()
    {
        var collection = new CollectionModel();
        MailboxRelay relay = CreateRelay(collection, new ArchiveThenJournalTask());
        WorkflowEngineService reader = CreateReader(collection);

        Guid main = collection.Seed("Process next: Task_1 -> Task_2", PersistentItemStatus.Completed);
        Guid receiver = collection.Seed("Mailbox receive: Task_1 -> Task_2", PersistentItemStatus.Processing);

        int headsBefore = collection.EnqueuedByTheRelay.Count;
        await relay.Continue(
            new MailboxContinuation.ConcludeAndContinue(
                _mailboxId,
                ServiceTaskType,
                // ArchiveThenJournalTask answers exchange A with the handler at item index 1, and the hop
                // that concludes it carries the segment it planned.
                Handover(new ArchiveThenJournalTask().ResolvePipeline(), afterItemIndex: 1)
            ),
            CreateRequest(receiver, Guid.NewGuid()),
            CancellationToken.None
        );
        Assert.Equal(headsBefore + 1, collection.EnqueuedByTheRelay.Count);
        Guid continuation = collection.EnqueuedByTheRelay[^1];

        // Only now does the engine settle the step that concluded exchange A.
        collection.Settle(receiver);
        await AssertFrontierHeldOpenBy(
            reader,
            collection,
            CreateInstance(),
            continuation,
            "the concluding receiver settled"
        );

        collection.Purge(main, receiver);
        await AssertFrontierHeldOpenBy(
            reader,
            collection,
            CreateInstance(),
            continuation,
            "retention purged Main and receiver 1"
        );
    }

    /// <summary>
    /// The invariant on the hop that has no exchange to lean on: a mailbox-opening stage ends its workflow, so
    /// the segment carrying what follows it is enqueued from inside that stage's still-unsettled step. Get the
    /// order wrong and Main settles with no head at all while a mailbox it just opened is waiting for a
    /// receiver nothing will enqueue.
    /// </summary>
    [Fact]
    public async Task AContinuationAfterAnOpeningStage_HoldsTheFrontierFromInsideTheWorkflowThatRanIt()
    {
        var collection = new CollectionModel();
        MailboxRelay relay = CreateRelay(collection, new UpFrontSendsTask());
        WorkflowEngineService reader = CreateReader(collection);

        Guid main = collection.Seed("Process next: Task_1 -> Task_2", PersistentItemStatus.Processing);

        int headsBefore = collection.EnqueuedByTheRelay.Count;
        await relay.Continue(
            new MailboxContinuation.ContinueAfterStage(
                ServiceTaskType,
                Handover(new UpFrontSendsTask().ResolvePipeline(), OpeningStageIndex)
            ),
            CreateRequest(main, Guid.NewGuid()),
            CancellationToken.None
        );
        Assert.Equal(headsBefore + 1, collection.EnqueuedByTheRelay.Count);
        Guid continuation = collection.EnqueuedByTheRelay[^1];

        // Only now does the engine settle the step that ran the send.
        collection.Settle(main);
        await AssertFrontierHeldOpenBy(
            reader,
            collection,
            CreateInstance(),
            continuation,
            "the sending step's workflow settled"
        );

        collection.Purge(main);
        await AssertFrontierHeldOpenBy(reader, collection, CreateInstance(), continuation, "retention purged Main");
    }

    private static async Task AssertFrontierHeldOpenBy(
        WorkflowEngineService reader,
        CollectionModel collection,
        Instance instance,
        Guid expected,
        string boundary
    )
    {
        WorkflowTaskStatus status = await reader.ResolveWorkflowTaskStatus(instance, CancellationToken.None);

        Assert.True(
            status.Status == WorkflowActivityStatus.Processing,
            $"The collection read all-settled at the boundary '{boundary}', so the next process action would have "
                + $"started while the exchange was still open. Got {status.Status}."
        );
        Assert.Equal(expected, Assert.Single(collection.ActiveHeads));
    }
}
