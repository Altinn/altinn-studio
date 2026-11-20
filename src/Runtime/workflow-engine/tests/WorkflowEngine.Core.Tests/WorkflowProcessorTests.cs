using System.Collections.Concurrent;
using System.Diagnostics;
using System.Runtime.CompilerServices;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Data.Services;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;

namespace WorkflowEngine.Core.Tests;

/// <summary>
/// How <see cref="WorkflowProcessor"/> ends a workflow's worker, whatever ends its handling.
/// </summary>
public sealed class WorkflowProcessorTests
{
    private static readonly TimeSpan _timeout = TimeSpan.FromSeconds(10);

    [Fact]
    public async Task HandlerCannotBeResolved_ProcessorLogsIt_ReleasesSlotAndSignalsLoop()
    {
        var failure = new InvalidOperationException("handler unavailable");
        using var unobserved = new UnobservedTaskExceptions();
        await using var harness = ProcessorHarness.Create(services =>
            services.AddScoped<WorkflowHandler>(_ => throw failure)
        );
        var signaled = harness.Signal.Wait(CancellationToken.None);

        await harness.Processor.StartAsync(TestContext.Current.CancellationToken);
        await harness.Limiter.FirstRelease.WaitAsync(_timeout, TestContext.Current.CancellationToken);

        var errorLog = Assert.Single(harness.Logs.Entries, e => e.Level >= LogLevel.Error);
        Assert.Same(failure, errorLog.Exception);
        Assert.Equal(LogLevel.Error, errorLog.Level);
        Assert.Equal(typeof(WorkflowProcessor).FullName, errorLog.Category);
        await signaled.WaitAsync(_timeout, TestContext.Current.CancellationToken);
        Assert.Equal(0, harness.Limiter.WorkerSlotStatus.Used);
        Assert.True(harness.Tracker.IsEmpty);

        await harness.Processor.StopAsync(TestContext.Current.CancellationToken);
        Assert.DoesNotContain<Exception>(failure, unobserved.Collect());
    }

    [Fact]
    public async Task WriteBackFailsInsideHandler_OnlyHandlerLogsIt_ReleasesSlotAndSignalsLoop()
    {
        var failure = new TimeoutException("final write-back failed");
        var buffer = ProcessorHarness.SucceedingBuffer();
        buffer
            .Setup(b =>
                b.Submit(
                    It.Is<Workflow>(w => w.Status == PersistentItemStatus.Completed),
                    It.IsAny<CancellationToken>(),
                    It.IsAny<IReadOnlyList<Step>?>(),
                    It.IsAny<string?>(),
                    It.IsAny<Activity?>()
                )
            )
            .ThrowsAsync(failure);
        using var unobserved = new UnobservedTaskExceptions();
        await using var harness = ProcessorHarness.Create(services => services.AddSingleton(buffer.Object));
        var signaled = harness.Signal.Wait(CancellationToken.None);

        await harness.Processor.StartAsync(TestContext.Current.CancellationToken);
        await harness.Limiter.FirstRelease.WaitAsync(_timeout, TestContext.Current.CancellationToken);

        Assert.Equal(PersistentItemStatus.Completed, harness.Workflow.Status);
        var errorLog = Assert.Single(harness.Logs.Entries, e => e.Level >= LogLevel.Error);
        Assert.Same(failure, errorLog.Exception);
        Assert.Equal(typeof(WorkflowHandler).FullName, errorLog.Category);
        await signaled.WaitAsync(_timeout, TestContext.Current.CancellationToken);
        Assert.Equal(0, harness.Limiter.WorkerSlotStatus.Used);
        Assert.True(harness.Tracker.IsEmpty);

        await harness.Processor.StopAsync(TestContext.Current.CancellationToken);
        Assert.DoesNotContain<Exception>(failure, unobserved.Collect());
    }

