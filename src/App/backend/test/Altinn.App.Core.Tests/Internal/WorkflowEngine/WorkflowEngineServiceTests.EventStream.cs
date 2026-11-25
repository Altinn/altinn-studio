using System.Globalization;
using System.Net;
using System.Runtime.CompilerServices;
using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Logging.Testing;
using Microsoft.Extensions.Time.Testing;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

public partial class WorkflowEngineServiceTests
{
    public enum StreamFault
    {
        NotServed,
        AtCapacity,
        Unreachable,
        BreaksMidStream,
        EndsUnsettled,
        SilentFromTheStart,
        SilentAfterTheFirstEvent,
    }

    [Fact]
    public async Task ResumeAndWaitForWorkflow_OnCompletedHeads_SucceedsWithoutListing()
    {
        // Arrange
        var wait = ArrangeWait(PersistentItemStatus.Completed);
        wait.StreamsSnapshots(PersistentItemStatus.Processing, PersistentItemStatus.Completed);

        // Act
        ProcessNextWorkflowResult result = await wait.Run();

        // Assert
        Assert.Null(result.Failure);
        Assert.False(result.Parked);
        wait.VerifyListed(Times.Never());
    }

    [Theory]
    [InlineData(nameof(PersistentItemStatus.Failed))]
    [InlineData(nameof(PersistentItemStatus.Canceled))]
    [InlineData(nameof(PersistentItemStatus.DependencyFailed))]
    [InlineData(nameof(PersistentItemStatus.Abandoned))]
    public async Task ResumeAndWaitForWorkflow_OnAnUnsuccessfulHead_ReportsTheListedChainsFailure(string status)
    {
        // Arrange
        var headStatus = Enum.Parse<PersistentItemStatus>(status);
        var wait = ArrangeWait(headStatus);
        wait.StreamsSnapshots(headStatus);

        // Act
        ProcessNextWorkflowResult result = await wait.Run();

        // Assert
        Assert.NotNull(result.Failure);
        Assert.Equal(
            JsonSerializer.Serialize(WorkflowEngineService.BuildWorkflowFailure(wait.Chain)),
            JsonSerializer.Serialize(result.Failure.WorkflowFailure)
        );
        wait.VerifyListed(Times.Once());
    }

