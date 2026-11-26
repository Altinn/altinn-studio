using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.App.Tests.Common.Auth;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

/// <summary>
/// The workflow engine service's side of an action pipeline: the workflows it enqueues, the waits that return on a
/// held receiver or on the handling of one's own message, and the status read.
/// </summary>
public class WorkflowEngineServiceActionPipelineTests
{
    private const string Org = "ttd";
    private const string App = "test-app";
    private const string Namespace = $"{Org}/{App}";

    private static readonly Guid _instanceGuid = new("2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde");
    private static readonly Guid _mailboxId = new("018f4e00-0000-7000-8000-0000000000aa");
    private static readonly string _collectionKey = _instanceGuid.ToString();
    private static readonly DateTimeOffset _now = new(2026, 11, 25, 12, 0, 0, TimeSpan.Zero);

    private static readonly Dictionary<string, string> _actionPipelineLabels = new(StringComparer.Ordinal)
    {
        [ProcessNextRequestFactory.ProcessNextTargetTaskLabel] = "Task_Attempt",
        [ProcessNextRequestFactory.ActionPipelineLabel] = TestActionPipelineTask.Action,
    };

    private readonly Mock<IWorkflowEngineClient> _client = new(MockBehavior.Strict);
    private readonly Mock<IInstanceClientWithStorageMetadata> _instanceClient = new(MockBehavior.Strict);
    private readonly List<(string Key, WorkflowEnqueueRequest Request)> _enqueued = [];

