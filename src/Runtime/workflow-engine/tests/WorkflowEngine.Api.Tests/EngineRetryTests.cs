using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using WorkflowEngine.Api.Tests.Fixtures;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Api.Tests;

public class EngineRetryTests : IDisposable
{
    private readonly ServiceProvider _serviceProvider;
    private readonly Mock<IEngineRepository> _repoMock;
    private readonly Engine _engine;

    public EngineRetryTests()
    {
        _repoMock = new Mock<IEngineRepository>();

        EngineSettings engineSettings = new()
        {
            QueueCapacity = 10,
            MaxDegreeOfParallelism = 5,
            DefaultStepCommandTimeout = TimeSpan.FromSeconds(30),
            DefaultStepRetryStrategy = RetryStrategy.None(),
            DatabaseCommandTimeout = TimeSpan.FromSeconds(10),
            DatabaseRetryStrategy = RetryStrategy.None(),
            MaxConcurrentDbOperations = 5,
            MaxConcurrentHttpCalls = 5,
        };

        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton(Options.Create(engineSettings));
        services.AddSingleton<IConcurrencyLimiter>(
            new ConcurrencyLimiter(engineSettings.MaxConcurrentDbOperations, engineSettings.MaxConcurrentHttpCalls)
        );
        services.AddScoped<IEngineRepository>(_ => _repoMock.Object);
        services.AddSingleton<IWorkflowExecutor>(_ => new Mock<IWorkflowExecutor>().Object);

        _serviceProvider = services.BuildServiceProvider();
        _engine = new Engine(_serviceProvider);
    }

