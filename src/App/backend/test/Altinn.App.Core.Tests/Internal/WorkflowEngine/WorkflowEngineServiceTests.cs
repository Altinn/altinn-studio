using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.App.Tests.Common.Auth;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
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

    [Fact]
    public async Task EnqueueProcessNext_EmitsTheSameBatchAsAUserDrivenAdvance()
    {
        // The no-wait path (system-initiated advances of parked service tasks) must go through the
        // same ProcessNextRequestFactory as user-driven process-next: Main opts into DependsOnHeads
        // (no explicit dependsOn), and the fire-and-forget side effects ride Main's
        // EnqueueSideEffectsWorkflow step payload as invisible IsHead=false siblings scheduled at
        // the commit - never inline in the blocking chain.
        var instance = new Instance
        {
            Id = "1337/aabbccdd-1234-5678-9012-aabbccddeeff",
            AppId = $"{Org}/{App}",
            Org = Org,
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Data = [],
        };
        var processStateChange = new ProcessStateChange
        {
            OldProcessState = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { ElementId = "Task_1", AltinnTaskType = "eFormidling" },
            },
            NewProcessState = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { ElementId = "Task_2", AltinnTaskType = "data" },
            },
            Events =
            [
                new InstanceEvent
                {
                    EventType = InstanceEventType.process_EndTask.ToString(),
                    ProcessInfo = new ProcessState
                    {
                        CurrentTask = new ProcessElementInfo { ElementId = "Task_1", AltinnTaskType = "eFormidling" },
                    },
                },
                new InstanceEvent
                {
                    EventType = InstanceEventType.process_StartTask.ToString(),
                    ProcessInfo = new ProcessState
                    {
                        CurrentTask = new ProcessElementInfo { ElementId = "Task_2", AltinnTaskType = "data" },
                    },
                },
            ],
        };

        string? capturedIdempotencyKey = null;
        string? capturedCollectionKey = null;
        WorkflowEnqueueRequest? capturedRequest = null;
        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        client
            .Setup(c =>
                c.EnqueueWorkflows(
                    Namespace,
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback(
                (
                    string _,
                    string idempotencyKey,
                    string? collectionKey,
                    WorkflowEnqueueRequest request,
                    CancellationToken _
                ) =>
                {
                    capturedIdempotencyKey = idempotencyKey;
                    capturedCollectionKey = collectionKey;
                    capturedRequest = request;
                }
            )
            .ReturnsAsync(
                new WorkflowEnqueueResponse.Accepted
                {
                    Workflows = [new WorkflowResult { DatabaseId = Guid.NewGuid(), Namespace = Namespace }],
                }
            );

        var service = new WorkflowEngineService(
            CreateRequestFactory(),
            client.Object,
            new Mock<IInstanceClient>(MockBehavior.Strict).Object,
            new AppIdentifier(Org, App)
        );

        await service.EnqueueProcessNext(
            instance,
            processStateChange,
            resolvedAction: "write",
            lockToken: "lock-token",
            state: "signed-state-blob",
            actor: new Actor { OrgId = Org },
            CancellationToken.None
        );

        Assert.NotNull(capturedRequest);
        WorkflowRequest main = Assert.Single(capturedRequest.Workflows);
        Assert.Null(main.DependsOn);
        Assert.True(main.DependsOnHeads, "the advance must auto-append onto the collection's current heads");
        Assert.Equal("signed-state-blob", main.State);

        // The side effects ride inside Main's EnqueueSideEffectsWorkflow step payload, submitted at
        // the commit boundary as independent IsHead=false roots.
        WorkflowRequest sideEffects = Assert.Single(ExtractSideEffectsWorkflows(capturedRequest));
        Assert.StartsWith(ProcessNextRequestFactory.SideEffectsOperationIdPrefix, sideEffects.OperationId);
        Assert.False(sideEffects.IsHead ?? true, "the side chain must stay invisible to the heads frontier");
        Assert.False(sideEffects.DependsOnHeads);

        // Deterministic process-next key: a redelivered trigger (FiksIO/Events retry) deduplicates
        // onto the same workflow instead of double-advancing.
        Assert.StartsWith("process-next-operation-", capturedIdempotencyKey);
        Assert.Equal("aabbccdd-1234-5678-9012-aabbccddeeff", capturedCollectionKey);
    }

    private static ProcessNextRequestFactory CreateRequestFactory()
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        var appImplFactory = services.BuildServiceProvider().GetRequiredService<AppImplementationFactory>();

        var authContextMock = new Mock<IAuthenticationContext>();
        authContextMock.Setup(x => x.Current).Returns(TestAuthentication.GetUserAuthentication());

        var appMetadataMock = new Mock<IAppMetadata>();
        appMetadataMock
            .Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata($"{Org}/{App}") { DataTypes = [] });

        var callbackTokenGeneratorMock = new Mock<IWorkflowCallbackTokenGenerator>();
        callbackTokenGeneratorMock.Setup(x => x.GenerateToken(It.IsAny<Guid>())).Returns("test-callback-token");

        return new ProcessNextRequestFactory(
            appImplFactory,
            authContextMock.Object,
            new AppIdentifier(Org, App),
            Options.Create(new AppSettings { RegisterEventsWithEventsComponent = true }),
            appMetadataMock.Object,
            callbackTokenGeneratorMock.Object,
            new ProcessStepOptionsResolver([new ExecuteServiceTask(appImplFactory)], appImplFactory)
        );
    }

    /// <summary>
    /// Unwraps the sibling side-effects workflow requests embedded in the Main workflow's
    /// EnqueueSideEffectsWorkflow step payload (the batch that step submits at the commit boundary).
    /// </summary>
    private static List<WorkflowRequest> ExtractSideEffectsWorkflows(WorkflowEnqueueRequest request)
    {
        StepRequest? enqueueStep = request
            .Workflows.SelectMany(workflow => workflow.Steps)
            .SingleOrDefault(step =>
                step.Command.Type == "app"
                && step.Command.Data is { } data
                && JsonSerializer.Deserialize<AppCommandData>(data)?.CommandKey == EnqueueSideEffectsWorkflow.Key
            );
        Assert.NotNull(enqueueStep);
        var commandData = JsonSerializer.Deserialize<AppCommandData>(enqueueStep.Command.Data!.Value)!;
        WorkflowEnqueueRequest embedded = CommandPayloadSerializer
            .Deserialize<EnqueueSideEffectsWorkflowPayload>(commandData.Payload)!
            .EnqueueRequest;
        return [.. embedded.Workflows];
    }

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
