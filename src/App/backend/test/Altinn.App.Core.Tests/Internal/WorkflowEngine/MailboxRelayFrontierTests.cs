using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
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
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

/// <summary>The frontier-never-empty invariant, walked across a service task's hops.</summary>
/// <remarks>
/// Every workflow a task needs after its first is enqueued from inside a still-unsettled workflow's step, as a
/// head, so the collection never reads all-settled while a stage waits. Getting it wrong is silent early execution
/// of the next process action, so the walk asserts at every boundary. Each hop is decided by the relay's own
/// deciders, exactly as the step's result would decide it, and relayed as the callback relays it. The reader is the
/// app-lib's own <see cref="WorkflowEngineService.ResolveWorkflowTaskStatus"/>, and the walk asserts both that the
/// answer is processing and <em>which</em> workflow holds it open.
/// </remarks>
public class MailboxRelayFrontierTests
{
    private const string Org = "ttd";
    private const string App = "test-app";
    private const string Namespace = "ttd/test-app";
    private const string ServiceTaskType = "archiving";
    private const string TaskId = "Task_2";

    private static readonly Guid _instanceGuid = new("2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde");
    private static readonly Guid _archiveMailboxId = new("018f4e00-0000-7000-8000-0000000000aa");
    private static readonly Guid _journalMailboxId = new("018f4e00-0000-7000-8000-0000000000bb");
    private static readonly DateTimeOffset _deadline = new(2026, 8, 30, 12, 0, 0, TimeSpan.Zero);

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

    private static Task<ServiceTaskResult> Prepare(StageContext context) =>
        Task.FromResult(ServiceTaskResult.Completed());

    private static Task<ServiceTaskResult> Send(StageContext context, ReplyAddress address) =>
        Task.FromResult(ServiceTaskResult.Completed());

    private static Task<ServiceTaskReplyResult> OnReply(StageContext context, ServiceTaskReply reply) =>
        Task.FromResult(ServiceTaskReplyResult.Completed());

    private static Task<ServiceTaskResult> OnTimeout(StageContext context) =>
        Task.FromResult(ServiceTaskResult.Completed());

    private const int PrepareIndex = 0;
    private const int ArchiveIndex = 1;
    private const int JournalIndex = 2;

    /// <summary>
    /// A stage, then two exchanges, one external stage each: every hop a task makes between its first workflow and
    /// the next transition.
    /// </summary>
    private static readonly ServiceTaskPipeline _pipeline = new PipelineBuilder.ServiceTask()
        .Stage(Prepare)
        .ExternalStage(Send, OnReply)
        .ExternalStage(Send, OnReply, onTimeout: OnTimeout)
        .ToPipeline();