    [Fact]
    public async Task RetryWorkflow_FailedWorkflow_ResetsStepsAndAddsToInbox()
    {
        // Arrange
        await _engine.Start();
        DateTimeOffset createdAt = DateTimeOffset.UtcNow.AddMinutes(-5);
        string idempotencyKey = "test-retry-key";

        var workflow = new Workflow
        {
            IdempotencyKey = idempotencyKey,
            OperationId = "test-op",
            Status = PersistentItemStatus.Failed,
            CreatedAt = createdAt,
            Actor = WorkflowEngineTestFixture.DefaultActor,
            InstanceInformation = WorkflowEngineTestFixture.DefaultInstanceInformation,
            Steps =
            [
                new Step
                {
                    IdempotencyKey = "step-0",
                    OperationId = "step-0-op",
                    ProcessingOrder = 0,
                    Command = new Command.Debug.Noop(),
                    Actor = WorkflowEngineTestFixture.DefaultActor,
                    Status = PersistentItemStatus.Completed,
                },
                new Step
                {
                    IdempotencyKey = "step-1",
                    OperationId = "step-1-op",
                    ProcessingOrder = 1,
                    Command = new Command.Debug.Noop(),
                    Actor = WorkflowEngineTestFixture.DefaultActor,
                    Status = PersistentItemStatus.Failed,
                    LastError = "404 Not Found",
                    RequeueCount = 3,
                    BackoffUntil = DateTimeOffset.UtcNow.AddMinutes(10),
                },
            ],
        };

        _repoMock
            .Setup(r => r.GetWorkflow(idempotencyKey, createdAt, It.IsAny<CancellationToken>()))
            .ReturnsAsync(workflow);

        // Act
        EngineResponse result = await _engine.RetryWorkflow(idempotencyKey, createdAt);

        // Assert
        Assert.IsType<EngineResponse.Accepted>(result);
        Assert.True(_engine.HasDuplicateWorkflow(idempotencyKey));
        Assert.Equal(PersistentItemStatus.Enqueued, workflow.Status);

        // Step 0 (Completed) should be untouched
        Assert.Equal(PersistentItemStatus.Completed, workflow.Steps[0].Status);

        // Step 1 (Failed) should be reset
        Assert.Equal(PersistentItemStatus.Enqueued, workflow.Steps[1].Status);
        Assert.Null(workflow.Steps[1].BackoffUntil);
        Assert.Null(workflow.Steps[1].LastError);
        Assert.Equal(0, workflow.Steps[1].RequeueCount);

        _repoMock.Verify(
            r =>
                r.BatchUpdateWorkflowAndSteps(
                    workflow,
                    It.IsAny<IReadOnlyList<Step>>(),
                    true,
                    true,
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task RetryWorkflow_NotFound_ReturnsNotFound()
    {
        // Arrange
        await _engine.Start();
        DateTimeOffset createdAt = DateTimeOffset.UtcNow;
        string idempotencyKey = "nonexistent-key";

        _repoMock
            .Setup(r => r.GetWorkflow(idempotencyKey, createdAt, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Workflow?)null);

        // Act
        EngineResponse result = await _engine.RetryWorkflow(idempotencyKey, createdAt);

        // Assert
        EngineResponse.Rejected rejected = Assert.IsType<EngineResponse.Rejected>(result);
        Assert.Equal(EngineResponse.Rejection.NotFound, rejected.Reason);
    }

    [Fact]
    public async Task RetryWorkflow_CompletedWorkflow_ReturnsInvalid()
    {
        // Arrange
        await _engine.Start();
        DateTimeOffset createdAt = DateTimeOffset.UtcNow;
        string idempotencyKey = "completed-key";

        var workflow = new Workflow
        {
            IdempotencyKey = idempotencyKey,
            OperationId = "test-op",
            Status = PersistentItemStatus.Completed,
            CreatedAt = createdAt,
            Actor = WorkflowEngineTestFixture.DefaultActor,
            InstanceInformation = WorkflowEngineTestFixture.DefaultInstanceInformation,
            Steps = [],
        };

        _repoMock
            .Setup(r => r.GetWorkflow(idempotencyKey, createdAt, It.IsAny<CancellationToken>()))
            .ReturnsAsync(workflow);

        // Act
        EngineResponse result = await _engine.RetryWorkflow(idempotencyKey, createdAt);

        // Assert
        EngineResponse.Rejected rejected = Assert.IsType<EngineResponse.Rejected>(result);
        Assert.Equal(EngineResponse.Rejection.Invalid, rejected.Reason);
        Assert.Contains("Completed", rejected.Message);
    }

    [Fact]
    public async Task RetryWorkflow_AlreadyInInbox_ReturnsDuplicate()
    {
        // Arrange
        await _engine.Start();
        DateTimeOffset createdAt = DateTimeOffset.UtcNow;
        string idempotencyKey = "duplicate-key";

        // First: enqueue a workflow to put it in the inbox
        var request = new EngineRequest(
            IdempotencyKey: idempotencyKey,
            OperationId: "test-op",
            Actor: WorkflowEngineTestFixture.DefaultActor,
            InstanceInformation: WorkflowEngineTestFixture.DefaultInstanceInformation,
            CreatedAt: createdAt,
            StartAt: null,
            Steps: [new StepRequest { Command = new Command.Debug.Noop() }]
        );

        var inboxWorkflow = new Workflow
        {
            IdempotencyKey = idempotencyKey,
            OperationId = "test-op",
            Actor = WorkflowEngineTestFixture.DefaultActor,
            InstanceInformation = WorkflowEngineTestFixture.DefaultInstanceInformation,
            Steps =
            [
                new Step
                {
                    IdempotencyKey = $"{idempotencyKey}/Noop",
                    OperationId = "Noop",
                    ProcessingOrder = 0,
                    Command = new Command.Debug.Noop(),
                    Actor = WorkflowEngineTestFixture.DefaultActor,
                },
            ],
        };

        _repoMock
            .Setup(r => r.AddWorkflow(It.IsAny<EngineRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(inboxWorkflow);

        await _engine.EnqueueWorkflow(request);

        // Act
        EngineResponse result = await _engine.RetryWorkflow(idempotencyKey, createdAt);

        // Assert
        EngineResponse.Rejected rejected = Assert.IsType<EngineResponse.Rejected>(result);
        Assert.Equal(EngineResponse.Rejection.Duplicate, rejected.Reason);
    }

    public void Dispose()
    {
        _engine.Stop().GetAwaiter().GetResult();
        _engine.Dispose();
        _serviceProvider.Dispose();
    }
}