    [Fact]
    public async Task ShutdownCancelsHandler_NoErrorLogged_ReleasesSlot()
    {
        // The handler rethrows its own cancellation, which the worker expects
        var executing = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var executor = new Mock<IWorkflowExecutor>();
        executor
            .Setup(e => e.Execute(It.IsAny<Workflow>(), It.IsAny<Step>(), It.IsAny<CancellationToken>()))
            .Returns(
                async (Workflow _, Step _, CancellationToken ct) =>
                {
                    executing.TrySetResult();
                    await Task.Delay(Timeout.InfiniteTimeSpan, ct);
                    return ExecutionResult.Success();
                }
            );
        await using var harness = ProcessorHarness.Create(services => services.AddSingleton(executor.Object));

        await harness.Processor.StartAsync(TestContext.Current.CancellationToken);
        await executing.Task.WaitAsync(_timeout, TestContext.Current.CancellationToken);
        await harness.Processor.StopAsync(TestContext.Current.CancellationToken);

        Assert.Equal(PersistentItemStatus.Requeued, harness.Workflow.Status);
        Assert.True(harness.Limiter.FirstRelease.IsCompletedSuccessfully);
        Assert.True(harness.Tracker.IsEmpty);
        Assert.DoesNotContain(harness.Logs.Entries, e => e.Level >= LogLevel.Error);
    }

    /// <summary>
    /// A processor over real DI that fetches <see cref="Workflow"/> once; its handler succeeds unless a test
    /// replaces a service.
    /// </summary>
    private sealed class ProcessorHarness : IAsyncDisposable
    {
        private static readonly EngineSettings _settings = new()
        {
            DefaultStepCommandTimeout = TimeSpan.FromSeconds(30),
            MaxStepCommandTimeout = TimeSpan.FromHours(2),
            DefaultStepRetryStrategy = RetryStrategy.None(),
            DatabaseCommandTimeout = TimeSpan.FromSeconds(10),
            DatabaseRetryStrategy = RetryStrategy.None(),
            MetricsCollectionInterval = TimeSpan.FromSeconds(5),
            MaxWorkflowsPerRequest = 100,
            MaxStepsPerWorkflow = 50,
            MaxLabels = 50,
            HeartbeatInterval = TimeSpan.FromSeconds(3),
            StaleWorkflowThreshold = TimeSpan.FromSeconds(15),
            MaxReclaimCount = 3,
            Concurrency = new ConcurrencySettings
            {
                MaxWorkers = 2,
                MaxDbOperations = 2,
                MaxHttpCalls = 2,
            },
        };

        private readonly ServiceProvider _services;

        private ProcessorHarness(ServiceProvider services, Workflow workflow)
        {
            _services = services;
            Workflow = workflow;
        }

        public Workflow Workflow { get; }

        public WorkflowProcessor Processor => _services.GetRequiredService<WorkflowProcessor>();

        public AsyncSignal Signal => _services.GetRequiredService<AsyncSignal>();

        public ObservedLimiter Limiter => _services.GetRequiredService<ObservedLimiter>();

        public InFlightTracker Tracker => _services.GetRequiredService<InFlightTracker>();

        public TraceCapturingLoggerProvider Logs => _services.GetRequiredService<TraceCapturingLoggerProvider>();

