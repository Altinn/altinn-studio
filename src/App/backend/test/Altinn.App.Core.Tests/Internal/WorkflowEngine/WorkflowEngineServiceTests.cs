using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging.Abstractions;
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
            new AppIdentifier(Org, App),
            NullLogger<WorkflowEngineService>.Instance
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
        // anchor - only the OperationId marker excludes it.
        var anchorCreatedAt = DateTimeOffset.UtcNow.AddSeconds(-2);
        var anchor = CreateWorkflowStatus(createdAt: anchorCreatedAt);
        var sameBatchSideEffects = CreateWorkflowStatus(
            createdAt: anchorCreatedAt,
            operationId: "Process next side-effects: Task_1 -> Task_2",
            status: PersistentItemStatus.Enqueued
        );
        var dependent = CreateWorkflowStatus(createdAt: DateTimeOffset.UtcNow);
        var dependentBatchSideEffects = CreateWorkflowStatus(
            createdAt: DateTimeOffset.UtcNow,
            operationId: "Process next side-effects: Task_2 -> Task_3",
            status: PersistentItemStatus.Enqueued
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
            status: PersistentItemStatus.Failed
        );

        IReadOnlyList<WorkflowStatusResponse> scoped = WorkflowEngineService.ScopeToCurrentChain(
            [mainWorkflow, failedSideEffects],
            sinceWorkflowId: null
        );

        Assert.Equal([mainWorkflow.DatabaseId], scoped.Select(w => w.DatabaseId));
    }

    [Fact]
    public void IsSideEffectsWorkflow_MatchesOnlyTheSideEffectsOperationIdMarker()
    {
        Assert.True(
            WorkflowEngineService.IsSideEffectsWorkflow(
                CreateWorkflowStatus(
                    createdAt: DateTimeOffset.UtcNow,
                    operationId: "Process next side-effects: Task_1 -> Task_2"
                )
            )
        );
        Assert.False(
            WorkflowEngineService.IsSideEffectsWorkflow(
                CreateWorkflowStatus(createdAt: DateTimeOffset.UtcNow, operationId: "Process next: Task_1 -> Task_2")
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

    private static WorkflowStatusResponse CreateWorkflowStatus(
        DateTimeOffset createdAt,
        PersistentItemStatus status = PersistentItemStatus.Completed,
        string operationId = "op"
    ) =>
        new()
        {
            DatabaseId = Guid.NewGuid(),
            OperationId = operationId,
            IdempotencyKey = Guid.NewGuid().ToString(),
            Namespace = Namespace,
            CreatedAt = createdAt,
            OverallStatus = status,
            Steps = [],
        };
}
