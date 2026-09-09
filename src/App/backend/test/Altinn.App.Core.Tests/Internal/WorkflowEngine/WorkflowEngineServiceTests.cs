using System.Net;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.App.Tests.Common.Auth;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

public class WorkflowEngineServiceTests
{
    private const string Org = "ttd";
    private const string App = "test-app";
    private const string Namespace = $"{Org}/{App}";

    [Fact]
    public void CreateProcessNextIdempotencyKey_UsesExactInstanceGuidAndAuthoritativeVersion()
    {
        Guid instanceGuid = Guid.Parse("173a5bda-f76c-454c-840f-dea11a0c98b9");
        var instance = CreateInstance(instanceGuid);

        string key = WorkflowEngineService.CreateProcessNextIdempotencyKey(
            instance,
            new StorageVersionMetadata(InstanceVersion: 42, ProcessStateVersion: 7)
        );

        Assert.Equal($"process-next-operation-{instanceGuid:N}-42", key);
    }

    [Fact]
    public void CreateProcessNextIdempotencyKey_SameSnapshotIgnoresTaskFlowAndActionContent()
    {
        Guid instanceGuid = Guid.NewGuid();
        var original = CreateInstance(instanceGuid);
        original.Process = new ProcessState
        {
            CurrentTask = new ProcessElementInfo { ElementId = "Task_A", Flow = 2 },
        };
        var sameSnapshotDifferentTransitionContent = CreateInstance(instanceGuid);
        sameSnapshotDifferentTransitionContent.Process = new ProcessState
        {
            CurrentTask = new ProcessElementInfo { ElementId = "Task_B", Flow = 99 },
        };
        var versions = new StorageVersionMetadata(InstanceVersion: 11, ProcessStateVersion: 3);

        string originalKey = WorkflowEngineService.CreateProcessNextIdempotencyKey(original, versions);
        string changedContentKey = WorkflowEngineService.CreateProcessNextIdempotencyKey(
            sameSnapshotDifferentTransitionContent,
            versions
        );

        Assert.Equal(originalKey, changedContentKey);
    }

    [Fact]
    public void CreateProcessNextIdempotencyKey_ChangesForDifferentInstanceOrVersion()
    {
        var first = CreateInstance(Guid.NewGuid());
        var second = CreateInstance(Guid.NewGuid());

        string firstVersion = WorkflowEngineService.CreateProcessNextIdempotencyKey(
            first,
            new StorageVersionMetadata(InstanceVersion: 5)
        );
        string nextVersion = WorkflowEngineService.CreateProcessNextIdempotencyKey(
            first,
            new StorageVersionMetadata(InstanceVersion: 6)
        );
        string otherInstance = WorkflowEngineService.CreateProcessNextIdempotencyKey(
            second,
            new StorageVersionMetadata(InstanceVersion: 5)
        );

        Assert.NotEqual(firstVersion, nextVersion);
        Assert.NotEqual(firstVersion, otherInstance);
    }

    [Fact]
    public void CreateDependentWorkflowIdempotencyKey_RemainsWorkflowBased()
    {
        Guid workflowId = Guid.NewGuid();

        Assert.Equal(
            $"process-next-dependent-{workflowId:N}",
            WorkflowEngineService.CreateDependentWorkflowIdempotencyKey(workflowId)
        );
    }