        public static ProcessorHarness Create(Action<IServiceCollection> configure)
        {
            var workflow = new Workflow
            {
                OperationId = "test-op",
                IdempotencyKey = "test-key",
                Namespace = "test-ns",
                Context = JsonSerializer.SerializeToElement(new { }),
                Status = PersistentItemStatus.Processing,
                Steps =
                [
                    new Step
                    {
                        OperationId = "step",
                        ProcessingOrder = 0,
                        Command = CommandDefinition.Create("webhook"),
                    },
                ],
            };

            var fetches = new ConcurrentQueue<List<Workflow>>([
                [workflow],
            ]);
            var repository = new Mock<IEngineRepository>();
            repository
                .Setup(r => r.FetchAndLockWorkflows(It.IsAny<int>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(() => fetches.TryDequeue(out var batch) ? batch : []);

            var executor = new Mock<IWorkflowExecutor>();
            executor
                .Setup(e => e.Execute(It.IsAny<Workflow>(), It.IsAny<Step>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(ExecutionResult.Success());

            var services = new ServiceCollection();
            services.AddLogging();
            services.AddSingleton<TraceCapturingLoggerProvider>();
            services.AddSingleton<ILoggerProvider>(sp => sp.GetRequiredService<TraceCapturingLoggerProvider>());
            services.AddSingleton(Options.Create(_settings));
            services.AddSingleton(TimeProvider.System);
            services.AddSingleton(repository.Object);
            services.AddSingleton(executor.Object);
            services.AddSingleton(SucceedingBuffer().Object);
            services.AddSingleton<IThrottleStateView>(new NoTrippedBreakers());
            services.AddSingleton(Mock.Of<IEngineStatus>());
            services.AddSingleton<AsyncSignal>();
            services.AddSingleton<InFlightTracker>();
            services.AddSingleton(_ => new ObservedLimiter(_settings.Concurrency.MaxWorkers));
            services.AddSingleton<IConcurrencyLimiter>(sp => sp.GetRequiredService<ObservedLimiter>());
            services.AddScoped<WorkflowHandler>();
            services.AddSingleton<WorkflowProcessor>();
            configure(services);

            return new ProcessorHarness(services.BuildServiceProvider(), workflow);
        }

        public static Mock<IWorkflowUpdateBuffer> SucceedingBuffer()
        {
            var buffer = new Mock<IWorkflowUpdateBuffer>();
            buffer
                .Setup(b =>
                    b.Submit(
                        It.IsAny<Workflow>(),
                        It.IsAny<CancellationToken>(),
                        It.IsAny<IReadOnlyList<Step>?>(),
                        It.IsAny<string?>(),
                        It.IsAny<Activity?>()
                    )
                )
                .Returns(Task.CompletedTask);
            return buffer;
        }

        public async ValueTask DisposeAsync() => await _services.DisposeAsync();
    }

    private sealed class NoTrippedBreakers : IThrottleStateView
    {
        public IReadOnlyDictionary<string, TimeSpan> TrippedBreakers { get; } =
            new Dictionary<string, TimeSpan>(StringComparer.Ordinal);
    }

    /// <summary>
    /// The real limiter, observed: releasing the slot is the last thing a worker does before it signals the loop.
    /// </summary>
    private sealed class ObservedLimiter(int maxWorkers) : IConcurrencyLimiter, IDisposable
    {
        private readonly ConcurrencyLimiter _inner = new(maxWorkers, maxWorkers, maxWorkers);
        private readonly TaskCompletionSource _released = new(TaskCreationOptions.RunContinuationsAsynchronously);

        public Task FirstRelease => _released.Task;

        public ConcurrencyLimiter.SlotStatus DbSlotStatus => _inner.DbSlotStatus;

        public ConcurrencyLimiter.SlotStatus HttpSlotStatus => _inner.HttpSlotStatus;

        public ConcurrencyLimiter.SlotStatus WorkerSlotStatus => _inner.WorkerSlotStatus;

        public Task<IDisposable> AcquireDbSlot(
            ActivityContext? parentContext = null,
            CancellationToken cancellationToken = default
        ) => _inner.AcquireDbSlot(parentContext, cancellationToken);

        public Task<IDisposable> AcquireHttpSlot(
            ActivityContext? parentContext = null,
            CancellationToken cancellationToken = default
        ) => _inner.AcquireHttpSlot(parentContext, cancellationToken);

        public Task AcquireWorkerSlot(CancellationToken cancellationToken = default) =>
            _inner.AcquireWorkerSlot(cancellationToken);

        public void ReleaseWorkerSlot()
        {
            _inner.ReleaseWorkerSlot();
            _released.TrySetResult();
        }

        public void Dispose() => _inner.Dispose();
    }

    /// <summary>
    /// Watches <see cref="TaskScheduler.UnobservedTaskException"/> from construction, so no collection is missed.
    /// </summary>
    private sealed class UnobservedTaskExceptions : IDisposable
    {
        private readonly ConcurrentQueue<Exception> _exceptions = [];
        private readonly Exception _canary = new InvalidOperationException("canary");

        public UnobservedTaskExceptions() => TaskScheduler.UnobservedTaskException += OnUnobserved;

        /// <summary>
        /// Forces a collection and returns the unobserved exceptions, once a dropped canary proves they are reported.
        /// </summary>
        public IReadOnlyList<Exception> Collect()
        {
            DropFaultedTask(_canary);
#pragma warning disable S1215 // Only a forced collection makes the finalizer report an unobserved task while the test runs
            GC.Collect();
            GC.WaitForPendingFinalizers();
            GC.Collect();
#pragma warning restore S1215
            Exception[] exceptions = [.. _exceptions];
            Assert.Contains(_canary, exceptions);
            return [.. exceptions.Where(e => !ReferenceEquals(e, _canary))];
        }

        public void Dispose() => TaskScheduler.UnobservedTaskException -= OnUnobserved;

        [MethodImpl(MethodImplOptions.NoInlining)]
        private static void DropFaultedTask(Exception exception) => _ = Task.FromException(exception);

        private void OnUnobserved(object? sender, UnobservedTaskExceptionEventArgs e)
        {
            foreach (var exception in e.Exception.InnerExceptions)
            {
                _exceptions.Enqueue(exception);
            }
        }
    }
}
