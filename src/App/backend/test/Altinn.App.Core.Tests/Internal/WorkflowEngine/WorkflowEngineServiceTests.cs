using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.WorkflowEngine;
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
                        new CollectionHeadStatus { DatabaseId = workflowId, Status = PersistentItemStatus.Completed },
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
        var workflows = new[] { CreateWorkflowStatus(createdAt: DateTimeOffset.UtcNow) };

        Assert.Same(workflows, WorkflowEngineService.ScopeToCurrentChain(workflows, sinceWorkflowId: null));
        Assert.Same(workflows, WorkflowEngineService.ScopeToCurrentChain(workflows, Guid.NewGuid()));
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
        // The target task is read straight from the head's own processNextTargetId label ("Task_2:3",
        // ":flow" suffix stripped), so processing resolves in a SINGLE GetCollection call - the
        // collection's workflows must NOT be listed.
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
                            Status = PersistentItemStatus.Enqueued,
                            Labels = new Dictionary<string, string>(StringComparer.Ordinal)
                            {
                                [ProcessNextRequestFactory.ProcessNextTargetIdLabel] = "Task_2:3",
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
        Assert.Null(result.Failure);
        client.Verify(c => c.GetCollection(Namespace, collectionKey, It.IsAny<CancellationToken>()), Times.Once);
        client.VerifyNoOtherCalls(); // ListWorkflows was NOT called for the processing case
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
                    Heads = [new CollectionHeadStatus { DatabaseId = headId, Status = PersistentItemStatus.Failed }],
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

    private static WorkflowStatusResponse CreateWorkflowStatus(
        DateTimeOffset createdAt,
        PersistentItemStatus status = PersistentItemStatus.Completed,
        Guid? databaseId = null,
        string? collectionKey = null,
        Dictionary<string, string>? labels = null,
        IReadOnlyList<StepStatusResponse>? steps = null
    ) =>
        new()
        {
            DatabaseId = databaseId ?? Guid.NewGuid(),
            OperationId = "op",
            IdempotencyKey = Guid.NewGuid().ToString(),
            Namespace = Namespace,
            CollectionKey = collectionKey,
            CreatedAt = createdAt,
            OverallStatus = status,
            Labels = labels,
            Steps = steps ?? [],
        };
}
