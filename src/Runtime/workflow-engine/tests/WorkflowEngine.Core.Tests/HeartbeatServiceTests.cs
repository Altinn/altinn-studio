using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Core.Tests;

[Collection("BackgroundServiceTests")]
public class HeartbeatServiceTests
{
    // Safety timeout for TCS gate awaits — generous, catches truly stuck tests without racing
    // the happy path. A real sweep fires within ~50ms (HeartbeatInterval from DefaultSettings).
    private static readonly TimeSpan GateTimeout = TimeSpan.FromSeconds(5);

    private static Workflow DummyWorkflow() =>
        new()
        {
            OperationId = "heartbeat-test",
            IdempotencyKey = "heartbeat-test-key",
            Namespace = "test-ns",
            Steps = [],
            LeaseToken = Guid.NewGuid(),
        };

    private static EngineSettings DefaultSettings(TimeSpan? heartbeatInterval = null) =>
        new()
        {
            DefaultStepCommandTimeout = TimeSpan.FromSeconds(30),
            DefaultStepRetryStrategy = RetryStrategy.None(),
            DatabaseCommandTimeout = TimeSpan.FromSeconds(10),
            DatabaseRetryStrategy = RetryStrategy.None(),
            MetricsCollectionInterval = TimeSpan.FromSeconds(5),
            MaxWorkflowsPerRequest = 100,
            MaxStepsPerWorkflow = 50,
            MaxLabels = 50,
            HeartbeatInterval = heartbeatInterval ?? TimeSpan.FromMilliseconds(50),
            StaleWorkflowThreshold = TimeSpan.FromSeconds(15),
            MaxReclaimCount = 3,
            Concurrency = new()
            {
                MaxWorkers = 5,
                MaxDbOperations = 5,
                MaxHttpCalls = 5,
            },
        };