    [Fact]
    public async Task EnqueueAndWaitForProcessNext_EngineIdempotencyConflictIsDefinitiveNotAccepted()
    {
        var instance = CreateInstance(Guid.NewGuid());
        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        client
            .Setup(c =>
                c.EnqueueWorkflows(
                    Namespace,
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new HttpRequestException("idempotency conflict", null, HttpStatusCode.Conflict));
        var service = CreateService(client, Mock.Of<IInstanceClientWithStorageMetadata>());

        WorkflowSubmissionFailedException exception = await Assert.ThrowsAsync<WorkflowSubmissionFailedException>(() =>
            service.EnqueueAndWaitForProcessNext(
                instance,
                new StorageVersionMetadata(InstanceVersion: 9, ProcessStateVersion: 4),
                CreateProcessStateChange(instance)
            )
        );

        Assert.Equal(WorkflowSubmissionFailureKind.NotAccepted, exception.Kind);
        Assert.Equal(HttpStatusCode.Conflict, exception.StatusCode);
        client.Verify(
            c => c.GetCollection(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }

    [Fact]
    public async Task EnqueueAndWaitForProcessNext_SameVersionReusesKeyWhileTransitionAndActorRemainInBody()
    {
        var instance = CreateInstance(Guid.NewGuid());
        var versions = new StorageVersionMetadata(InstanceVersion: 9, ProcessStateVersion: 4);
        var keys = new List<string>();
        var requests = new List<WorkflowEnqueueRequest>();
        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        client
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
                (_, key, _, request, _) =>
                {
                    keys.Add(key);
                    requests.Add(request);
                }
            )
            .ThrowsAsync(new HttpRequestException("idempotency conflict", null, HttpStatusCode.Conflict));
        var firstActorService = CreateService(
            client,
            Mock.Of<IInstanceClientWithStorageMetadata>(),
            TestAuthentication.GetUserAuthentication(userId: 1337, userPartyId: 501337)
        );
        var secondActorService = CreateService(
            client,
            Mock.Of<IInstanceClientWithStorageMetadata>(),
            TestAuthentication.GetUserAuthentication(userId: 2448, userPartyId: 502448)
        );
        ProcessStateChange firstTransition = CreateProcessStateChange(instance);
        ProcessStateChange secondTransition = CreateProcessStateChange(instance);
        secondTransition.NewProcessState!.CurrentTask = new ProcessElementInfo
        {
            ElementId = "Task_with_different_action_and_flow",
            AltinnTaskType = "signing",
            Flow = 99,
        };
        secondTransition.Events =
        [
            new InstanceEvent
            {
                InstanceId = instance.Id,
                EventType = "process:next",
                AdditionalInfo = "different-action",
            },
        ];

        await Assert.ThrowsAsync<WorkflowSubmissionFailedException>(() =>
            firstActorService.EnqueueAndWaitForProcessNext(instance, versions, firstTransition)
        );
        await Assert.ThrowsAsync<WorkflowSubmissionFailedException>(() =>
            secondActorService.EnqueueAndWaitForProcessNext(instance, versions, secondTransition)
        );

        Assert.Equal(2, keys.Count);
        Assert.Equal(keys[0], keys[1]);
        Assert.Equal($"process-next-operation-{new InstanceIdentifier(instance).InstanceGuid:N}-9", keys[0]);
        Assert.NotEqual(JsonSerializer.Serialize(requests[0]), JsonSerializer.Serialize(requests[1]));
        Assert.NotEqual(
            requests[0].Context!.Value.GetProperty("actor").GetProperty("userId").GetInt32(),
            requests[1].Context!.Value.GetProperty("actor").GetProperty("userId").GetInt32()
        );
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task EnqueueAndWaitForProcessNext_AmbiguousInitialRetryReusesVersionKeyWithoutLockToken(
        bool isInstantiation
    )
    {
        Guid instanceGuid = Guid.NewGuid();
        Guid workflowId = Guid.NewGuid();
        var instance = CreateInstance(instanceGuid);
        var versions = new StorageVersionMetadata(InstanceVersion: 17, ProcessStateVersion: 5);
        ProcessStateChange transition = CreateProcessStateChange(instance);
        string collectionKey = instanceGuid.ToString();
        var keys = new List<string>();
        var requests = new List<WorkflowEnqueueRequest>();
        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        client
            .Setup(c =>
                c.EnqueueWorkflows(
                    Namespace,
                    It.IsAny<string>(),
                    collectionKey,
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<string, string, string?, WorkflowEnqueueRequest, CancellationToken>(
                (_, key, _, request, _) =>
                {
                    keys.Add(key);
                    requests.Add(request);
                }
            )
            .ReturnsAsync(
                new WorkflowEnqueueResponse.Accepted
                {
                    Workflows = [new WorkflowResult { DatabaseId = workflowId, Namespace = Namespace }],
                }
            );
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
            .Setup(c => c.ListWorkflows(Namespace, collectionKey, null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync([
                new WorkflowStatusResponse
                {
                    DatabaseId = workflowId,
                    OperationId = "Process next",
                    IdempotencyKey = "engine-stored-key",
                    Namespace = Namespace,
                    CollectionKey = collectionKey,
                    CreatedAt = DateTimeOffset.UtcNow,
                    OverallStatus = PersistentItemStatus.Completed,
                    Steps = [],
                },
            ]);
        var instanceClient = new Mock<IInstanceClientWithStorageMetadata>(MockBehavior.Strict);
        instanceClient
            .Setup(c =>
                c.GetInstanceWithStorageMetadata(
                    instance,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(instance, versions));
        WorkflowEngineService service = CreateService(client, instanceClient.Object);

        ProcessNextWorkflowResult first = await service.EnqueueAndWaitForProcessNext(
            instance,
            versions,
            transition,
            state: "same-signed-state",
            isInstantiation: isInstantiation
        );
        ProcessNextWorkflowResult retry = await service.EnqueueAndWaitForProcessNext(
            instance,
            versions,
            transition,
            state: "same-signed-state",
            isInstantiation: isInstantiation
        );

        Assert.Null(first.WorkflowFailure);
        Assert.Null(retry.WorkflowFailure);
        Assert.Equal(2, keys.Count);
        Assert.Single(keys.Distinct(StringComparer.Ordinal));
        Assert.Equal($"process-next-operation-{instanceGuid:N}-17", keys[0]);
        Assert.All(requests, request => Assert.False(request.Context!.Value.TryGetProperty("lockToken", out _)));
    }

    [Fact]
    public async Task EnqueueAndWaitForProcessNext_AcquireConflictRePollsAfterAbandonCasLossThenWritesOff()
    {
        Guid workflowId = Guid.NewGuid();
        var instance = CreateInstance(Guid.NewGuid());
        var versions = new StorageVersionMetadata(InstanceVersion: 9, ProcessStateVersion: 4);
        WorkflowStatusResponse failedWorkflow = CreateFailedWorkflow(
            workflowId,
            AcquireProcessingStatus.Key,
            processingOrder: 0,
            httpStatusCode: null,
            wasRetryable: false
        );
        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        client
            .Setup(c =>
                c.EnqueueWorkflows(
                    Namespace,
                    It.IsAny<string>(),
                    instance.Id!.Split('/')[1],
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                new WorkflowEnqueueResponse.Accepted
                {
                    Workflows = [new WorkflowResult { DatabaseId = workflowId, Namespace = Namespace }],
                }
            );
        client
            .Setup(c => c.GetCollection(Namespace, It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new WorkflowCollectionDetailResponse
                {
                    Key = instance.Id!.Split('/')[1],
                    Namespace = Namespace,
                    Heads =
                    [
                        new CollectionHeadStatus { DatabaseId = workflowId, Status = PersistentItemStatus.Failed },
                    ],
                    CreatedAt = DateTimeOffset.UtcNow,
                }
            );
        client
            .Setup(c =>
                c.ListWorkflows(
                    Namespace,
                    It.IsAny<string>(),
                    It.IsAny<Dictionary<string, string>?>(),
                    It.IsAny<IReadOnlyList<PersistentItemStatus>?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([failedWorkflow]);
        client
            .SetupSequence(c => c.AbandonWorkflow(Namespace, workflowId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false)
            .ReturnsAsync(true);
        var instanceClient = new Mock<IInstanceClientWithStorageMetadata>(MockBehavior.Strict);
        instanceClient
            .Setup(c =>
                c.GetInstanceWithStorageMetadata(
                    instance,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(instance, versions));
        var timeProvider = new FakeTimeProvider();
        var service = CreateService(client, instanceClient.Object, timeProvider: timeProvider);

        Task<ProcessNextWorkflowResult> resultTask = service.EnqueueAndWaitForProcessNext(
            instance,
            versions,
            CreateProcessStateChange(instance)
        );
        Assert.False(resultTask.IsCompleted);
        timeProvider.Advance(TimeSpan.FromMilliseconds(100));
        ProcessNextWorkflowResult result = await resultTask;

        Assert.Equal(WorkflowFailureKind.AcquireConflict, result.WorkflowFailure?.Kind);
        Assert.False(result.ProcessStateChanged);
        client.Verify(c => c.AbandonWorkflow(Namespace, workflowId, It.IsAny<CancellationToken>()), Times.Exactly(2));
    }

    [Fact]
    public async Task ResumeAndWaitForWorkflow_RepeatedAbandonCasLossCannotBypassPollingDeadline()
    {
        Guid workflowId = Guid.NewGuid();
        const string collectionKey = "acquire-conflict-chain";
        var instance = CreateInstance(Guid.NewGuid());
        var versions = new StorageVersionMetadata(InstanceVersion: 9, ProcessStateVersion: 4);
        WorkflowStatusResponse failedWorkflow = CreateFailedWorkflow(
            workflowId,
            AcquireProcessingStatus.Key,
            processingOrder: 0,
            httpStatusCode: StatusCodes.Status409Conflict,
            wasRetryable: false
        );
        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        client
            .Setup(c => c.ResumeWorkflow(Namespace, workflowId, true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResumeWorkflowResponse(workflowId, DateTimeOffset.UtcNow, []));
        client
            .Setup(c => c.GetCollection(Namespace, collectionKey, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new WorkflowCollectionDetailResponse
                {
                    Key = collectionKey,
                    Namespace = Namespace,
                    Heads =
                    [
                        new CollectionHeadStatus { DatabaseId = workflowId, Status = PersistentItemStatus.Failed },
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
            .ReturnsAsync([failedWorkflow]);
        int abandonAttempts = 0;
        using var abandonAttemptObserved = new SemaphoreSlim(0);
        client
            .Setup(c => c.AbandonWorkflow(Namespace, workflowId, It.IsAny<CancellationToken>()))
            .Callback(() =>
            {
                Interlocked.Increment(ref abandonAttempts);
                abandonAttemptObserved.Release();
            })
            .ReturnsAsync(false);
        var instanceClient = new Mock<IInstanceClientWithStorageMetadata>(MockBehavior.Strict);
        instanceClient
            .Setup(c =>
                c.GetInstanceWithStorageMetadata(
                    instance,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(instance, versions));
        var timeProvider = new FakeTimeProvider();
        var service = CreateService(client, instanceClient.Object, timeProvider: timeProvider);

        Task<ProcessNextWorkflowResult> resultTask = service.ResumeAndWaitForWorkflow(
            instance,
            workflowId,
            collectionKey
        );
        Assert.True(await abandonAttemptObserved.WaitAsync(TimeSpan.FromSeconds(5)));
        for (int attempt = 1; attempt < 3; attempt++)
        {
            timeProvider.Advance(TimeSpan.FromSeconds(2));
            Assert.True(await abandonAttemptObserved.WaitAsync(TimeSpan.FromSeconds(5)));
        }
        timeProvider.Advance(TimeSpan.FromSeconds(101));

        ProcessNextWorkflowResult result = await resultTask.WaitAsync(TimeSpan.FromSeconds(5));

        Assert.Equal(WorkflowFailureKind.Timeout, result.WorkflowFailure?.Kind);
        Assert.True(abandonAttempts >= 3);
    }

    [Fact]
    public async Task ResumeAndWaitForWorkflow_FailureAfterAcquireRemainsResumableAndIsNotWrittenOff()
    {
        Guid workflowId = Guid.NewGuid();
        const string collectionKey = "transition-chain";
        var instance = CreateInstance(Guid.NewGuid());
        var versions = new StorageVersionMetadata(InstanceVersion: 12, ProcessStateVersion: 8);
        WorkflowStatusResponse failedWorkflow = CreateFailedWorkflow(
            workflowId,
            CommitProcessState.Key,
            processingOrder: 1,
            httpStatusCode: StatusCodes.Status500InternalServerError,
            wasRetryable: true,
            precedingCompletedAcquire: true
        );
        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        client
            .Setup(c => c.ResumeWorkflow(Namespace, workflowId, true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResumeWorkflowResponse(workflowId, DateTimeOffset.UtcNow, []));
        client
            .Setup(c => c.GetCollection(Namespace, collectionKey, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new WorkflowCollectionDetailResponse
                {
                    Key = collectionKey,
                    Namespace = Namespace,
                    Heads =
                    [
                        new CollectionHeadStatus { DatabaseId = workflowId, Status = PersistentItemStatus.Failed },
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
            .ReturnsAsync([failedWorkflow]);
        var instanceClient = new Mock<IInstanceClientWithStorageMetadata>(MockBehavior.Strict);
        instanceClient
            .Setup(c =>
                c.GetInstanceWithStorageMetadata(
                    instance,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(instance, versions));
        var service = CreateService(client, instanceClient.Object);

        ProcessNextWorkflowResult result = await service.ResumeAndWaitForWorkflow(instance, workflowId, collectionKey);

        Assert.Equal(WorkflowFailureKind.StepFailed, result.WorkflowFailure?.Kind);
        Assert.Equal("resumeWorkflow", result.WorkflowFailure?.RetryAction);
        client.Verify(
            c => c.AbandonWorkflow(It.IsAny<string>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }

    [Fact]
    public async Task ResumeAndWaitForWorkflow_UnrelatedAcquireConflictRemainsResumableAndIsNotWrittenOff()
    {
        Guid workflowId = Guid.NewGuid();
        const string collectionKey = "unrelated-acquire-conflict";
        var instance = CreateInstance(Guid.NewGuid());
        var versions = new StorageVersionMetadata(InstanceVersion: 12, ProcessStateVersion: 8);
        WorkflowStatusResponse failedWorkflow = CreateFailedWorkflow(
            workflowId,
            AcquireProcessingStatus.Key,
            processingOrder: 0,
            httpStatusCode: StatusCodes.Status409Conflict,
            wasRetryable: false,
            includeAcquireConcurrencyCode: false
        );
        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        client
            .Setup(c => c.ResumeWorkflow(Namespace, workflowId, true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResumeWorkflowResponse(workflowId, DateTimeOffset.UtcNow, []));
        client
            .Setup(c => c.GetCollection(Namespace, collectionKey, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new WorkflowCollectionDetailResponse
                {
                    Key = collectionKey,
                    Namespace = Namespace,
                    Heads =
                    [
                        new CollectionHeadStatus { DatabaseId = workflowId, Status = PersistentItemStatus.Failed },
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
            .ReturnsAsync([failedWorkflow]);
        var instanceClient = new Mock<IInstanceClientWithStorageMetadata>(MockBehavior.Strict);
        instanceClient
            .Setup(c =>
                c.GetInstanceWithStorageMetadata(
                    instance,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(instance, versions));
        var service = CreateService(client, instanceClient.Object);

        ProcessNextWorkflowResult result = await service.ResumeAndWaitForWorkflow(instance, workflowId, collectionKey);

        Assert.Equal(WorkflowFailureKind.StepFailed, result.WorkflowFailure?.Kind);
        Assert.Equal("resumeWorkflow", result.WorkflowFailure?.RetryAction);
        client.Verify(
            c => c.AbandonWorkflow(It.IsAny<string>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }

    [Fact]
    public async Task GetCurrentTaskWorkflowState_AbandonedAcquireDoesNotRequireResume()
    {
        Guid workflowId = Guid.NewGuid();
        const string collectionKey = "instance-collection";
        var instance = CreateInstance(Guid.NewGuid());
        var workflow = CreateWorkflowStatus(DateTimeOffset.UtcNow, PersistentItemStatus.Abandoned) with
        {
            DatabaseId = workflowId,
            CollectionKey = collectionKey,
        };
        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        client
            .Setup(c =>
                c.ListWorkflows(
                    Namespace,
                    null,
                    It.IsAny<Dictionary<string, string>?>(),
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([workflow]);
        client
            .Setup(c => c.GetCollection(Namespace, collectionKey, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new WorkflowCollectionDetailResponse
                {
                    Key = collectionKey,
                    Namespace = Namespace,
                    Heads =
                    [
                        new CollectionHeadStatus { DatabaseId = workflowId, Status = PersistentItemStatus.Abandoned },
                    ],
                    CreatedAt = DateTimeOffset.UtcNow,
                }
            );
        var service = CreateService(client, Mock.Of<IInstanceClientWithStorageMetadata>());

        CurrentTaskWorkflowState state = await service.GetCurrentTaskWorkflowState(instance);

        Assert.IsType<CurrentTaskWorkflowState.Unblocked>(state);
    }

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

        var versions = new StorageVersionMetadata(InstanceVersion: 17, ProcessStateVersion: 9);
        var instanceClient = new Mock<IInstanceClientWithStorageMetadata>(MockBehavior.Strict);
        instanceClient
            .Setup(c =>
                c.GetInstanceWithStorageMetadata(
                    instance,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(instance, versions));

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
        Assert.Equal(versions, result.InstanceVersions);
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
                        CreateStep(CommitProcessState.Key, PersistentItemStatus.Completed),
                        CreateStep("ExecuteServiceTask", PersistentItemStatus.Waiting),
                    ]
                ),
            ]);

        var instanceClient = new Mock<IInstanceClientWithStorageMetadata>(MockBehavior.Strict);
        instanceClient
            .Setup(c =>
                c.GetInstanceWithStorageMetadata(
                    instance,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(instance, StorageVersionMetadata.Empty));

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

        var instanceClient = new Mock<IInstanceClientWithStorageMetadata>(MockBehavior.Strict);
        instanceClient
            .Setup(c =>
                c.GetInstanceWithStorageMetadata(
                    instance,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(instance, StorageVersionMetadata.Empty));

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
                    steps: [CreateStep(CommitProcessState.Key, PersistentItemStatus.Completed)]
                ),
            ]);

        var instanceClient = new Mock<IInstanceClientWithStorageMetadata>(MockBehavior.Strict);
        instanceClient
            .Setup(c =>
                c.GetInstanceWithStorageMetadata(
                    instance,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(instance, StorageVersionMetadata.Empty));

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
            Mock.Of<IInstanceClientWithStorageMetadata>(),
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
            Mock.Of<IInstanceClientWithStorageMetadata>(),
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
            Mock.Of<IInstanceClientWithStorageMetadata>(),
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
            Mock.Of<IInstanceClientWithStorageMetadata>(),
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
            Mock.Of<IInstanceClientWithStorageMetadata>(),
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
                        CreateStep(CommitProcessState.Key, PersistentItemStatus.Completed),
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

        var instanceClient = new Mock<IInstanceClientWithStorageMetadata>(MockBehavior.Strict);
        instanceClient
            .Setup(c =>
                c.GetInstanceWithStorageMetadata(
                    instance,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(instance, new StorageVersionMetadata()));

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
                        CreateStep(CommitProcessState.Key, PersistentItemStatus.Completed),
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

        var instanceClient = new Mock<IInstanceClientWithStorageMetadata>(MockBehavior.Strict);
        instanceClient
            .Setup(c =>
                c.GetInstanceWithStorageMetadata(
                    instance,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(instance, new StorageVersionMetadata()));

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
            Mock.Of<IInstanceClientWithStorageMetadata>(),
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
            Mock.Of<IInstanceClientWithStorageMetadata>(),
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
    public void BuildWorkflowFailure_DoesNotClassifyFailureAfterAcquireAsAcquireConflict()
    {
        Guid workflowId = Guid.NewGuid();
        WorkflowStatusResponse workflow = CreateFailedWorkflow(
            workflowId,
            CommitProcessState.Key,
            processingOrder: 1,
            httpStatusCode: (int)HttpStatusCode.Conflict,
            wasRetryable: false,
            precedingCompletedAcquire: true
        );

        WorkflowFailure? failure = WorkflowEngineService.BuildWorkflowFailure([workflow]);

        Assert.Equal(WorkflowFailureKind.StepFailed, failure?.Kind);
        Assert.Equal("resumeWorkflow", failure?.RetryAction);
        Assert.Equal(workflowId, failure?.RetryTargetWorkflowId);
    }

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

    private static WorkflowStatusResponse CreateFailedWorkflow(
        Guid workflowId,
        string failedOperationId,
        int processingOrder,
        int? httpStatusCode,
        bool wasRetryable,
        bool precedingCompletedAcquire = false,
        bool includeAcquireConcurrencyCode = true
    )
    {
        var steps = new List<StepStatusResponse>();
        if (precedingCompletedAcquire)
        {
            steps.Add(
                new StepStatusResponse
                {
                    DatabaseId = Guid.NewGuid(),
                    OperationId = AcquireProcessingStatus.Key,
                    ProcessingOrder = 0,
                    Command = new StepStatusResponse.CommandDetails { Type = "app" },
                    Status = PersistentItemStatus.Completed,
                    RetryCount = 0,
                }
            );
        }

        steps.Add(
            new StepStatusResponse
            {
                DatabaseId = Guid.NewGuid(),
                OperationId = failedOperationId,
                ProcessingOrder = processingOrder,
                Command = new StepStatusResponse.CommandDetails { Type = "app" },
                Status = PersistentItemStatus.Failed,
                RetryCount = 0,
                ErrorHistory =
                [
                    new ErrorEntry(
                        DateTimeOffset.UtcNow,
                        failedOperationId == AcquireProcessingStatus.Key && includeAcquireConcurrencyCode
                            ? "AppCommand failed with client error Conflict: "
                                + "{\"workflowFailureCode\":\"acquireConcurrencyConflict\","
                                + "\"detail\":\"Refresh and retry.\"}"
                            : "Workflow callback failed.",
                        httpStatusCode,
                        wasRetryable
                    ),
                ],
            }
        );

        return new WorkflowStatusResponse
        {
            DatabaseId = workflowId,
            OperationId = "Process next",
            IdempotencyKey = "process-next-key",
            Namespace = Namespace,
            CollectionKey = Guid.NewGuid().ToString(),
            CreatedAt = DateTimeOffset.UtcNow,
            OverallStatus = PersistentItemStatus.Failed,
            Steps = steps,
        };
    }

    private static WorkflowEngineService CreateService(
        Mock<IWorkflowEngineClient> client,
        IInstanceClientWithStorageMetadata instanceClient,
        Authenticated? authentication = null,
        TimeProvider? timeProvider = null
    ) =>
        new(
            CreateRequestFactory(authentication),
            client.Object,
            instanceClient,
            new AppIdentifier(Org, App),
            timeProvider ?? TimeProvider.System
        );

    private static ProcessNextRequestFactory CreateRequestFactory(Authenticated? currentAuthentication = null)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        ServiceProvider serviceProvider = services.BuildServiceProvider();
        var authentication = new Mock<IAuthenticationContext>(MockBehavior.Strict);
        authentication
            .SetupGet(context => context.Current)
            .Returns(currentAuthentication ?? TestAuthentication.GetUserAuthentication());
        var callbackTokenGenerator = new Mock<IWorkflowCallbackTokenGenerator>(MockBehavior.Strict);
        callbackTokenGenerator.Setup(generator => generator.GenerateToken(It.IsAny<Guid>())).Returns("callback-token");
        AppImplementationFactory appImplementationFactory =
            serviceProvider.GetRequiredService<AppImplementationFactory>();
        return new ProcessNextRequestFactory(
            appImplementationFactory,
            authentication.Object,
            new AppIdentifier(Org, App),
            Options.Create(new AppSettings()),
            callbackTokenGenerator.Object,
            new ProcessStepOptionsResolver([], appImplementationFactory)
        );
    }

    private static Instance CreateInstance(Guid instanceGuid) =>
        new()
        {
            Id = $"1337/{instanceGuid}",
            AppId = Namespace,
            Org = Org,
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState
            {
                StartEvent = "StartEvent_1",
                CurrentTask = new ProcessElementInfo
                {
                    ElementId = "Task_1",
                    AltinnTaskType = "data",
                    Flow = 2,
                },
            },
            Data = [],
        };

    private static ProcessStateChange CreateProcessStateChange(Instance instance) =>
        new()
        {
            OldProcessState = instance.Process,
            NewProcessState = new ProcessState
            {
                StartEvent = instance.Process?.StartEvent,
                CurrentTask = new ProcessElementInfo
                {
                    ElementId = "Task_2",
                    AltinnTaskType = "confirmation",
                    Flow = 3,
                },
            },
            Events = [],
        };
}