    public WorkflowEngineServiceActionPipelineTests()
    {
        _client
            .Setup(c =>
                c.EnqueueWorkflows(
                    Namespace,
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<string, string, string?, WorkflowEnqueueRequest, CancellationToken>(
                (_, key, _, request, _) => _enqueued.Add((key, request))
            )
            .ReturnsAsync(
                new WorkflowEnqueueResponse.Accepted
                {
                    Workflows = [new WorkflowResult { DatabaseId = Guid.NewGuid(), Namespace = Namespace }],
                }
            );
        _instanceClient
            .Setup(c =>
                c.GetInstanceWithStorageMetadata(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (Instance instance, StorageAuthenticationMethod? _, CancellationToken _) =>
                    new InstanceWithStorageMetadata(instance, new StorageVersionMetadata(13, 9))
            );
    }

    private WorkflowEngineService CreateService()
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        services.AddSingleton<IProcessTask>(
            new TestActionPipelineTask(pipeline =>
                pipeline
                    .Stage(
                        (_, _) => Task.FromResult(ServiceTaskOpeningStageResult.Completed()),
                        new MailboxOptions { Timeout = TimeSpan.FromDays(1) },
                        out MailboxHandle attempt
                    )
                    .ConcludeOnReplies(
                        attempt,
                        onMessage: (_, _) => Task.FromResult<ServiceTaskExchangeResult>(ServiceTaskResult.Success()),
                        onClosed: (_, _) => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success())
                    )
            )
        );
        var authentication = new Mock<IAuthenticationContext>(MockBehavior.Strict);
        authentication.SetupGet(context => context.Current).Returns(TestAuthentication.GetUserAuthentication());
        var factory = new ProcessNextRequestFactory(
            services.BuildServiceProvider().GetRequiredService<AppImplementationFactory>(),
            authentication.Object,
            new AppIdentifier(Org, App),
            Options.Create(new AppSettings()),
            Mock.Of<IWorkflowCallbackTokenGenerator>(),
            new ProcessStepOptionsResolver([]),
            Mock.Of<IAppMetadata>(metadata => metadata.ApplicationMetadata == new ApplicationMetadata(Namespace))
        );
        return new WorkflowEngineService(
            factory,
            _client.Object,
            _instanceClient.Object,
            new AppIdentifier(Org, App),
            new TimeSkippingTimeProvider()
        )
        {
            WorkflowPollingTimeoutMs = 5_000,
        };
    }

    private static Instance CreateInstance() =>
        new()
        {
            Id = $"1337/{_instanceGuid}",
            AppId = Namespace,
            Org = Org,
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState
            {
                CurrentTask = new ProcessElementInfo
                {
                    ElementId = "Task_Attempt",
                    AltinnTaskType = TestActionPipelineTask.TaskType,
                    Flow = 2,
                },
            },
            Data = [],
        };

    private static WorkflowStatusResponse Workflow(
        Guid id,
        PersistentItemStatus status,
        int secondsAfterAnchor,
        Dictionary<string, string>? labels = null,
        string step = "step",
        string? idempotencyKey = null
    ) =>
        new()
        {
            DatabaseId = id,
            OperationId = "op",
            IdempotencyKey = idempotencyKey ?? id.ToString(),
            Namespace = Namespace,
            CollectionKey = _collectionKey,
            CreatedAt = _now.AddSeconds(secondsAfterAnchor),
            OverallStatus = status,
            Role = WorkflowRole.Primary,
            Labels = labels,
            Steps =
            [
                new StepStatusResponse
                {
                    OperationId = step,
                    ProcessingOrder = 0,
                    Command = new StepStatusResponse.CommandDetails { Type = "app" },
                    Status = status is PersistentItemStatus.Completed ? status : PersistentItemStatus.Enqueued,
                    RetryCount = 0,
                },
            ],
        };

    private void SetupCollection(params WorkflowStatusResponse[] workflows)
    {
        _client
            .Setup(c => c.GetCollection(Namespace, _collectionKey, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new WorkflowCollectionDetailResponse
                {
                    Key = _collectionKey,
                    Namespace = Namespace,
                    Heads =
                    [
                        .. workflows
                            .Where(workflow => workflow == workflows[^1])
                            .Select(workflow => new CollectionHeadStatus
                            {
                                DatabaseId = workflow.DatabaseId,
                                Status = workflow.OverallStatus,
                                Labels = workflow.Labels,
                            }),
                    ],
                    CreatedAt = _now,
                }
            );
        _client
            .Setup(c =>
                c.ListWorkflows(
                    Namespace,
                    _collectionKey,
                    It.IsAny<Dictionary<string, string>?>(),
                    It.IsAny<IReadOnlyList<PersistentItemStatus>?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(workflows);
    }

    private void SetupMailbox(params (MailboxStatus Status, long NextSeq)[] reads)
    {
        var queue = new Queue<(MailboxStatus Status, long NextSeq)>(reads);
        _client
            .Setup(c => c.GetMailbox(Namespace, _mailboxId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(() =>
            {
                (MailboxStatus status, long nextSeq) = queue.Count > 1 ? queue.Dequeue() : queue.Peek();
                return new MailboxResponse
                {
                    Id = _mailboxId,
                    Namespace = Namespace,
                    IdempotencyKey = "mint",
                    Timeout = TimeSpan.FromDays(1),
                    Deadline = _now.AddDays(1),
                    Status = status,
                    NextIdx = 5,
                    NextSeq = nextSeq,
                    CreatedAt = _now,
                };
            });
    }

    private void SetupAcquire(Guid acquireId) =>
        _client
            .Setup(c =>
                c.EnqueueWorkflows(
                    Namespace,
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<string, string, string?, WorkflowEnqueueRequest, CancellationToken>(
                (_, key, _, request, _) => _enqueued.Add((key, request))
            )
            .ReturnsAsync(
                new WorkflowEnqueueResponse.Accepted
                {
                    Workflows = [new WorkflowResult { DatabaseId = acquireId, Namespace = Namespace }],
                }
            );

    private Task<ProcessNextWorkflowResult> StartPipeline(StorageVersionMetadata? versions = null) =>
        CreateService()
            .EnqueueAndWaitForActionPipeline(
                CreateInstance(),
                versions ?? new StorageVersionMetadata(12, 8),
                "state",
                TestActionPipelineTask.Pipeline,
                new Actor { UserId = 1337 }
            )
            .WaitAsync(TimeSpan.FromSeconds(10));

    private Task<ProcessNextWorkflowResult> WaitForMessage(Guid receiverId, long position) =>
        CreateService()
            .WaitForActionPipelineMessage(CreateInstance(), receiverId, _mailboxId, position)
            .WaitAsync(TimeSpan.FromSeconds(10));

    [Fact]
    public async Task EnqueueDependentActionPipeline_EnqueuesThePipelinesFirstSegmentUnderTheAcquire()
    {
        Guid acquireId = Guid.NewGuid();

        await CreateService()
            .EnqueueDependentActionPipeline(
                CreateInstance(),
                TestActionPipelineTask.Pipeline,
                acquireId,
                _collectionKey,
                "acquired-state",
                new Actor { UserId = 1337 }
            );

        (string key, WorkflowEnqueueRequest request) = Assert.Single(_enqueued);
        Assert.Equal(WorkflowEngineService.CreateDependentWorkflowIdempotencyKey(acquireId), key);
        WorkflowRequest workflow = Assert.Single(request.Workflows);
        Assert.Equal(acquireId, Assert.Single(workflow.DependsOn!).Id);
        Assert.Equal("acquired-state", workflow.State);
        Assert.Equal(
            [$"{MintMailbox.Key}: 0", $"{ExecuteServiceTask.Key}: 0"],
            workflow.Steps.Select(s => s.OperationId)
        );
        Assert.Equal(TestActionPipelineTask.Action, request.Labels![ProcessNextRequestFactory.ActionPipelineLabel]);
        Assert.Equal("Task_Attempt", request.Labels[ProcessNextRequestFactory.ProcessNextTargetTaskLabel]);
    }

    [Fact]
    public async Task EnqueueRelease_EnqueuesOneReleaseStepThatReadsAsAnOrdinaryTransition()
    {
        Guid receiverId = Guid.NewGuid();

        await CreateService()
            .EnqueueRelease(
                CreateInstance(),
                receiverId,
                _collectionKey,
                "published-state",
                new Actor { UserId = 1337 },
                "receiver-step"
            );

        (string key, WorkflowEnqueueRequest request) = Assert.Single(_enqueued);
        Assert.Equal("receiver-step", key);
        WorkflowRequest workflow = Assert.Single(request.Workflows);
        Assert.Equal(receiverId, Assert.Single(workflow.DependsOn!).Id);
        Assert.Equal(ReleaseProcessingStatus.Key, Assert.Single(workflow.Steps).OperationId);
        Assert.False(request.Labels!.ContainsKey(ProcessNextRequestFactory.ActionPipelineLabel));
        Assert.Equal("Task_Attempt", request.Labels[ProcessNextRequestFactory.ProcessNextTargetTaskLabel]);
    }

    [Fact]
    public async Task EnqueueAndWaitForActionPipeline_ChainParkedOnAHeldReceiver_ReturnsWithoutACommit()
    {
        Guid acquireId = Guid.NewGuid();
        SetupAcquire(acquireId);
        SetupCollection(
            Workflow(acquireId, PersistentItemStatus.Completed, 0, step: ProcessingStatusAcquirer.Key),
            Workflow(Guid.NewGuid(), PersistentItemStatus.Completed, 1, _actionPipelineLabels),
            Workflow(Guid.NewGuid(), PersistentItemStatus.Held, 2, _actionPipelineLabels)
        );

        ProcessNextWorkflowResult result = await StartPipeline();

        Assert.Null(result.WorkflowFailure);
        Assert.True(result.Parked);
        Assert.False(result.ProcessStateCommitted);
    }

    [Fact]
    public async Task EnqueueAndWaitForActionPipeline_ChainParkedOutsideThePipelineBeforeACommit_KeepsWaiting()
    {
        Guid acquireId = Guid.NewGuid();
        SetupAcquire(acquireId);
        SetupCollection(
            Workflow(acquireId, PersistentItemStatus.Completed, 0, step: ProcessingStatusAcquirer.Key),
            Workflow(Guid.NewGuid(), PersistentItemStatus.Completed, 1, _actionPipelineLabels),
            // The after-workflow, deferring in the end of the task it leaves.
            Workflow(
                Guid.NewGuid(),
                PersistentItemStatus.Waiting,
                2,
                new Dictionary<string, string> { [ProcessNextRequestFactory.ProcessNextTargetTaskLabel] = "Task_Next" }
            )
        );

        ProcessNextWorkflowResult result = await StartPipeline();

        Assert.Equal(WorkflowFailureKind.Timeout, result.WorkflowFailure?.Kind);
    }

    [Fact]
    public async Task EnqueueAndWaitForActionPipeline_ALaterAttemptParkedAfterItsOwnReleased_KeepsWaiting()
    {
        Guid acquireId = Guid.NewGuid();
        SetupAcquire(acquireId);
        SetupCollection(
            Workflow(acquireId, PersistentItemStatus.Completed, 0, step: ProcessingStatusAcquirer.Key),
            Workflow(
                Guid.NewGuid(),
                PersistentItemStatus.Completed,
                1,
                _actionPipelineLabels,
                idempotencyKey: WorkflowEngineService.CreateDependentWorkflowIdempotencyKey(acquireId)
            ),
            Workflow(Guid.NewGuid(), PersistentItemStatus.Completed, 2, step: ReleaseProcessingStatus.Key),
            // Another request's attempt, opened on the idle instance.
            Workflow(Guid.NewGuid(), PersistentItemStatus.Completed, 3, step: ProcessingStatusAcquirer.Key),
            Workflow(Guid.NewGuid(), PersistentItemStatus.Held, 4, _actionPipelineLabels)
        );

        ProcessNextWorkflowResult result = await StartPipeline();

        Assert.Equal(WorkflowFailureKind.Timeout, result.WorkflowFailure?.Kind);
    }

    public static TheoryData<string, bool, bool> ChainsAfterTheAcquire =>
        new()
        {
            // What follows the acquire, whether it ends parked, and whether the acquire started the pipeline.
            { "thePipeline", false, true },
            { "thePipeline", true, true },
            { "nothing", false, false },
            { "anotherChain", false, false },
            { "anotherChain", true, false },
        };

    [Theory]
    [MemberData(nameof(ChainsAfterTheAcquire))]
    public async Task EnqueueAndWaitForActionPipeline_SaysWhetherTheAcquireStartedThePipeline(
        string after,
        bool parked,
        bool startedThePipeline
    )
    {
        PersistentItemStatus last = parked ? PersistentItemStatus.Held : PersistentItemStatus.Completed;
        Guid acquireId = Guid.NewGuid();
        SetupAcquire(acquireId);
        WorkflowStatusResponse acquire = Workflow(acquireId, PersistentItemStatus.Completed, 0);
        string pipelineKey = WorkflowEngineService.CreateDependentWorkflowIdempotencyKey(acquireId);
        switch (after)
        {
            case "thePipeline":
                SetupCollection(
                    acquire,
                    Workflow(
                        Guid.NewGuid(),
                        PersistentItemStatus.Completed,
                        1,
                        _actionPipelineLabels,
                        idempotencyKey: pipelineKey
                    ),
                    Workflow(Guid.NewGuid(), last, 2, _actionPipelineLabels)
                );
                break;
            case "anotherChain":
                // An acquire from another version, created after this one, and the pipeline it started.
                Guid otherAcquireId = Guid.NewGuid();
                SetupCollection(
                    acquire,
                    Workflow(otherAcquireId, PersistentItemStatus.Completed, 1, step: ProcessingStatusAcquirer.Key),
                    Workflow(
                        Guid.NewGuid(),
                        last,
                        2,
                        _actionPipelineLabels,
                        idempotencyKey: WorkflowEngineService.CreateDependentWorkflowIdempotencyKey(otherAcquireId)
                    )
                );
                break;
            default:
                SetupCollection(acquire);
                break;
        }
        var versions = new StorageVersionMetadata(12, 8);

        ProcessNextWorkflowResult result = await StartPipeline(versions);

        Assert.Null(result.WorkflowFailure);
        Assert.Equal(startedThePipeline, result.AnchorHasDependent);
        (string key, WorkflowEnqueueRequest request) = Assert.Single(_enqueued);
        Assert.Equal(WorkflowEngineService.CreateProcessNextIdempotencyKey(CreateInstance(), versions), key);
        Assert.Equal(
            new AcquireForActionPipelinePayload(TestActionPipelineTask.TaskType, TestActionPipelineTask.Action),
            CommandPayloadSerializer.Deserialize<CommandRequestPayload>(
                Assert
                    .Single(Assert.Single(request.Workflows).Steps)
                    .Command.Data!.Value.Deserialize<AppCommandData>()!
                    .Payload
            )
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task FindActiveWorkflow_IsTheActiveHead(bool active)
    {
        Guid headId = Guid.NewGuid();
        SetupCollection(
            Workflow(
                headId,
                active ? PersistentItemStatus.Held : PersistentItemStatus.Completed,
                0,
                _actionPipelineLabels
            )
        );

        Guid? found = await CreateService().FindActiveWorkflow(CreateInstance());

        Assert.Equal(active ? headId : null, found);
    }

    [Theory]
    [InlineData("thisInstance", true)]
    [InlineData("anotherInstance", false)]
    [InlineData("none", false)]
    public async Task IsMailboxOfInstance_IsWhetherTheMailboxWasMintedInTheInstancesCollection(
        string mintedFor,
        bool expected
    )
    {
        _client
            .Setup(c => c.GetMailbox(Namespace, _mailboxId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                mintedFor == "none"
                    ? null
                    : new MailboxResponse
                    {
                        Id = _mailboxId,
                        Namespace = Namespace,
                        IdempotencyKey = "mint",
                        CollectionKey = mintedFor == "thisInstance" ? _collectionKey : Guid.NewGuid().ToString(),
                        Timeout = TimeSpan.FromDays(1),
                        Deadline = _now.AddDays(1),
                        Status = MailboxStatus.Open,
                        NextIdx = 0,
                        NextSeq = 1,
                        CreatedAt = _now,
                    }
            );

        bool result = await CreateService().IsMailboxOfInstance(new InstanceIdentifier(CreateInstance()), _mailboxId);

        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("open", true)]
    [InlineData("closed", false)]
    [InlineData("unknown", false)]
    public async Task IsMailboxOpen_IsWhetherTheEngineReportsTheMailboxOpen(string mailbox, bool expected)
    {
        _client
            .Setup(c => c.GetMailbox(Namespace, _mailboxId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                mailbox != "unknown"
                    ? new MailboxResponse
                    {
                        Id = _mailboxId,
                        Namespace = Namespace,
                        IdempotencyKey = "mint",
                        CollectionKey = _collectionKey,
                        Timeout = TimeSpan.FromDays(1),
                        Deadline = _now.AddDays(1),
                        Status = mailbox == "open" ? MailboxStatus.Open : MailboxStatus.Disposed,
                        NextIdx = 0,
                        NextSeq = 1,
                        CreatedAt = _now,
                    }
                    : null
            );

        bool result = await CreateService().IsMailboxOpen(_mailboxId);

        Assert.Equal(expected, result);
    }

    [Fact]
    public async Task WaitForActionPipelineMessage_ReturnsOnceTheReceiverAfterItsMessageExists()
    {
        Guid receiverId = Guid.NewGuid();
        SetupCollection(Workflow(receiverId, PersistentItemStatus.Held, 0, _actionPipelineLabels));
        SetupMailbox((MailboxStatus.Open, 1), (MailboxStatus.Open, 1), (MailboxStatus.Open, 2));

        ProcessNextWorkflowResult result = await WaitForMessage(receiverId, position: 0);

        Assert.Null(result.WorkflowFailure);
        Assert.True(result.Parked);
        _client.Verify(c => c.GetMailbox(Namespace, _mailboxId, It.IsAny<CancellationToken>()), Times.Exactly(3));
    }

    [Fact]
    public async Task WaitForActionPipelineMessage_ChainParkedOnAnEarlierMessage_KeepsWaitingForItsOwn()
    {
        Guid receiverId = Guid.NewGuid();
        SetupCollection(Workflow(receiverId, PersistentItemStatus.Waiting, 0, _actionPipelineLabels));
        SetupMailbox((MailboxStatus.Open, 1));

        ProcessNextWorkflowResult result = await WaitForMessage(receiverId, position: 1);

        Assert.Equal(WorkflowFailureKind.Timeout, result.WorkflowFailure?.Kind);
    }

    [Fact]
    public async Task WaitForActionPipelineMessage_ClosedMailbox_ReturnsOnceTheChainIsParkedPastThePipeline()
    {
        Guid receiverId = Guid.NewGuid();
        SetupCollection(
            Workflow(receiverId, PersistentItemStatus.Completed, 0, _actionPipelineLabels),
            Workflow(Guid.NewGuid(), PersistentItemStatus.Completed, 1, step: CommitProcessState.Key),
            // The next task's service task, deferring.
            Workflow(Guid.NewGuid(), PersistentItemStatus.Waiting, 2)
        );
        SetupMailbox((MailboxStatus.Disposed, 1));

        ProcessNextWorkflowResult result = await WaitForMessage(receiverId, position: 0);

        Assert.Null(result.WorkflowFailure);
        Assert.True(result.Parked);
    }

    [Fact]
    public async Task WaitForActionPipelineMessage_ClosedMailboxWithItsReceiversParked_KeepsWaiting()
    {
        // A receiver of an earlier message defers while the deadline closes the mailbox; the engine still hands
        // this message to the receiver after it.
        Guid receiverId = Guid.NewGuid();
        SetupCollection(Workflow(receiverId, PersistentItemStatus.Waiting, 0, _actionPipelineLabels));
        SetupMailbox((MailboxStatus.Disposed, 1));

        ProcessNextWorkflowResult result = await WaitForMessage(receiverId, position: 1);

        Assert.Equal(WorkflowFailureKind.Timeout, result.WorkflowFailure?.Kind);
    }

    [Fact]
    public async Task WaitForActionPipelineMessage_ClosedMailbox_OwnMessageHandled_ReturnsWhileALaterReceiverDefers()
    {
        // Receiver 1 exists, so message 0 was handled; receiver 1 then defers and the deadline closes the mailbox.
        Guid receiverId = Guid.NewGuid();
        SetupCollection(
            Workflow(receiverId, PersistentItemStatus.Completed, 0, _actionPipelineLabels),
            Workflow(Guid.NewGuid(), PersistentItemStatus.Waiting, 1, _actionPipelineLabels)
        );
        SetupMailbox((MailboxStatus.Disposed, 2));

        ProcessNextWorkflowResult result = await WaitForMessage(receiverId, position: 0);

        Assert.Null(result.WorkflowFailure);
        Assert.True(result.Parked);
    }

    [Fact]
    public async Task WaitForActionPipelineMessage_ClosedMailbox_ReturnsWhileOnlyALaterAttemptsReceiverIsParked()
    {
        // This attempt released; another request's attempt then opened on the idle instance.
        Guid receiverId = Guid.NewGuid();
        SetupCollection(
            Workflow(receiverId, PersistentItemStatus.Completed, 0, _actionPipelineLabels),
            Workflow(Guid.NewGuid(), PersistentItemStatus.Completed, 1, step: ReleaseProcessingStatus.Key),
            Workflow(Guid.NewGuid(), PersistentItemStatus.Completed, 2, step: ProcessingStatusAcquirer.Key),
            Workflow(Guid.NewGuid(), PersistentItemStatus.Completed, 3, _actionPipelineLabels),
            Workflow(Guid.NewGuid(), PersistentItemStatus.Held, 4, _actionPipelineLabels)
        );
        SetupMailbox((MailboxStatus.Disposed, 1));

        ProcessNextWorkflowResult result = await WaitForMessage(receiverId, position: 1);

        Assert.Null(result.WorkflowFailure);
        Assert.True(result.Parked);
    }

    [Fact]
    public async Task WaitForActionPipelineMessage_MailboxTheEngineNoLongerKnows_EndsTheWait()
    {
        Guid receiverId = Guid.NewGuid();
        SetupCollection(Workflow(receiverId, PersistentItemStatus.Waiting, 0, _actionPipelineLabels));
        _client
            .Setup(c => c.GetMailbox(Namespace, _mailboxId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((MailboxResponse?)null);

        ProcessNextWorkflowResult result = await WaitForMessage(receiverId, position: 1);

        Assert.Null(result.WorkflowFailure);
        Assert.True(result.Parked);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ResolveWorkflowTaskStatus_ActiveHead_AwaitsMessagesOnlyWhenItRunsAnActionPipeline(
        bool actionPipeline
    )
    {
        SetupCollection(
            Workflow(
                Guid.NewGuid(),
                PersistentItemStatus.Processing,
                0,
                actionPipeline
                    ? _actionPipelineLabels
                    : new Dictionary<string, string>
                    {
                        [ProcessNextRequestFactory.ProcessNextTargetTaskLabel] = "Task_Attempt",
                    }
            )
        );

        WorkflowTaskStatus status = await CreateService().ResolveWorkflowTaskStatus(CreateInstance());

        Assert.Equal(WorkflowActivityStatus.Processing, status.Status);
        Assert.Equal(actionPipeline, status.AwaitingMessages);
        Assert.Equal(actionPipeline ? true : null, status.ToAppProcessWorkflowStatus().AwaitingMessages);
    }

    /// <summary>Jumps to each timer's due time as it is created, so the polling wait runs without real delays.</summary>
    private sealed class TimeSkippingTimeProvider : FakeTimeProvider
    {
        public override ITimer CreateTimer(TimerCallback callback, object? state, TimeSpan dueTime, TimeSpan period)
        {
            ITimer timer = base.CreateTimer(callback, state, dueTime, period);
            if (dueTime != Timeout.InfiniteTimeSpan)
            {
                Advance(dueTime);
            }
            return timer;
        }
    }
}