    [Fact]
    public async Task HeartbeatService_CallsBatchUpdateHeartbeats_AfterInterval()
    {
        var tracker = new InFlightTracker(TimeProvider.System);
        var repo = new Mock<IEngineRepository>();
        var settings = Options.Create(DefaultSettings());

        var sweepFired = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        repo.Setup(r =>
                r.BatchUpdateHeartbeats(
                    It.IsAny<IReadOnlyList<(Guid WorkflowId, Guid LeaseToken)>>(),
                    It.IsAny<TimeSpan>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback(() => sweepFired.TrySetResult())
            .Returns(Task.CompletedTask);

        using var service = new HeartbeatService(
            tracker,
            repo.Object,
            settings,
            TimeProvider.System,
            NullLogger<HeartbeatService>.Instance
        );

        var id1 = Guid.NewGuid();
        var id2 = Guid.NewGuid();
        using var cts1 = new CancellationTokenSource();
        using var cts2 = new CancellationTokenSource();
        tracker.TryAdd(id1, cts1, DummyWorkflow());
        tracker.TryAdd(id2, cts2, DummyWorkflow());

        using var cts = new CancellationTokenSource();
        await service.StartAsync(cts.Token);

        try
        {
            // Wait on a concrete signal from the mock instead of a wall-clock guess.
            await sweepFired.Task.WaitAsync(GateTimeout, TestContext.Current.CancellationToken);

            repo.Verify(
                r =>
                    r.BatchUpdateHeartbeats(
                        It.Is<IReadOnlyList<(Guid WorkflowId, Guid LeaseToken)>>(ids => ids.Count == 2),
                        It.IsAny<TimeSpan>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.AtLeastOnce
            );
        }
        finally
        {
            await cts.CancelAsync();
            tracker.Remove(id1);
            tracker.Remove(id2);
            using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await service.StopAsync(stopCts.Token);
        }
    }

    [Fact]
    public async Task HeartbeatService_ContinuesAfterStoppingToken_UntilTrackerEmpty()
    {
        var tracker = new InFlightTracker(TimeProvider.System);
        var repo = new Mock<IEngineRepository>();
        var settings = Options.Create(DefaultSettings());

        var preCancelSweep = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var postCancelSweep = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        repo.Setup(r =>
                r.BatchUpdateHeartbeats(
                    It.IsAny<IReadOnlyList<(Guid WorkflowId, Guid LeaseToken)>>(),
                    It.IsAny<TimeSpan>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback(() =>
            {
                // First invocation completes preCancelSweep; subsequent invocations feed postCancelSweep.
                if (!preCancelSweep.TrySetResult())
                    postCancelSweep.TrySetResult();
            })
            .Returns(Task.CompletedTask);

        using var service = new HeartbeatService(
            tracker,
            repo.Object,
            settings,
            TimeProvider.System,
            NullLogger<HeartbeatService>.Instance
        );

        var id = Guid.NewGuid();
        using var workflowCts = new CancellationTokenSource();
        tracker.TryAdd(id, workflowCts, DummyWorkflow());

        using var cts = new CancellationTokenSource();
        await service.StartAsync(cts.Token);

        try
        {
            // Gate on the first sweep firing before we signal shutdown.
            await preCancelSweep.Task.WaitAsync(GateTimeout, TestContext.Current.CancellationToken);

            await cts.CancelAsync();
            repo.Invocations.Clear();

            // Gate on the next sweep — the service must keep running because the tracker isn't empty.
            await postCancelSweep.Task.WaitAsync(GateTimeout, TestContext.Current.CancellationToken);

            repo.Verify(
                r =>
                    r.BatchUpdateHeartbeats(
                        It.IsAny<IReadOnlyList<(Guid WorkflowId, Guid LeaseToken)>>(),
                        It.IsAny<TimeSpan>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.AtLeastOnce
            );
        }
        finally
        {
            await cts.CancelAsync();
            tracker.Remove(id);
            using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await service.StopAsync(stopCts.Token);
        }
    }

    [Fact]
    public async Task HeartbeatService_SkipsDbCall_WhenTrackerEmpty()
    {
        var tracker = new InFlightTracker(TimeProvider.System);
        var repo = new Mock<IEngineRepository>();
        var settings = Options.Create(DefaultSettings());
        using var service = new HeartbeatService(
            tracker,
            repo.Object,
            settings,
            TimeProvider.System,
            NullLogger<HeartbeatService>.Instance
        );

        using var cts = new CancellationTokenSource();
        await service.StartAsync(cts.Token);

        try
        {
            // With an empty tracker the mock must never be called. Wait long enough to cover
            // several HeartbeatInterval cycles (50ms each), then assert Never. Absence tests
            // can't be gated on a signal that should never fire, but the assertion itself is
            // deterministic: any call made during the window would fail the Verify.
            await Task.Delay(200, TestContext.Current.CancellationToken);

            repo.Verify(
                r =>
                    r.BatchUpdateHeartbeats(
                        It.IsAny<IReadOnlyList<(Guid WorkflowId, Guid LeaseToken)>>(),
                        It.IsAny<TimeSpan>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
        }
        finally
        {
            await cts.CancelAsync();
            using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await service.StopAsync(stopCts.Token);
        }
    }

    [Fact]
    public async Task HeartbeatService_SurvivesExceptions()
    {
        var tracker = new InFlightTracker(TimeProvider.System);
        var repo = new Mock<IEngineRepository>();
        var settings = Options.Create(DefaultSettings());
        using var service = new HeartbeatService(
            tracker,
            repo.Object,
            settings,
            TimeProvider.System,
            NullLogger<HeartbeatService>.Instance
        );

        var id = Guid.NewGuid();
        using var workflowCts = new CancellationTokenSource();
        tracker.TryAdd(id, workflowCts, DummyWorkflow());

        var firstCall = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var secondCall = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var callCount = 0;
        repo.Setup(r =>
                r.BatchUpdateHeartbeats(
                    It.IsAny<IReadOnlyList<(Guid WorkflowId, Guid LeaseToken)>>(),
                    It.IsAny<TimeSpan>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns<IReadOnlyList<(Guid, Guid)>, TimeSpan, CancellationToken>(
                (_, _, _) =>
                {
                    var count = Interlocked.Increment(ref callCount);
                    if (count == 1)
                    {
                        firstCall.TrySetResult();
                        throw new InvalidOperationException("Transient DB error");
                    }
                    secondCall.TrySetResult();
                    return Task.CompletedTask;
                }
            );

        using var cts = new CancellationTokenSource();
        await service.StartAsync(cts.Token);

        try
        {
            // First sweep throws inside the mock. Service must swallow and continue.
            await firstCall.Task.WaitAsync(GateTimeout, TestContext.Current.CancellationToken);
            // Second sweep confirms the service is still running.
            await secondCall.Task.WaitAsync(GateTimeout, TestContext.Current.CancellationToken);

            Assert.True(callCount >= 2, $"Expected at least 2 calls but got {callCount}");
        }
        finally
        {
            await cts.CancelAsync();
            tracker.Remove(id);
            using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await service.StopAsync(stopCts.Token);
        }
    }
}
