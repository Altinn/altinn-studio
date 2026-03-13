using System.Collections.Concurrent;
using System.Diagnostics.Metrics;
using System.Globalization;
using System.Net.Sockets;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;
using WorkflowEngine.Resilience;
using WorkflowEngine.Resilience.Models;
using WorkflowEngine.Telemetry;

namespace WorkflowEngine.Repository.Tests;

/// <summary>
/// Tests that <see cref="EngineRepository"/>'s <c>ExecuteWithRetry</c> correctly emits
/// telemetry counters (<c>engine.db.operations.success</c>, <c>engine.db.operations.requeued</c>,
/// <c>engine.db.operations.failed</c>) when database operations encounter transient or permanent failures.
/// Uses a <see cref="FaultInjectionInterceptor"/> to simulate real connection issues at the ADO.NET layer.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class DbRetryTelemetryTests(PostgresFixture postgres) : IAsyncLifetime
{
    private readonly FaultInjectionInterceptor _interceptor = new();

    public async ValueTask InitializeAsync() => await postgres.ResetAsync();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    [Fact]
    public async Task TransientFailure_RetriesAndEmitsRequeuedThenSuccess()
    {
        // Arrange — insert a workflow without faults
        var repository = CreateRepositoryWithRetry(maxRetries: 3);

        var workflow = await InsertWorkflow();

        // Arm the interceptor to fail on the first 2 non-query commands, then succeed
        _interceptor.ArmFaults(2, () => new TimeoutException("Simulated transient DB timeout"));

        using var collector = new DbTelemetryCollector();

        // Act — UpdateWorkflow calls ExecuteWithRetry internally
        workflow.Status = PersistentItemStatus.Processing;
        await repository.UpdateWorkflow(workflow, cancellationToken: TestContext.Current.CancellationToken);

        // Assert — 2 transient failures → 2 requeued, then 1 success
        Assert.True(
            collector.GetCounterTotal("engine.db.operations.requeued") >= 2,
            $"Expected at least 2 DbOperationsRequeued, got {collector.GetCounterTotal("engine.db.operations.requeued")}"
        );
        Assert.True(
            collector.GetCounterTotal("engine.db.operations.success") >= 1,
            $"Expected at least 1 DbOperationsSucceeded, got {collector.GetCounterTotal("engine.db.operations.success")}"
        );
        Assert.Equal(0, collector.GetCounterTotal("engine.db.operations.failed"));
    }

    [Fact]
    public async Task PermanentFailure_AbortsAndEmitsFailedCounter()
    {
        // Arrange
        var repository = CreateRepositoryWithRetry(maxRetries: 3);

        var workflow = await InsertWorkflow();

        // Arm with ArgumentException — the error handler classifies this as Abort
        _interceptor.ArmFaults(1, () => new ArgumentException("Simulated permanent DB error"));

        using var collector = new DbTelemetryCollector();

        // Act & Assert — should throw immediately without retrying
        workflow.Status = PersistentItemStatus.Processing;
        await Assert.ThrowsAsync<ArgumentException>(() =>
            repository.UpdateWorkflow(workflow, cancellationToken: TestContext.Current.CancellationToken)
        );

        Assert.True(
            collector.GetCounterTotal("engine.db.operations.failed") >= 1,
            $"Expected at least 1 DbOperationsFailed, got {collector.GetCounterTotal("engine.db.operations.failed")}"
        );
        Assert.Equal(0, collector.GetCounterTotal("engine.db.operations.success"));
    }

    [Fact]
    public async Task ExhaustedRetries_EmitsRequeuedForEachAttempt()
    {
        // Arrange — only 2 retries allowed, but every attempt will fail
        var repository = CreateRepositoryWithRetry(maxRetries: 2);

        var workflow = await InsertWorkflow();

        // Arm with more faults than retries — all attempts will fail
        _interceptor.ArmFaults(10, () => new SocketException());

        using var collector = new DbTelemetryCollector();

        // Act & Assert — should throw after exhausting retries
        workflow.Status = PersistentItemStatus.Processing;
        await Assert.ThrowsAsync<SocketException>(() =>
            repository.UpdateWorkflow(workflow, cancellationToken: TestContext.Current.CancellationToken)
        );

        // Each failed attempt triggers the error handler which increments DbOperationsRequeued
        Assert.True(
            collector.GetCounterTotal("engine.db.operations.requeued") >= 2,
            $"Expected at least 2 DbOperationsRequeued for exhausted retries, got {collector.GetCounterTotal("engine.db.operations.requeued")}"
        );
        Assert.Equal(0, collector.GetCounterTotal("engine.db.operations.success"));
    }

    private async Task<Workflow> InsertWorkflow()
    {
        var repository = postgres.CreateRepository();
        await using var context = postgres.CreateDbContext();
        var (request, metadata) = WorkflowTestHelper.CreateRequest();
        return await WorkflowTestHelper.EnqueueWorkflow(repository, context, request, metadata);
    }

    private EngineRepository CreateRepositoryWithRetry(int maxRetries)
    {
        var retrySettings = Options.Create(
            new EngineSettings
            {
                QueueCapacity = 100,
                MaxDegreeOfParallelism = 10,
                DefaultStepCommandTimeout = TimeSpan.FromSeconds(30),
                DefaultStepRetryStrategy = RetryStrategy.None(),
                DatabaseCommandTimeout = TimeSpan.FromSeconds(30),
                DatabaseRetryStrategy = RetryStrategy.Constant(TimeSpan.FromMilliseconds(10), maxRetries: maxRetries),
                MaxConcurrentDbOperations = 50,
                MaxConcurrentHttpCalls = 50,
            }
        );

        return postgres.CreateRepositoryWithInterceptor(_interceptor, retrySettings);
    }

    /// <summary>
    /// Lightweight meter listener that collects counter measurements from the WorkflowEngine meter.
    /// </summary>
    private sealed class DbTelemetryCollector : IDisposable
    {
        private readonly MeterListener _listener;
        private readonly ConcurrentBag<(string Name, long Value)> _measurements = [];

        public DbTelemetryCollector()
        {
            _listener = new MeterListener();
            _listener.InstrumentPublished = (instrument, listener) =>
            {
                if (instrument.Meter.Name == Metrics.Meter.Name)
                    listener.EnableMeasurementEvents(instrument);
            };
            _listener.SetMeasurementEventCallback<long>(
                (instrument, measurement, _, _) => _measurements.Add((instrument.Name, measurement))
            );
            _listener.Start();
        }

        public long GetCounterTotal(string instrumentName) =>
            _measurements
                .Where(m => m.Name == instrumentName)
                .Sum(m => Convert.ToInt64(m.Value, CultureInfo.InvariantCulture));

        public void Dispose() => _listener.Dispose();
    }
}