    [Fact]
    public async Task ResumeAndWaitForWorkflow_WhenTheListShowsTheChainActiveAfterASettledSnapshot_OpensTheStreamAgain()
    {
        // Arrange: the list is read after the heads, and a resume came in between
        var wait = ArrangeWait(PersistentItemStatus.Failed);
        wait.Client.SetupSequence(c =>
                c.ListWorkflows(
                    Namespace,
                    wait.CollectionKey,
                    It.IsAny<Dictionary<string, string>?>(),
                    It.IsAny<IReadOnlyList<PersistentItemStatus>?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([wait.Chain[0] with { OverallStatus = PersistentItemStatus.Processing }])
            .ReturnsAsync(wait.Chain);
        wait.StreamsSnapshots(PersistentItemStatus.Failed);

        // Act
        ProcessNextWorkflowResult result = await wait.Run();

        // Assert
        Assert.Equal(WorkflowFailureKind.StepFailed, result.Failure?.WorkflowFailure.Kind);
        wait.Client.Verify(
            c => c.StreamCollectionEvents(Namespace, wait.CollectionKey, It.IsAny<CancellationToken>()),
            Times.Exactly(2)
        );
    }

    [Fact]
    public async Task ResumeAndWaitForWorkflow_OnAHeldHeadWhileTheSegmentBeforeItRuns_KeepsWaiting()
    {
        // Arrange: a receive workflow is Held from its enqueue, and heads the chain while the segment before it
        // finishes its last step
        var wait = ArrangeWait(PersistentItemStatus.Completed);
        WorkflowStatusResponse receiver = CreateWorkflowStatus(
            wait.Chain[0].CreatedAt.AddSeconds(1),
            PersistentItemStatus.Held,
            steps: [CreateStep(ExecuteServiceTask.Key, PersistentItemStatus.Enqueued)]
        );
        wait.Client.SetupSequence(c =>
                c.ListWorkflows(
                    Namespace,
                    wait.CollectionKey,
                    It.IsAny<Dictionary<string, string>?>(),
                    It.IsAny<IReadOnlyList<PersistentItemStatus>?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([wait.Chain[0] with { OverallStatus = PersistentItemStatus.Processing }, receiver])
            .ReturnsAsync([wait.Chain[0], receiver]);
        wait.StreamsSnapshots(PersistentItemStatus.Held, PersistentItemStatus.Held);

        // Act
        ProcessNextWorkflowResult result = await wait.Run();

        // Assert
        Assert.True(result.Parked);
        wait.VerifyListed(Times.Exactly(2));
    }

    [Fact]
    public async Task ResumeAndWaitForWorkflow_WhenDecidingASnapshotFails_FailsWithoutOpeningTheStreamAgain()
    {
        // Arrange
        var wait = ArrangeWait(PersistentItemStatus.Failed);
        wait.StreamsSnapshots(PersistentItemStatus.Failed);
        wait.Client.Setup(c =>
                c.ListWorkflows(
                    Namespace,
                    wait.CollectionKey,
                    It.IsAny<Dictionary<string, string>?>(),
                    It.IsAny<IReadOnlyList<PersistentItemStatus>?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new HttpRequestException("Server error", null, HttpStatusCode.InternalServerError));

        // Act
        var exception = await Assert.ThrowsAsync<HttpRequestException>(() => wait.Run());

        // Assert
        Assert.Equal(HttpStatusCode.InternalServerError, exception.StatusCode);
        wait.Client.Verify(
            c => c.StreamCollectionEvents(Namespace, wait.CollectionKey, It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Theory]
    [InlineData(StreamFault.NotServed)]
    [InlineData(StreamFault.AtCapacity)]
    [InlineData(StreamFault.Unreachable)]
    [InlineData(StreamFault.BreaksMidStream)]
    [InlineData(StreamFault.EndsUnsettled)]
    [InlineData(StreamFault.SilentFromTheStart)]
    [InlineData(StreamFault.SilentAfterTheFirstEvent)]
    public async Task ResumeAndWaitForWorkflow_WhenAStreamAttemptFails_OpensTheStreamAgain(StreamFault fault)
    {
        // Arrange
        var wait = ArrangeWait(PersistentItemStatus.Failed);
        ProcessNextWorkflowResult decidedOnTheFirstAttempt = await wait.StreamsSnapshots(PersistentItemStatus.Failed)
            .Run();
        wait.Client.Invocations.Clear();
        int attempts = 0;
        wait.Client.Setup(c => c.StreamCollectionEvents(Namespace, wait.CollectionKey, It.IsAny<CancellationToken>()))
            .Returns(
                (string _, string _, CancellationToken ct) =>
                    ++attempts == 1
                        ? FaultyStream(fault, wait.CollectionKey, wait.WorkflowId, ct)
                        : new[] { wait.Snapshot(PersistentItemStatus.Failed) }.ToAsyncEnumerable()
            );

        // Act
        ProcessNextWorkflowResult decidedOnTheSecondAttempt = await wait.Run();

        // Assert
        Assert.Equal(2, attempts);
        Assert.Equal(
            JsonSerializer.Serialize(decidedOnTheFirstAttempt),
            JsonSerializer.Serialize(decidedOnTheSecondAttempt)
        );
    }

    [Theory]
    [InlineData(14, 1)]
    [InlineData(16, 2)]
    public async Task ResumeAndWaitForWorkflow_BetweenEvents_OpensTheStreamAgainOnlyAfterFifteenSilentSeconds(
        int silentSeconds,
        int attempts
    )
    {
        // Arrange
        var wait = ArrangeWait(PersistentItemStatus.Completed);
        int opened = 0;
        wait.Client.Setup(c => c.StreamCollectionEvents(Namespace, wait.CollectionKey, It.IsAny<CancellationToken>()))
            .Returns(
                (string _, string _, CancellationToken ct) =>
                    ++opened == 1
                        ? SettlesAfter(TimeSpan.FromSeconds(silentSeconds), ct)
                        : new[] { wait.Snapshot(PersistentItemStatus.Completed) }.ToAsyncEnumerable()
            );

        // Act
        ProcessNextWorkflowResult result = await wait.Run();

        // Assert
        Assert.Null(result.Failure);
        Assert.Equal(attempts, opened);

        async IAsyncEnumerable<WorkflowCollectionDetailResponse> SettlesAfter(
            TimeSpan silence,
            [EnumeratorCancellation] CancellationToken cancellationToken
        )
        {
            yield return wait.Snapshot(PersistentItemStatus.Processing);
            await Task.Delay(silence, wait.Time, cancellationToken);
            yield return wait.Snapshot(PersistentItemStatus.Completed);
        }
    }

    [Fact]
    public async Task ResumeAndWaitForWorkflow_WhileAttemptsAreRefused_BacksOffDoublingToAJitteredCap()
    {
        // Arrange: eight refusals, then a settled stream
        var time = new TimeSkippingTimeProvider();
        var wait = ArrangeWait(PersistentItemStatus.Completed, time);
        var attemptedAt = new List<DateTimeOffset>();
        wait.Client.Setup(c => c.StreamCollectionEvents(Namespace, wait.CollectionKey, It.IsAny<CancellationToken>()))
            .Returns(
                (string _, string _, CancellationToken ct) =>
                {
                    attemptedAt.Add(time.GetUtcNow());
                    return attemptedAt.Count == 9
                        ? new[] { wait.Snapshot(PersistentItemStatus.Completed) }.ToAsyncEnumerable()
                        : FaultyStream(StreamFault.AtCapacity, wait.CollectionKey, wait.WorkflowId, ct);
                }
            );

        // Act
        ProcessNextWorkflowResult result = await wait
            .Service.ResumeAndWaitForWorkflow(wait.Instance, wait.WorkflowId)
            .WaitAsync(TimeSpan.FromSeconds(10));

        // Assert
        Assert.Null(result.Failure);
        TimeSpan[] delays = [.. attemptedAt.Zip(attemptedAt.Skip(1), (earlier, later) => later - earlier)];
        int[] ceilingsMs = [100, 200, 400, 800, 1_600, 2_000, 2_000, 2_000];
        Assert.Equal(ceilingsMs.Length, delays.Length);
        for (int i = 0; i < delays.Length; i++)
        {
            Assert.InRange(
                delays[i],
                TimeSpan.FromMilliseconds(ceilingsMs[i] / 2.0),
                TimeSpan.FromMilliseconds(ceilingsMs[i])
            );
        }
        Assert.True(delays[5..].Distinct().Count() > 1, "Delays at the cap carry no jitter");
    }

    [Fact]
    public async Task ResumeAndWaitForWorkflow_AfterAnAttemptThatSentASnapshot_StartsTheBackoffOver()
    {
        // Arrange: three refusals, a stream that sends a snapshot and breaks, then a settled stream
        var time = new TimeSkippingTimeProvider();
        var wait = ArrangeWait(PersistentItemStatus.Completed, time);
        var attemptedAt = new List<DateTimeOffset>();
        wait.Client.Setup(c => c.StreamCollectionEvents(Namespace, wait.CollectionKey, It.IsAny<CancellationToken>()))
            .Returns(
                (string _, string _, CancellationToken ct) =>
                {
                    attemptedAt.Add(time.GetUtcNow());
                    return attemptedAt.Count switch
                    {
                        4 => FaultyStream(StreamFault.BreaksMidStream, wait.CollectionKey, wait.WorkflowId, ct),
                        5 => new[] { wait.Snapshot(PersistentItemStatus.Completed) }.ToAsyncEnumerable(),
                        _ => FaultyStream(StreamFault.AtCapacity, wait.CollectionKey, wait.WorkflowId, ct),
                    };
                }
            );

        // Act
        await wait.Service.ResumeAndWaitForWorkflow(wait.Instance, wait.WorkflowId).WaitAsync(TimeSpan.FromSeconds(10));

        // Assert: the doubling backoff would have reached 800 ms
        Assert.InRange(attemptedAt[4] - attemptedAt[3], TimeSpan.FromMilliseconds(50), TimeSpan.FromMilliseconds(100));
    }

    [Theory]
    [InlineData(StreamFault.AtCapacity)]
    [InlineData(StreamFault.EndsUnsettled)]
    public async Task ResumeAndWaitForWorkflow_WhileEveryAttemptFails_EndsAtTheBudgetWithTheTimeoutResult(
        StreamFault fault
    )
    {
        // Arrange
        var time = new TimeSkippingTimeProvider();
        var wait = ArrangeWait(PersistentItemStatus.Processing, time);
        wait.Service.WorkflowWaitTimeoutMs = 8_000;
        wait.Client.Setup(c => c.StreamCollectionEvents(Namespace, wait.CollectionKey, It.IsAny<CancellationToken>()))
            .Returns(
                (string _, string _, CancellationToken ct) =>
                    FaultyStream(fault, wait.CollectionKey, wait.WorkflowId, ct)
            );
        DateTimeOffset startedAt = time.GetUtcNow();

        // Act
        ProcessNextWorkflowResult result = await wait
            .Service.ResumeAndWaitForWorkflow(wait.Instance, wait.WorkflowId)
            .WaitAsync(TimeSpan.FromSeconds(10));

        // Assert
        Assert.Equal(WorkflowFailureKind.Timeout, result.Failure?.WorkflowFailure.Kind);
        Assert.True(result.Failure?.ProcessStateCommitted);
        Assert.Equal(TimeSpan.FromSeconds(8), time.GetUtcNow() - startedAt);
        wait.Client.Verify(
            c => c.StreamCollectionEvents(Namespace, wait.CollectionKey, It.IsAny<CancellationToken>()),
            Times.AtLeast(5)
        );
    }

    [Theory]
    [InlineData(StreamFault.AtCapacity)]
    [InlineData(StreamFault.SilentFromTheStart)]
    public async Task ResumeAndWaitForWorkflow_WhenTheCallerCancels_EndsAtOnce(StreamFault fault)
    {
        // Arrange: a clock that never moves, so a refused wait stays in its delay and a silent one in its attempt
        var wait = ArrangeWait(PersistentItemStatus.Completed);
        var attempted = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        wait.Client.Setup(c => c.StreamCollectionEvents(Namespace, wait.CollectionKey, It.IsAny<CancellationToken>()))
            .Returns(
                (string _, string _, CancellationToken ct) =>
                {
                    attempted.TrySetResult();
                    return FaultyStream(fault, wait.CollectionKey, wait.WorkflowId, ct);
                }
            );
        using var cancellation = new CancellationTokenSource();
        Task<ProcessNextWorkflowResult> waiting = wait.Service.ResumeAndWaitForWorkflow(
            wait.Instance,
            wait.WorkflowId,
            cancellation.Token
        );
        await attempted.Task.WaitAsync(TimeSpan.FromSeconds(10));
        await Task.Delay(50);

        // Act
        await cancellation.CancelAsync();

        // Assert
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => waiting.WaitAsync(TimeSpan.FromSeconds(5)));
        wait.Client.Verify(
            c => c.StreamCollectionEvents(Namespace, wait.CollectionKey, It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Theory]
    [InlineData(true, LogLevel.Information)]
    [InlineData(false, LogLevel.Warning)]
    public async Task ResumeAndWaitForWorkflow_WithFailedAttempts_LogsOneLineWithTheirCounts(
        bool decided,
        LogLevel level
    )
    {
        // Arrange: refusals, then a settled stream unless every attempt is refused until the time limit
        var logger = new FakeLogger<WorkflowEngineService>();
        var time = new TimeSkippingTimeProvider();
        var wait = ArrangeWait(PersistentItemStatus.Completed, time, logger);
        wait.Service.WorkflowWaitTimeoutMs = 8_000;
        int refused = 0;
        wait.Client.Setup(c => c.StreamCollectionEvents(Namespace, wait.CollectionKey, It.IsAny<CancellationToken>()))
            .Returns(
                (string _, string _, CancellationToken ct) =>
                {
                    if (decided && refused == 2)
                        return new[] { wait.Snapshot(PersistentItemStatus.Completed) }.ToAsyncEnumerable();

                    refused++;
                    return FaultyStream(StreamFault.AtCapacity, wait.CollectionKey, wait.WorkflowId, ct);
                }
            );

        // Act
        await wait.Service.ResumeAndWaitForWorkflow(wait.Instance, wait.WorkflowId).WaitAsync(TimeSpan.FromSeconds(10));

        // Assert
        FakeLogRecord record = Assert.Single(logger.Collector.GetSnapshot(), record => record.Level > LogLevel.Debug);
        Assert.Equal(level, record.Level);
        Assert.Equal(
            refused.ToString(CultureInfo.InvariantCulture),
            record.StructuredState!.Single(pair => pair.Key == "Refused").Value
        );
    }

    /// <summary>
    /// A resume wait on one workflow whose chain, once the wait lists it, has <paramref name="chainStatus"/> and a
    /// committed process state.
    /// </summary>
    private static EventStreamWait ArrangeWait(
        PersistentItemStatus chainStatus,
        TimeProvider? timeProvider = null,
        ILogger<WorkflowEngineService>? logger = null
    )
    {
        Guid workflowId = Guid.NewGuid();
        Instance instance = CreateInstance(Guid.NewGuid());
        string collectionKey = new InstanceIdentifier(instance).InstanceGuid.ToString();
        IReadOnlyList<WorkflowStatusResponse> chain =
        [
            CreateWorkflowStatus(
                DateTimeOffset.UtcNow,
                chainStatus,
                databaseId: workflowId,
                steps:
                [
                    CreateStep(CommitProcessState.Key, PersistentItemStatus.Completed),
                    CreateStep(ExecuteServiceTask.Key, chainStatus),
                ]
            ),
        ];

        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        client
            .Setup(c => c.ResumeWorkflow(Namespace, workflowId, true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResumeWorkflowResponse(workflowId, DateTimeOffset.UtcNow, []));
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
            .ReturnsAsync(chain);

        var instanceClient = new Mock<IInstanceClientWithStorageMetadata>(MockBehavior.Strict);
        instanceClient
            .Setup(c =>
                c.GetInstanceWithStorageMetadata(
                    instance,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(instance, new StorageVersionMetadata(2, 1)));

        var time = timeProvider ?? new FakeTimeProvider(DateTimeOffset.UtcNow);
        var service = new WorkflowEngineService(
            processNextRequestFactory: null!,
            client.Object,
            instanceClient.Object,
            new AppIdentifier(Org, App),
            logger ?? NullLogger<WorkflowEngineService>.Instance,
            time
        );

        return new EventStreamWait(client, service, instance, workflowId, collectionKey, chain, time);
    }

    private sealed record EventStreamWait(
        Mock<IWorkflowEngineClient> Client,
        WorkflowEngineService Service,
        Instance Instance,
        Guid WorkflowId,
        string CollectionKey,
        IReadOnlyList<WorkflowStatusResponse> Chain,
        TimeProvider Time
    )
    {
        /// <summary>One attempt's events, a snapshot per status, after which the stream ends.</summary>
        public EventStreamWait StreamsSnapshots(params PersistentItemStatus[] headStatuses)
        {
            Client
                .Setup(c => c.StreamCollectionEvents(Namespace, CollectionKey, It.IsAny<CancellationToken>()))
                .Returns(headStatuses.Select(Snapshot).ToAsyncEnumerable());
            return this;
        }

        /// <summary>The engine's snapshot of the collection with its one head at <paramref name="headStatus"/>.</summary>
        public WorkflowCollectionDetailResponse Snapshot(PersistentItemStatus headStatus) =>
            CreateCollection(CollectionKey, WorkflowId, headStatus);

        public void VerifyListed(Times times) =>
            Client.Verify(
                c =>
                    c.ListWorkflows(
                        Namespace,
                        CollectionKey,
                        It.IsAny<Dictionary<string, string>?>(),
                        It.IsAny<IReadOnlyList<PersistentItemStatus>?>(),
                        It.IsAny<CancellationToken>()
                    ),
                times
            );

        /// <summary>
        /// Runs the wait, moving a fake clock on a second at a time so that silence limits and retry delays elapse.
        /// </summary>
        public async Task<ProcessNextWorkflowResult> Run()
        {
            Task<ProcessNextWorkflowResult> wait = Service.ResumeAndWaitForWorkflow(Instance, WorkflowId);
            for (int second = 0; !wait.IsCompleted && second < 60; second++)
            {
                await Task.Delay(20);
                (Time as FakeTimeProvider)?.Advance(TimeSpan.FromSeconds(1));
            }

            return await wait.WaitAsync(TimeSpan.FromSeconds(10));
        }
    }

    private static async IAsyncEnumerable<WorkflowCollectionDetailResponse> FaultyStream(
        StreamFault fault,
        string collectionKey,
        Guid workflowId,
        [EnumeratorCancellation] CancellationToken cancellationToken
    )
    {
        switch (fault)
        {
            case StreamFault.NotServed:
                throw new HttpRequestException("Not found", null, HttpStatusCode.NotFound);
            case StreamFault.AtCapacity:
                throw new HttpRequestException("Too many requests", null, HttpStatusCode.TooManyRequests);
            case StreamFault.Unreachable:
                throw new HttpRequestException("Connection refused");
            case StreamFault.BreaksMidStream:
                yield return CreateCollection(collectionKey, workflowId, PersistentItemStatus.Processing);
                throw new HttpIOException(HttpRequestError.ResponseEnded);
            case StreamFault.EndsUnsettled:
                yield return CreateCollection(collectionKey, workflowId, PersistentItemStatus.Processing);
                yield break;
            case StreamFault.SilentAfterTheFirstEvent:
                yield return CreateCollection(collectionKey, workflowId, PersistentItemStatus.Processing);
                break;
        }

        await Task.Delay(Timeout.Infinite, cancellationToken);
    }
}