    private static ServiceTaskItem.ExternalStage External(int index) =>
        Assert.IsType<ServiceTaskItem.ExternalStage>(_pipeline.Items[index]);

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
                        idempotencyKey ?? throw new InvalidOperationException("The after-workflow carries no key."),
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
            new ProcessStepOptionsResolver([]),
            processEngine.Object
        );
    }

    /// <summary>
    /// The reader. Its request factory is consulted only when the collection reads all-settled, which is the
    /// failure this walk looks for, so it is real rather than absent and the walk fails on its assertion.
    /// </summary>
    private static WorkflowEngineService CreateReader(CollectionModel collection)
    {
        ServiceProvider services = new ServiceCollection()
            .AddSingleton<AppImplementationFactory>()
            .BuildServiceProvider();
        var factory = new ProcessNextRequestFactory(
            services.GetRequiredService<AppImplementationFactory>(),
            Mock.Of<IAuthenticationContext>(),
            new AppIdentifier(Org, App),
            Options.Create(new AppSettings()),
            Mock.Of<IWorkflowCallbackTokenGenerator>(),
            new ProcessStepOptionsResolver([]),
            Mock.Of<IAppMetadata>()
        );
        return new(factory, collection, Mock.Of<IInstanceClientWithStorageMetadata>(), new AppIdentifier(Org, App));
    }

    private static MailboxRelayRequest CreateRequest(
        Guid runningWorkflowId,
        Guid stepId,
        ProcessNextContinuation? processNext
    ) =>
        new()
        {
            AppId = new AppIdentifier(Org, App),
            InstanceId = new InstanceIdentifier(1337, _instanceGuid),
            Payload = new AppCallbackPayload
            {
                CommandKey = ExecuteServiceTask.Key,
                Actor = new Actor { UserId = 1337 },
                ExecutionReferenceTime = new DateTimeOffset(2026, 8, 19, 10, 0, 0, TimeSpan.Zero),
                WorkflowId = runningWorkflowId,
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
            AutoAdvanceAction = processNext?.Action,
        };

    private static AppCallbackMailbox Delivered(Guid mailboxId, long seq) =>
        new()
        {
            Id = mailboxId,
            Seq = seq,
            Delivery = new AppCallbackMailboxDelivery
            {
                IdempotencyKey = $"source-message-{seq}",
                Payload = "<receipt/>",
                AcceptedAt = new DateTimeOffset(2026, 8, 19, 9, 30, 0, TimeSpan.Zero),
            },
        };

    private static AppCallbackMailbox Closed(Guid mailboxId, long seq) =>
        new()
        {
            Id = mailboxId,
            Seq = seq,
            DisposedReason = MailboxDisposedReason.Deadline,
        };

    /// <summary>
    /// One hop, as the callback runs it: the decided result relayed from inside the running workflow's step, which
    /// adds exactly one workflow; then the engine settles the running workflow, and the new one alone holds the
    /// frontier.
    /// </summary>
    private static async Task<Guid> Hop(
        MailboxRelay relay,
        WorkflowEngineService reader,
        CollectionModel collection,
        WorkflowEngineCommandResult decided,
        Guid running,
        string boundary
    )
    {
        SuccessfulWorkflowEngineCommandResult success = Assert.IsType<SuccessfulWorkflowEngineCommandResult>(decided);
        Assert.NotNull(success.MailboxContinuation);

        int before = collection.EnqueuedByTheRelay.Count;
        await relay.Continue(
            success.MailboxContinuation,
            CreateRequest(running, Guid.NewGuid(), success.ProcessNextContinuation),
            CancellationToken.None
        );
        Assert.Equal(before + 1, collection.EnqueuedByTheRelay.Count);
        Guid successor = collection.EnqueuedByTheRelay[^1];

        // Only now does the engine settle the step that ran.
        collection.Settle(running);
        await AssertFrontierHeldOpenBy(reader, collection, successor, boundary);
        return successor;
    }

    [Fact]
    public async Task TwoExternalStages_NeverLetTheCollectionReadAllSettled()
    {
        var collection = new CollectionModel();
        MailboxRelay relay = CreateRelay(collection);
        WorkflowEngineService reader = CreateReader(collection);
        var carry = new WorkflowCallbackStateCarry();

        Guid primary = collection.Seed("Process next: Task_1 -> Task_2", PersistentItemStatus.Processing);

        // The stage ends the primary workflow and hands over to the archive's mint and send.
        Guid running = await Hop(
            relay,
            reader,
            collection,
            MailboxRelay.DecideStage(
                ServiceTaskResult.Completed(),
                ServiceTaskType,
                Guid.NewGuid(),
                carry,
                PrepareIndex,
                _pipeline
            ),
            primary,
            "the primary workflow settled after the stage"
        );

        // The archive's mint opens its mailbox, and its send hands over to the first receiver.
        carry.RecordMailbox(ArchiveIndex, _archiveMailboxId, _deadline);
        running = await Hop(
            relay,
            reader,
            collection,
            MailboxRelay.DecideSend(
                ServiceTaskResult.Completed(),
                ServiceTaskType,
                Guid.NewGuid(),
                carry,
                new CarriedMailbox { Id = _archiveMailboxId, Deadline = _deadline },
                External(ArchiveIndex),
                ArchiveIndex
            ),
            running,
            "the archive's send settled"
        );

        // Two replies wait for the next.
        for (long seq = 0; seq < 2; seq++)
        {
            running = await Hop(
                relay,
                reader,
                collection,
                MailboxRelay.DecideReply(
                    ServiceTaskReplyResult.AwaitNextReply(),
                    ServiceTaskType,
                    Guid.NewGuid(),
                    Delivered(_archiveMailboxId, seq),
                    carry,
                    External(ArchiveIndex),
                    ArchiveIndex,
                    _pipeline
                ),
                running,
                $"the archive's receiver at position {seq} settled"
            );
        }

        // The third is the last: the archive's mailbox closes and the journal's mint and send start.
        running = await Hop(
            relay,
            reader,
            collection,
            MailboxRelay.DecideReply(
                ServiceTaskReplyResult.Completed(),
                ServiceTaskType,
                Guid.NewGuid(),
                Delivered(_archiveMailboxId, 2),
                carry,
                External(ArchiveIndex),
                ArchiveIndex,
                _pipeline
            ),
            running,
            "the archive's last receiver settled"
        );
        Assert.Null(carry.Mailboxes);

        collection.Purge(primary);
        await AssertFrontierHeldOpenBy(reader, collection, running, "retention purged the primary workflow");

        // The journal's mint opens its own mailbox, and its send hands over to its first receiver.
        carry.RecordMailbox(JournalIndex, _journalMailboxId, _deadline);
        running = await Hop(
            relay,
            reader,
            collection,
            MailboxRelay.DecideSend(
                ServiceTaskResult.Completed(),
                ServiceTaskType,
                Guid.NewGuid(),
                carry,
                new CarriedMailbox { Id = _journalMailboxId, Deadline = _deadline },
                External(JournalIndex),
                JournalIndex
            ),
            running,
            "the journal's send settled"
        );

        // The journal's mailbox times out; its onTimeout completes the last item, so the task ends.
        await Hop(
            relay,
            reader,
            collection,
            MailboxRelay.DecideReply(
                ServiceTaskResult.Completed(),
                ServiceTaskType,
                Guid.NewGuid(),
                Closed(_journalMailboxId, 0),
                carry,
                External(JournalIndex),
                JournalIndex,
                _pipeline
            ),
            running,
            "the journal's receiver settled, ending the task"
        );
    }

    /// <summary>
    /// A send that ends the task closes its mailbox without waiting, and the after-workflow takes over the frontier
    /// from inside the send's step.
    /// </summary>
    [Fact]
    public async Task SendThatEndsTheTask_HandsTheFrontierToTheNextTransition()
    {
        var collection = new CollectionModel();
        MailboxRelay relay = CreateRelay(collection);
        WorkflowEngineService reader = CreateReader(collection);
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(ArchiveIndex, _archiveMailboxId, _deadline);

        Guid running = collection.Seed("Mailbox continue: Task_2 · after 0", PersistentItemStatus.Processing);

        await Hop(
            relay,
            reader,
            collection,
            MailboxRelay.DecideSend(
                ServiceTaskResult.EndTask("reject"),
                ServiceTaskType,
                Guid.NewGuid(),
                carry,
                new CarriedMailbox { Id = _archiveMailboxId, Deadline = _deadline },
                External(ArchiveIndex),
                ArchiveIndex
            ),
            running,
            "the send that ended the task settled"
        );
    }

    private static Task<ServiceTaskResult> Plain(StageContext context) =>
        Task.FromResult(ServiceTaskResult.Completed());

    /// <summary>
    /// The same invariant along a pipeline of stages: each stage ends its workflow and enqueues the next item's
    /// from inside its still-unsettled step, so the collection never reads all-settled between them.
    /// </summary>
    [Fact]
    public async Task Stages_EachHoldTheFrontierUntilTheNextItemsWorkflowExists()
    {
        var collection = new CollectionModel();
        MailboxRelay relay = CreateRelay(collection);
        WorkflowEngineService reader = CreateReader(collection);
        ServiceTaskPipeline pipeline = new PipelineBuilder.ServiceTask()
            .Stage(Plain)
            .Stage(Plain)
            .Stage(Plain)
            .ToPipeline();

        Guid running = collection.Seed("Process next: Task_1 -> Task_2", PersistentItemStatus.Processing);

        for (int stage = 0; stage < 2; stage++)
        {
            running = await Hop(
                relay,
                reader,
                collection,
                MailboxRelay.DecideStage(
                    ServiceTaskResult.Completed(),
                    ServiceTaskType,
                    Guid.NewGuid(),
                    new WorkflowCallbackStateCarry(),
                    stage,
                    pipeline
                ),
                running,
                $"the workflow of the stage at {stage} settled"
            );
        }
    }

    private static async Task AssertFrontierHeldOpenBy(
        WorkflowEngineService reader,
        CollectionModel collection,
        Guid expected,
        string boundary
    )
    {
        WorkflowTaskStatus status = await reader.ResolveWorkflowTaskStatus(CreateInstance(), CancellationToken.None);

        Assert.True(
            status.Status == WorkflowActivityStatus.Processing,
            $"The collection read all-settled at the boundary '{boundary}', so the next process action would have "
                + $"started while the task was still running. Got {status.Status}."
        );
        Assert.Equal(expected, Assert.Single(collection.ActiveHeads));
    }
}
