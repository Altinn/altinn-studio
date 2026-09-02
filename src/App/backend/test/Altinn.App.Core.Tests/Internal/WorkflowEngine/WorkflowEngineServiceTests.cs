using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

public class WorkflowEngineServiceTests
{
    private const string Org = "ttd";
    private const string App = "test-app";
    private const string Namespace = $"{Org}/{App}";

    [Fact]
    public async Task ResumeAndWaitForWorkflow_ResumesWithCascade()
    {
        // Arrange
        Guid workflowId = Guid.NewGuid();
        const string collectionKey = "collection-key";
        var instance = new Instance();

        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        client
            .Setup(c => c.ResumeWorkflow(Namespace, workflowId, It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResumeWorkflowResponse(workflowId, DateTimeOffset.UtcNow, []));

        // Collection head is already terminal (Completed) so the wait loop exits immediately.
        client
            .Setup(c => c.GetCollection(Namespace, collectionKey, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new WorkflowCollectionDetailResponse
                {
                    Key = collectionKey,
                    Namespace = Namespace,
                    Heads =
                    [
                        new CollectionHeadStatus
                        {
                            DatabaseId = workflowId,
                            Status = PersistentItemStatus.Completed,
                            StepsCompleted = 12,
                            StepsTotal = 12,
                        },
                    ],
                    CreatedAt = DateTimeOffset.UtcNow,
                }
            );
        client
            .Setup(c =>
                c.ListWorkflows(
                    Namespace,
                    collectionKey,
                    It.IsAny<Dictionary<string, string>?>(),
                    It.IsAny<IReadOnlyList<PersistentItemStatus>?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([
                // The anchored wait requires the resumed workflow to be visible and terminal
                // before the wait concludes.
                new WorkflowStatusResponse
                {
                    DatabaseId = workflowId,
                    OperationId = "op",
                    IdempotencyKey = workflowId.ToString(),
                    Namespace = Namespace,
                    CreatedAt = DateTimeOffset.UtcNow,
                    OverallStatus = PersistentItemStatus.Completed,
                    Steps = [],
                },
            ]);

        var instanceClient = new Mock<IInstanceClient>(MockBehavior.Strict);
        instanceClient
            .Setup(c =>
                c.GetInstance(instance, It.IsAny<StorageAuthenticationMethod?>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(instance);

        // ProcessNextRequestFactory is not exercised on the resume path, so it can be left null here.
        var service = new WorkflowEngineService(
            processNextRequestFactory: null!,
            client.Object,
            instanceClient.Object,
            new AppIdentifier(Org, App)
        );

        // Act
        ProcessNextWorkflowResult result = await service.ResumeAndWaitForWorkflow(
            instance,
            workflowId,
            collectionKey,
            CancellationToken.None
        );

        // Assert
        Assert.Null(result.WorkflowFailure);
        client.Verify(
            c => c.ResumeWorkflow(Namespace, workflowId, true, It.IsAny<CancellationToken>()),
            Times.Once,
            "the resume path must cascade so dependency-failed auto-advance children are reset alongside the parent"
        );
    }

    [Fact]
    public async Task ResumeAndWaitForWorkflow_ParkedWaitingChain_ReleasesEarlyAsCommittedSuccess()
    {
        // A chain whose only active workflow is Waiting is parked on a deferring service task and may
        // stay parked for its whole wait budget. The wait must release with the ordinary success shape
        // (deferral is post-commit, so the instance already carries the committed target task) instead
        // of holding the request into the timeout and misreporting a designed wait as a failure.
        Guid workflowId = Guid.NewGuid();
        const string collectionKey = "collection-key";
        var instance = new Instance();

        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        client
            .Setup(c => c.ResumeWorkflow(Namespace, workflowId, It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResumeWorkflowResponse(workflowId, DateTimeOffset.UtcNow, []));
        client
            .Setup(c => c.GetCollection(Namespace, collectionKey, It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateCollection(collectionKey, workflowId, PersistentItemStatus.Waiting));
        client
            .Setup(c =>
                c.ListWorkflows(
                    Namespace,
                    collectionKey,
                    It.IsAny<Dictionary<string, string>?>(),
                    It.IsAny<IReadOnlyList<PersistentItemStatus>?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([
                CreateWorkflowStatus(
                    DateTimeOffset.UtcNow,
                    status: PersistentItemStatus.Waiting,
                    databaseId: workflowId,
                    steps:
                    [
                        CreateStep(SaveProcessStateToStorage.Key, PersistentItemStatus.Completed),
                        CreateStep("ExecuteServiceTask", PersistentItemStatus.Waiting),
                    ]
                ),
            ]);

        var instanceClient = new Mock<IInstanceClient>(MockBehavior.Strict);
        instanceClient
            .Setup(c =>
                c.GetInstance(instance, It.IsAny<StorageAuthenticationMethod?>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(instance);

        var service = new WorkflowEngineService(
            processNextRequestFactory: null!,
            client.Object,
            instanceClient.Object,
            new AppIdentifier(Org, App)
        )
        {
            WorkflowParkedReleaseGraceMs = 0,
        };

        ProcessNextWorkflowResult result = await service.ResumeAndWaitForWorkflow(
            instance,
            workflowId,
            collectionKey,
            CancellationToken.None
        );

        Assert.Null(result.WorkflowFailure);
        Assert.True(result.ProcessStateChanged);
        client.Verify(
            c =>
                c.ListWorkflows(
                    Namespace,
                    collectionKey,
                    It.IsAny<Dictionary<string, string>?>(),
                    It.IsAny<IReadOnlyList<PersistentItemStatus>?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task ResumeAndWaitForWorkflow_ParkedUncommittedChain_FallsThroughToTimeout()
    {
        // Defensive guard on the parked release: deferral is post-commit by construction today, but if
        // a pre-commit step ever learns to defer, the wait must NOT release with a success carrying a
        // process state that was never persisted — it falls through to the ordinary timeout instead.
        Guid workflowId = Guid.NewGuid();
        const string collectionKey = "collection-key";
        var instance = new Instance();

        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        client
            .Setup(c => c.ResumeWorkflow(Namespace, workflowId, It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResumeWorkflowResponse(workflowId, DateTimeOffset.UtcNow, []));
        client
            .Setup(c => c.GetCollection(Namespace, collectionKey, It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateCollection(collectionKey, workflowId, PersistentItemStatus.Waiting));
        client
            .Setup(c =>
                c.ListWorkflows(
                    Namespace,
                    collectionKey,
                    It.IsAny<Dictionary<string, string>?>(),
                    It.IsAny<IReadOnlyList<PersistentItemStatus>?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([
                CreateWorkflowStatus(
                    DateTimeOffset.UtcNow,
                    status: PersistentItemStatus.Waiting,
                    databaseId: workflowId,
                    steps: [CreateStep("SomePreCommitStep", PersistentItemStatus.Waiting)]
                ),
            ]);

        var instanceClient = new Mock<IInstanceClient>(MockBehavior.Strict);
        instanceClient
            .Setup(c =>
                c.GetInstance(instance, It.IsAny<StorageAuthenticationMethod?>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(instance);

        var service = new WorkflowEngineService(
            processNextRequestFactory: null!,
            client.Object,
            instanceClient.Object,
            new AppIdentifier(Org, App)
        )
        {
            WorkflowParkedReleaseGraceMs = 0,
            WorkflowPollingTimeoutMs = 500,
        };

        ProcessNextWorkflowResult result = await service.ResumeAndWaitForWorkflow(
            instance,
            workflowId,
            collectionKey,
            CancellationToken.None
        );

        Assert.NotNull(result.WorkflowFailure);
        Assert.Equal(WorkflowFailureKind.Timeout, result.WorkflowFailure.Kind);
        Assert.False(result.ProcessStateChanged);
    }

    [Fact]
    public async Task ResumeAndWaitForWorkflow_ParkedWithinGrace_SettlesNormallyWithoutEarlyRelease()
    {
        // The grace window exists so a task deferring for a couple of seconds still completes
        // synchronously: while it is open, a parked observation must not trigger the chain fetch or
        // the early release — the wait keeps polling and takes the ordinary settled path.
        Guid workflowId = Guid.NewGuid();
        const string collectionKey = "collection-key";
        var instance = new Instance();
        int collectionCalls = 0;

        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        client
            .Setup(c => c.ResumeWorkflow(Namespace, workflowId, It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResumeWorkflowResponse(workflowId, DateTimeOffset.UtcNow, []));
        client
            .Setup(c => c.GetCollection(Namespace, collectionKey, It.IsAny<CancellationToken>()))
            .ReturnsAsync(() =>
                CreateCollection(
                    collectionKey,
                    workflowId,
                    ++collectionCalls == 1 ? PersistentItemStatus.Waiting : PersistentItemStatus.Completed
                )
            );
        client
            .Setup(c =>
                c.ListWorkflows(
                    Namespace,
                    collectionKey,
                    It.IsAny<Dictionary<string, string>?>(),
                    It.IsAny<IReadOnlyList<PersistentItemStatus>?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([
                CreateWorkflowStatus(
                    DateTimeOffset.UtcNow,
                    status: PersistentItemStatus.Completed,
                    databaseId: workflowId,
                    steps: [CreateStep(SaveProcessStateToStorage.Key, PersistentItemStatus.Completed)]
                ),
            ]);

        var instanceClient = new Mock<IInstanceClient>(MockBehavior.Strict);
        instanceClient
            .Setup(c =>
                c.GetInstance(instance, It.IsAny<StorageAuthenticationMethod?>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(instance);

        var service = new WorkflowEngineService(
            processNextRequestFactory: null!,
            client.Object,
            instanceClient.Object,
            new AppIdentifier(Org, App)
        )
        {
            WorkflowParkedReleaseGraceMs = 60_000,
        };

        ProcessNextWorkflowResult result = await service.ResumeAndWaitForWorkflow(
            instance,
            workflowId,
            collectionKey,
            CancellationToken.None
        );

        Assert.Null(result.WorkflowFailure);
        Assert.True(result.ProcessStateChanged);
        // The chain was fetched only by the settled path — never while parked inside the grace window.
        client.Verify(
            c =>
                c.ListWorkflows(
                    Namespace,
                    collectionKey,
                    It.IsAny<Dictionary<string, string>?>(),
                    It.IsAny<IReadOnlyList<PersistentItemStatus>?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public void ExtractCallbackErrorDetail_WhenMessageEmbedsProblemDetails_ReturnsTheDetail()
    {
        // The engine wraps a failed app callback as "<prose>: {ProblemDetails json}"; the embedded
        // detail is the human-readable reason and is what should surface to the end user.
        const string engineMessage =
            "AppCommand failed with client error UnprocessableEntity: "
            + "{\"title\":\"ServiceTaskFailedException\",\"status\":422,\"detail\":"
            + "\"Service task 'fail' failed: Form data requested the service task to fail.\",\"nonRetryable\":true}";

        string detail = WorkflowEngineService.ExtractCallbackErrorDetail(engineMessage);

        Assert.Equal("Service task 'fail' failed: Form data requested the service task to fail.", detail);
    }

    [Fact]
    public void ExtractCallbackErrorDetail_WhenMessageHasNoJson_ReturnsMessageUnchanged()
    {
        const string engineMessage = "AppCommand failed with client error BadRequest: <no body content>";

        Assert.Equal(engineMessage, WorkflowEngineService.ExtractCallbackErrorDetail(engineMessage));
    }

    [Fact]
    public void ExtractCallbackErrorDetail_WhenEmbeddedJsonIsMalformed_ReturnsMessageUnchanged()
    {
        const string engineMessage = "AppCommand failed with client error BadRequest: {not valid json";

        Assert.Equal(engineMessage, WorkflowEngineService.ExtractCallbackErrorDetail(engineMessage));
    }

    [Fact]
    public void ExtractCallbackErrorDetail_WhenEmbeddedJsonHasNoDetail_ReturnsMessageUnchanged()
    {
        const string engineMessage = "AppCommand failed with client error BadRequest: {\"title\":\"NoDetailHere\"}";

        Assert.Equal(engineMessage, WorkflowEngineService.ExtractCallbackErrorDetail(engineMessage));
    }

    [Fact]
    public void ExtractCallbackErrorDetail_WhenMessageIsPlainProse_ReturnsMessageUnchanged()
    {
        const string engineMessage = "Plain engine failure message";

        Assert.Equal(engineMessage, WorkflowEngineService.ExtractCallbackErrorDetail(engineMessage));
    }

    [Fact]
    public void ScopeToCurrentChain_ExcludesWorkflowsOlderThanTheAnchor()
    {
        var anchorCreatedAt = DateTimeOffset.UtcNow.AddSeconds(-2);
        var older = CreateWorkflowStatus(createdAt: DateTimeOffset.UtcNow.AddMinutes(-5));
        // A stale workflow sharing the anchor's exact timestamp must not leak into the chain -
        // timestamps are not guaranteed unique, so the anchor is matched by id and everything
        // else must be strictly newer.
        var staleSameTimestamp = CreateWorkflowStatus(createdAt: anchorCreatedAt);
        var anchor = CreateWorkflowStatus(createdAt: anchorCreatedAt);
        var dependent = CreateWorkflowStatus(createdAt: DateTimeOffset.UtcNow);
        var workflows = new[] { older, staleSameTimestamp, anchor, dependent };

        IReadOnlyList<WorkflowStatusResponse> scoped = WorkflowEngineService.ScopeToCurrentChain(
            workflows,
            anchor.DatabaseId
        );

        Assert.Equal([anchor.DatabaseId, dependent.DatabaseId], scoped.Select(w => w.DatabaseId));
    }

    [Fact]
    public void ScopeToCurrentChain_FallsBackToFullListWhenAnchorIsUnknownOrMissing()
    {
        var workflow = CreateWorkflowStatus(createdAt: DateTimeOffset.UtcNow);
        var workflows = new[] { workflow };

        Assert.Equal(
            [workflow.DatabaseId],
            WorkflowEngineService.ScopeToCurrentChain(workflows, sinceWorkflowId: null).Select(w => w.DatabaseId)
        );
        Assert.Equal(
            [workflow.DatabaseId],
            WorkflowEngineService.ScopeToCurrentChain(workflows, Guid.NewGuid()).Select(w => w.DatabaseId)
        );
    }

    [Fact]
    public void ScopeToCurrentChain_ExcludesSideEffectsWorkflowsFromTheChain()
    {
        // The fire-and-forget side-effects workflows must never extend the wait or influence
        // failure classification. The same-batch one shares the anchor's timestamp, but a
        // dependent (auto-advance) batch's side-effects workflow is strictly newer than the
        // anchor - only the IsHead=false directive excludes it.
        var anchorCreatedAt = DateTimeOffset.UtcNow.AddSeconds(-2);
        var anchor = CreateWorkflowStatus(createdAt: anchorCreatedAt);
        var sameBatchSideEffects = CreateWorkflowStatus(
            createdAt: anchorCreatedAt,
            operationId: "Process next side-effects: Task_1 -> Task_2",
            status: PersistentItemStatus.Enqueued,
            isHead: false
        );
        var dependent = CreateWorkflowStatus(createdAt: DateTimeOffset.UtcNow);
        var dependentBatchSideEffects = CreateWorkflowStatus(
            createdAt: DateTimeOffset.UtcNow,
            operationId: "Process next side-effects: Task_2 -> Task_3",
            status: PersistentItemStatus.Enqueued,
            isHead: false
        );
        var workflows = new[] { anchor, sameBatchSideEffects, dependent, dependentBatchSideEffects };

        IReadOnlyList<WorkflowStatusResponse> scoped = WorkflowEngineService.ScopeToCurrentChain(
            workflows,
            anchor.DatabaseId
        );

        Assert.Equal([anchor.DatabaseId, dependent.DatabaseId], scoped.Select(w => w.DatabaseId));
    }

    [Fact]
    public void ScopeToCurrentChain_ExcludesSideEffectsWorkflowsFromTheUnscopedFallback()
    {
        var mainWorkflow = CreateWorkflowStatus(createdAt: DateTimeOffset.UtcNow);
        var failedSideEffects = CreateWorkflowStatus(
            createdAt: DateTimeOffset.UtcNow,
            operationId: "Process next side-effects: Task_1 -> Task_2",
            status: PersistentItemStatus.Failed,
            isHead: false
        );

        IReadOnlyList<WorkflowStatusResponse> scoped = WorkflowEngineService.ScopeToCurrentChain(
            [mainWorkflow, failedSideEffects],
            sinceWorkflowId: null
        );

        Assert.Equal([mainWorkflow.DatabaseId], scoped.Select(w => w.DatabaseId));
    }

    [Fact]
    public void IsSideEffectsWorkflow_MatchesOnlyTheIsHeadFalseDirective()
    {
        // Identification is by the engine-persisted head-visibility directive, not the
        // OperationId naming convention: a side-effects OperationId without IsHead=false is not
        // matched, and IsHead=false is matched regardless of naming.
        Assert.True(
            WorkflowEngineService.IsSideEffectsWorkflow(
                CreateWorkflowStatus(
                    createdAt: DateTimeOffset.UtcNow,
                    operationId: "Process next side-effects: Task_1 -> Task_2",
                    isHead: false
                )
            )
        );
        Assert.True(
            WorkflowEngineService.IsSideEffectsWorkflow(
                CreateWorkflowStatus(createdAt: DateTimeOffset.UtcNow, operationId: "op", isHead: false)
            )
        );
        Assert.False(
            WorkflowEngineService.IsSideEffectsWorkflow(
                CreateWorkflowStatus(
                    createdAt: DateTimeOffset.UtcNow,
                    operationId: "Process next side-effects: Task_1 -> Task_2"
                )
            )
        );
        Assert.False(
            WorkflowEngineService.IsSideEffectsWorkflow(
                CreateWorkflowStatus(createdAt: DateTimeOffset.UtcNow, operationId: "op", isHead: true)
            )
        );
    }

    [Fact]
    public void BuildWorkflowFailure_ReportsFailureWhenTheNewestWorkflowIsAbandoned()
    {
        // A wait that ends on an abandoned workflow must never look like success: the abandoned
        // workflow was written off without a superseding workflow, so the action never ran.
        var olderCompleted = CreateWorkflowStatus(createdAt: DateTimeOffset.UtcNow.AddMinutes(-5));
        var abandoned = CreateWorkflowStatus(createdAt: DateTimeOffset.UtcNow, status: PersistentItemStatus.Abandoned);

        WorkflowFailure? failure = WorkflowEngineService.BuildWorkflowFailure([olderCompleted, abandoned]);

        Assert.NotNull(failure);
        Assert.Equal(WorkflowFailureKind.EngineFault, failure.Kind);
        Assert.Equal(abandoned.DatabaseId, failure.WorkflowId);
        Assert.NotNull(failure.LastError);
        Assert.Contains("abandoned", failure.LastError.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void BuildWorkflowFailure_IgnoresAbandonedWorkflowsSupersededByANewerOne()
    {
        // An abandoned workflow with a newer (superseding) workflow on top of it is background
        // noise - the newer workflow's outcome is what counts.
        var abandoned = CreateWorkflowStatus(
            createdAt: DateTimeOffset.UtcNow.AddMinutes(-5),
            status: PersistentItemStatus.Abandoned
        );
        var newerCompleted = CreateWorkflowStatus(createdAt: DateTimeOffset.UtcNow);

        Assert.Null(WorkflowEngineService.BuildWorkflowFailure([abandoned, newerCompleted]));
    }

    [Fact]
    public async Task ResolveWorkflowTaskStatus_WhenCurrentTaskIsNull_ReturnsIdleWithoutQueryingEngine()
    {
        // Not started / ended: there is nothing transitioning, so the engine must not be queried.
        var instance = new Instance { Id = $"1337/{Guid.NewGuid()}" };
        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        var service = new WorkflowEngineService(
            processNextRequestFactory: null!,
            client.Object,
            Mock.Of<IInstanceClient>(),
            new AppIdentifier(Org, App)
        );

        WorkflowTaskStatus result = await service.ResolveWorkflowTaskStatus(instance, CancellationToken.None);

        Assert.Equal(WorkflowActivityStatus.Idle, result.Status);
        Assert.Null(result.TargetTask);
        Assert.Null(result.Failure);
        client.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ResolveWorkflowTaskStatus_WhenHeadIsActive_ReturnsProcessingFromHeadLabelInSingleCall()
    {
        // A collection head that is Enqueued/Processing/Requeued means the transition is in flight.
        // The target task is read straight from the head's own processNextTargetTask label, so
        // processing resolves in a SINGLE GetCollection call - the collection's workflows must NOT
        // be listed.
        Guid headId = Guid.NewGuid();
        Guid instanceGuid = Guid.NewGuid();
        string collectionKey = instanceGuid.ToString();
        var instance = CreateInstanceOnTask("Task_1", instanceGuid);
        DateTimeOffset headCreatedAt = DateTimeOffset.UtcNow.AddSeconds(-42);

        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        client
            .Setup(c => c.GetCollection(Namespace, collectionKey, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new WorkflowCollectionDetailResponse
                {
                    Key = collectionKey,
                    Namespace = Namespace,
                    Heads =
                    [
                        new CollectionHeadStatus
                        {
                            DatabaseId = headId,
                            Status = PersistentItemStatus.Enqueued,
                            Labels = new Dictionary<string, string>(StringComparer.Ordinal)
                            {
                                [ProcessNextRequestFactory.ProcessNextTargetIdLabel] = "Task_2:3",
                                [ProcessNextRequestFactory.ProcessNextTargetTaskLabel] = "Task_2",
                            },
                            StepsCompleted = 4,
                            StepsTotal = 12,
                            CreatedAt = headCreatedAt,
                        },
                    ],
                    CreatedAt = DateTimeOffset.UtcNow,
                }
            );

        var service = new WorkflowEngineService(
            processNextRequestFactory: null!,
            client.Object,
            Mock.Of<IInstanceClient>(),
            new AppIdentifier(Org, App)
        );

        WorkflowTaskStatus result = await service.ResolveWorkflowTaskStatus(instance, CancellationToken.None);

        Assert.Equal(WorkflowActivityStatus.Processing, result.Status);
        Assert.Equal("Task_2", result.TargetTask);
        Assert.Null(result.Failure);
        Assert.False(result.Retrying); // Enqueued = first attempt pending, not a retry
        Assert.Equal(new WorkflowStepProgress(Completed: 4, Total: 12), result.Progress);
        Assert.Equal(headCreatedAt, result.StartedAt); // the head's enqueue time is the wait anchor
        client.Verify(c => c.GetCollection(Namespace, collectionKey, It.IsAny<CancellationToken>()), Times.Once);
        client.VerifyNoOtherCalls(); // ListWorkflows was NOT called for the processing case
    }

    [Fact]
    public async Task ResolveWorkflowTaskStatus_WhenHeadIsRequeued_ReturnsProcessingWithRetryingFlag()
    {
        // A Requeued head is parked between automatic retry attempts (a previous attempt failed):
        // still Processing to consumers, but flagged Retrying so a waiting UI can explain the
        // longer wait. Resolved from the same single GetCollection call as plain processing.
        Guid headId = Guid.NewGuid();
        Guid instanceGuid = Guid.NewGuid();
        string collectionKey = instanceGuid.ToString();
        var instance = CreateInstanceOnTask("Task_1", instanceGuid);

        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        client
            .Setup(c => c.GetCollection(Namespace, collectionKey, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new WorkflowCollectionDetailResponse
                {
                    Key = collectionKey,
                    Namespace = Namespace,
                    Heads =
                    [
                        new CollectionHeadStatus
                        {
                            DatabaseId = headId,
                            Status = PersistentItemStatus.Requeued,
                            Labels = new Dictionary<string, string>(StringComparer.Ordinal)
                            {
                                [ProcessNextRequestFactory.ProcessNextTargetIdLabel] = "Task_2:3",
                                [ProcessNextRequestFactory.ProcessNextTargetTaskLabel] = "Task_2",
                            },
                            StepsCompleted = 7,
                            StepsTotal = 12,
                        },
                    ],
                    CreatedAt = DateTimeOffset.UtcNow,
                }
            );

        var service = new WorkflowEngineService(
            processNextRequestFactory: null!,
            client.Object,
            Mock.Of<IInstanceClient>(),
            new AppIdentifier(Org, App)
        );

        WorkflowTaskStatus result = await service.ResolveWorkflowTaskStatus(instance, CancellationToken.None);

        Assert.Equal(WorkflowActivityStatus.Processing, result.Status);
        Assert.Equal("Task_2", result.TargetTask);
        Assert.True(result.Retrying);
        Assert.Null(result.Failure);
        Assert.Equal(new WorkflowStepProgress(Completed: 7, Total: 12), result.Progress);
        client.Verify(c => c.GetCollection(Namespace, collectionKey, It.IsAny<CancellationToken>()), Times.Once);
        client.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ResolveWorkflowTaskStatus_WhenHeadIsWaiting_ReturnsProcessingWithWaitingReason()
    {
        // A Waiting head is a step that deferred while polling for an external outcome. The work is
        // still in flight, so it must read as Processing (never idle) — but nothing failed, so it is
        // deliberately not flagged Retrying. Its hint is waitingReason: the deferring task's own
        // words, passed through from the collection head to the annotation.
        Guid headId = Guid.NewGuid();
        Guid instanceGuid = Guid.NewGuid();
        string collectionKey = instanceGuid.ToString();
        var instance = CreateInstanceOnTask("Task_1", instanceGuid);

        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        client
            .Setup(c => c.GetCollection(Namespace, collectionKey, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new WorkflowCollectionDetailResponse
                {
                    Key = collectionKey,
                    Namespace = Namespace,
                    Heads =
                    [
                        new CollectionHeadStatus
                        {
                            DatabaseId = headId,
                            Status = PersistentItemStatus.Waiting,
                            Labels = new Dictionary<string, string>(StringComparer.Ordinal)
                            {
                                [ProcessNextRequestFactory.ProcessNextTargetIdLabel] = "Task_2:3",
                                [ProcessNextRequestFactory.ProcessNextTargetTaskLabel] = "Task_2",
                            },
                            StepsCompleted = 4,
                            StepsTotal = 9,
                            WaitingReason = "shipment sent, awaiting delivery receipt",
                        },
                    ],
                    CreatedAt = DateTimeOffset.UtcNow,
                }
            );

        var service = new WorkflowEngineService(
            processNextRequestFactory: null!,
            client.Object,
            Mock.Of<IInstanceClient>(),
            new AppIdentifier(Org, App)
        );

        WorkflowTaskStatus result = await service.ResolveWorkflowTaskStatus(instance, CancellationToken.None);

        Assert.Equal(WorkflowActivityStatus.Processing, result.Status);
        Assert.Equal("Task_2", result.TargetTask);
        Assert.False(result.Retrying);
        Assert.Null(result.Failure);
        Assert.Equal(new WorkflowStepProgress(Completed: 4, Total: 9), result.Progress);
        Assert.Equal("shipment sent, awaiting delivery receipt", result.WaitingReason);
        Assert.Equal("shipment sent, awaiting delivery receipt", result.ToAppProcessWorkflowStatus().WaitingReason);
        client.Verify(c => c.GetCollection(Namespace, collectionKey, It.IsAny<CancellationToken>()), Times.Once);
        client.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ResolveWorkflowTaskStatus_WhenHeadIsHeld_ReturnsProcessingWithoutAWaitingReason()
    {
        // A Held head is the whole of what remains of its transition; reading it as settled would report the
        // instance idle while an exchange is open. Not Retrying — nothing failed — and no waiting reason is
        // persisted: the wording is static per task.
        Guid headId = Guid.NewGuid();
        Guid instanceGuid = Guid.NewGuid();
        string collectionKey = instanceGuid.ToString();
        var instance = CreateInstanceOnTask("Task_1", instanceGuid);

        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        client
            .Setup(c => c.GetCollection(Namespace, collectionKey, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new WorkflowCollectionDetailResponse
                {
                    Key = collectionKey,
                    Namespace = Namespace,
                    Heads =
                    [
                        new CollectionHeadStatus
                        {
                            DatabaseId = headId,
                            Status = PersistentItemStatus.Held,
                            Labels = new Dictionary<string, string>(StringComparer.Ordinal)
                            {
                                [ProcessNextRequestFactory.ProcessNextTargetIdLabel] = "Task_2:3",
                                [ProcessNextRequestFactory.ProcessNextTargetTaskLabel] = "Task_2",
                            },
                        },
                    ],
                    CreatedAt = DateTimeOffset.UtcNow,
                }
            );

        var service = new WorkflowEngineService(
            processNextRequestFactory: null!,
            client.Object,
            Mock.Of<IInstanceClient>(),
            new AppIdentifier(Org, App)
        );

        WorkflowTaskStatus result = await service.ResolveWorkflowTaskStatus(instance, CancellationToken.None);

        Assert.Equal(WorkflowActivityStatus.Processing, result.Status);
        Assert.Equal("Task_2", result.TargetTask);
        Assert.False(result.Retrying);
        Assert.Null(result.Failure);
        Assert.Null(result.WaitingReason);
    }

    [Fact]
    public async Task ResumeAndWaitForWorkflow_HeldWorkflowInTheChain_KeepsTheChainUnsettled()
    {
        // Heads can look inactive while the chain is unsettled — the anchored-chain guard's case. Observable
        // because a settled read returns at once where an unsettled one polls to timeout.
        Guid mainWorkflowId = Guid.NewGuid();
        Guid receiverWorkflowId = Guid.NewGuid();
        const string collectionKey = "collection-key";
        var instance = new Instance();

        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        client
            .Setup(c => c.ResumeWorkflow(Namespace, mainWorkflowId, It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResumeWorkflowResponse(mainWorkflowId, DateTimeOffset.UtcNow, []));
        client
            .Setup(c => c.GetCollection(Namespace, collectionKey, It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateCollection(collectionKey, mainWorkflowId, PersistentItemStatus.Completed));
        client
            .Setup(c =>
                c.ListWorkflows(
                    Namespace,
                    collectionKey,
                    It.IsAny<Dictionary<string, string>?>(),
                    It.IsAny<IReadOnlyList<PersistentItemStatus>?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([
                // Main explicitly older: ScopeToCurrentChain keeps the anchor by id plus everything created strictly
                // after it, and two UtcNow reads are not guaranteed to differ at one-second granularity.
                CreateWorkflowStatus(
                    DateTimeOffset.UtcNow.AddSeconds(-1),
                    status: PersistentItemStatus.Completed,
                    databaseId: mainWorkflowId,
                    steps:
                    [
                        CreateStep(SaveProcessStateToStorage.Key, PersistentItemStatus.Completed),
                        CreateStep($"{ExecuteServiceTask.Key}: 0", PersistentItemStatus.Completed),
                    ]
                ),
                CreateWorkflowStatus(
                    DateTimeOffset.UtcNow,
                    status: PersistentItemStatus.Held,
                    databaseId: receiverWorkflowId,
                    steps: [CreateStep(ExecuteServiceTask.Key, PersistentItemStatus.Enqueued)]
                ),
            ]);

        var instanceClient = new Mock<IInstanceClient>(MockBehavior.Strict);
        instanceClient
            .Setup(c =>
                c.GetInstance(instance, It.IsAny<StorageAuthenticationMethod?>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(instance);

        var service = new WorkflowEngineService(
            processNextRequestFactory: null!,
            client.Object,
            instanceClient.Object,
            new AppIdentifier(Org, App)
        )
        {
            WorkflowParkedReleaseGraceMs = 0,
            WorkflowPollingTimeoutMs = 500,
        };

        ProcessNextWorkflowResult result = await service.ResumeAndWaitForWorkflow(
            instance,
            mainWorkflowId,
            collectionKey,
            CancellationToken.None
        );

        Assert.NotNull(result.WorkflowFailure);
        Assert.Equal(WorkflowFailureKind.Timeout, result.WorkflowFailure.Kind);
    }

    [Fact]
    public async Task ResumeAndWaitForWorkflow_ParkedHeldChain_ReleasesEarlyAsCommittedSuccess()
    {
        // A receiver may stay parked for days by design, so the committed chain releases early and the
        // read-path annotation takes over — as for a deferring service task.
        Guid mainWorkflowId = Guid.NewGuid();
        Guid receiverWorkflowId = Guid.NewGuid();
        const string collectionKey = "collection-key";
        var instance = new Instance();

        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        client
            .Setup(c => c.ResumeWorkflow(Namespace, mainWorkflowId, It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResumeWorkflowResponse(mainWorkflowId, DateTimeOffset.UtcNow, []));
        client
            .Setup(c => c.GetCollection(Namespace, collectionKey, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new WorkflowCollectionDetailResponse
                {
                    Key = collectionKey,
                    Namespace = Namespace,
                    Heads =
                    [
                        new CollectionHeadStatus
                        {
                            DatabaseId = mainWorkflowId,
                            Status = PersistentItemStatus.Completed,
                        },
                        new CollectionHeadStatus
                        {
                            DatabaseId = receiverWorkflowId,
                            Status = PersistentItemStatus.Held,
                        },
                    ],
                    CreatedAt = DateTimeOffset.UtcNow,
                }
            );
        client
            .Setup(c =>
                c.ListWorkflows(
                    Namespace,
                    collectionKey,
                    It.IsAny<Dictionary<string, string>?>(),
                    It.IsAny<IReadOnlyList<PersistentItemStatus>?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([
                // Main explicitly older: ScopeToCurrentChain keeps the anchor by id plus everything created strictly
                // after it, and two UtcNow reads are not guaranteed to differ at one-second granularity.
                CreateWorkflowStatus(
                    DateTimeOffset.UtcNow.AddSeconds(-1),
                    status: PersistentItemStatus.Completed,
                    databaseId: mainWorkflowId,
                    steps:
                    [
                        CreateStep(SaveProcessStateToStorage.Key, PersistentItemStatus.Completed),
                        CreateStep($"{ExecuteServiceTask.Key}: 0", PersistentItemStatus.Completed),
                    ]
                ),
                CreateWorkflowStatus(
                    DateTimeOffset.UtcNow,
                    status: PersistentItemStatus.Held,
                    databaseId: receiverWorkflowId,
                    steps: [CreateStep(ExecuteServiceTask.Key, PersistentItemStatus.Enqueued)]
                ),
            ]);

        var instanceClient = new Mock<IInstanceClient>(MockBehavior.Strict);
        instanceClient
            .Setup(c =>
                c.GetInstance(instance, It.IsAny<StorageAuthenticationMethod?>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(instance);

        var service = new WorkflowEngineService(
            processNextRequestFactory: null!,
            client.Object,
            instanceClient.Object,
            new AppIdentifier(Org, App)
        )
        {
            WorkflowParkedReleaseGraceMs = 0,
            WorkflowPollingTimeoutMs = 500,
        };

        ProcessNextWorkflowResult result = await service.ResumeAndWaitForWorkflow(
            instance,
            mainWorkflowId,
            collectionKey,
            CancellationToken.None
        );

        Assert.Null(result.WorkflowFailure);
        Assert.True(result.ProcessStateChanged);
    }

    [Fact]
    public async Task ResolveWorkflowTaskStatus_WhenHeadIsFailed_ReturnsFailedWithFailureDetail()
    {
        // A resume-required head (Failed/Canceled/DependencyFailed) surfaces as Failed with the
        // failure detail built from the collection's workflows.
        Guid headId = Guid.NewGuid();
        Guid instanceGuid = Guid.NewGuid();
        string collectionKey = instanceGuid.ToString();
        var instance = CreateInstanceOnTask("Task_1", instanceGuid);
        WorkflowStatusResponse failedWorkflow = CreateWorkflowStatus(
            createdAt: DateTimeOffset.UtcNow,
            status: PersistentItemStatus.Failed,
            databaseId: headId,
            collectionKey: collectionKey,
            labels: new Dictionary<string, string>(StringComparer.Ordinal)
            {
                [ProcessNextRequestFactory.ProcessNextTargetIdLabel] = "Task_2:3",
                [ProcessNextRequestFactory.ProcessNextTargetTaskLabel] = "Task_2",
            },
            steps:
            [
                new StepStatusResponse
                {
                    OperationId = "step-op",
                    ProcessingOrder = 0,
                    Command = new StepStatusResponse.CommandDetails { Type = "app" },
                    Status = PersistentItemStatus.Failed,
                    RetryCount = 1,
                    ErrorHistory = [new ErrorEntry(DateTimeOffset.UtcNow, "The service task failed.", 422, false)],
                },
            ]
        );

        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        client
            .Setup(c =>
                c.ListWorkflows(
                    Namespace,
                    It.IsAny<string?>(),
                    It.IsAny<Dictionary<string, string>?>(),
                    It.IsAny<IReadOnlyList<PersistentItemStatus>?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([failedWorkflow]);
        client
            .Setup(c => c.GetCollection(Namespace, collectionKey, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new WorkflowCollectionDetailResponse
                {
                    Key = collectionKey,
                    Namespace = Namespace,
                    Heads =
                    [
                        new CollectionHeadStatus
                        {
                            DatabaseId = headId,
                            Status = PersistentItemStatus.Failed,
                            StepsCompleted = 7,
                            StepsTotal = 12,
                        },
                    ],
                    CreatedAt = DateTimeOffset.UtcNow,
                }
            );

        var service = new WorkflowEngineService(
            processNextRequestFactory: null!,
            client.Object,
            Mock.Of<IInstanceClient>(),
            new AppIdentifier(Org, App)
        );

        WorkflowTaskStatus result = await service.ResolveWorkflowTaskStatus(instance, CancellationToken.None);

        Assert.Equal(WorkflowActivityStatus.Failed, result.Status);
        Assert.Equal("Task_2", result.TargetTask);
        Assert.NotNull(result.Failure);
        Assert.Equal(WorkflowFailureKind.StepFailed, result.Failure.Kind);
        Assert.Equal("The service task failed.", result.Failure.LastError?.Message);
    }

    [Fact]
    public async Task ResolveWorkflowTaskStatus_WhenHeadsAreSettled_ReturnsIdleWithSingleCollectionCall()
    {
        // Heads exist but are all terminal-completed: the current task is settled. The common (idle)
        // read must resolve in a SINGLE GetCollection call — the collection's workflows are only
        // listed when a head is actually processing or failed.
        Guid instanceGuid = Guid.NewGuid();
        string collectionKey = instanceGuid.ToString();
        var instance = CreateInstanceOnTask("Task_1", instanceGuid);

        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        client
            .Setup(c => c.GetCollection(Namespace, collectionKey, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new WorkflowCollectionDetailResponse
                {
                    Key = collectionKey,
                    Namespace = Namespace,
                    Heads =
                    [
                        new CollectionHeadStatus
                        {
                            DatabaseId = Guid.NewGuid(),
                            Status = PersistentItemStatus.Completed,
                            StepsCompleted = 12,
                            StepsTotal = 12,
                        },
                    ],
                    CreatedAt = DateTimeOffset.UtcNow,
                }
            );

        var service = new WorkflowEngineService(
            processNextRequestFactory: null!,
            client.Object,
            Mock.Of<IInstanceClient>(),
            new AppIdentifier(Org, App)
        );

        WorkflowTaskStatus result = await service.ResolveWorkflowTaskStatus(instance, CancellationToken.None);

        Assert.Equal(WorkflowActivityStatus.Idle, result.Status);
        client.Verify(c => c.GetCollection(Namespace, collectionKey, It.IsAny<CancellationToken>()), Times.Once);
        client.VerifyNoOtherCalls(); // crucially, ListWorkflows was NOT called for the settled case
    }

    private static Instance CreateInstanceOnTask(string elementId, Guid? instanceGuid = null) =>
        new()
        {
            Id = $"1337/{instanceGuid ?? Guid.NewGuid()}",
            Process = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { ElementId = elementId, Flow = 0 },
            },
        };

    private static WorkflowCollectionDetailResponse CreateCollection(
        string collectionKey,
        Guid headId,
        PersistentItemStatus headStatus
    ) =>
        new()
        {
            Key = collectionKey,
            Namespace = Namespace,
            Heads = [new CollectionHeadStatus { DatabaseId = headId, Status = headStatus }],
            CreatedAt = DateTimeOffset.UtcNow,
        };

    private static StepStatusResponse CreateStep(string operationId, PersistentItemStatus status) =>
        new()
        {
            OperationId = operationId,
            ProcessingOrder = 0,
            Command = new StepStatusResponse.CommandDetails { Type = "app" },
            Status = status,
            RetryCount = 0,
        };

    private static WorkflowStatusResponse CreateWorkflowStatus(
        DateTimeOffset createdAt,
        PersistentItemStatus status = PersistentItemStatus.Completed,
        string operationId = "op",
        bool? isHead = null,
        Guid? databaseId = null,
        string? collectionKey = null,
        Dictionary<string, string>? labels = null,
        IReadOnlyList<StepStatusResponse>? steps = null
    ) =>
        new()
        {
            DatabaseId = databaseId ?? Guid.NewGuid(),
            OperationId = operationId,
            IdempotencyKey = Guid.NewGuid().ToString(),
            Namespace = Namespace,
            CollectionKey = collectionKey,
            CreatedAt = createdAt,
            OverallStatus = status,
            IsHead = isHead,
            Labels = labels,
            Steps = steps ?? [],
        };
}
