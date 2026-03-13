using Microsoft.AspNetCore.Http.HttpResults;
using Moq;
using WorkflowEngine.Api.Endpoints;
using WorkflowEngine.Api.Tests.Fixtures;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;

namespace WorkflowEngine.Api.Tests.Endpoints;

public class EngineEndpointTests
{
    private static readonly Guid DefaultCorrelationId = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc");

    private static WorkflowEnqueueRequest _defaultWorkflowRequest =>
        new()
        {
            CorrelationId = DefaultCorrelationId,
            Org = "ttd",
            App = "test-app",
            InstanceOwnerPartyId = 12345,
            InstanceGuid = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            IdempotencyKey = "default-idempotency-key",
            Workflows =
            [
                new WorkflowRequest
                {
                    OperationId = "op-1",
                    Steps = [new StepRequest { Command = new Command.Webhook("/test") }],
                },
            ],
        };

    // === EnqueueWorkflows Handler Tests ===

    [Fact]
    public async Task Enqueue_Accepted_ReturnsOkWithRefMap()
    {
        // Arrange
        var workflowId = Guid.NewGuid();
        var engineMock = new Mock<IEngine>();
        engineMock
            .Setup(e =>
                e.EnqueueWorkflow(
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<WorkflowRequestMetadata>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                WorkflowEnqueueResponse.Accept([
                    new WorkflowEnqueueResponse.WorkflowResult { Ref = "wf-1", DatabaseId = workflowId },
                ])
            );

        // Act
        var result = await EngineRequestHandlers.EnqueueWorkflows(
            _defaultWorkflowRequest,
            engineMock.Object,
            TimeProvider.System,
            CancellationToken.None
        );

        // Assert
        var ok = Assert.IsType<Ok<WorkflowEnqueueResponse.Accepted>>(result.Result);
        Assert.NotNull(ok.Value);
        Assert.Single(ok.Value.Workflows);
        Assert.Equal("wf-1", ok.Value.Workflows[0].Ref);
        Assert.Equal(workflowId, ok.Value.Workflows[0].DatabaseId);
    }

    [Fact]
    public async Task Enqueue_Duplicate_Returns409()
    {
        // Arrange
        var engineMock = new Mock<IEngine>();
        engineMock
            .Setup(e =>
                e.EnqueueWorkflow(
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<WorkflowRequestMetadata>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(WorkflowEnqueueResponse.Reject(WorkflowEnqueueResponse.Rejection.Duplicate));

        // Act
        var result = await EngineRequestHandlers.EnqueueWorkflows(
            _defaultWorkflowRequest,
            engineMock.Object,
            TimeProvider.System,
            CancellationToken.None
        );

        // Assert
        var problem = Assert.IsType<ProblemHttpResult>(result.Result);
        Assert.Equal(409, problem.StatusCode);
    }

    [Fact]
    public async Task Enqueue_Invalid_Returns400()
    {
        // Arrange
        var engineMock = new Mock<IEngine>();
        engineMock
            .Setup(e =>
                e.EnqueueWorkflow(
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<WorkflowRequestMetadata>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(WorkflowEnqueueResponse.Reject(WorkflowEnqueueResponse.Rejection.Invalid));

        // Act
        var result = await EngineRequestHandlers.EnqueueWorkflows(
            _defaultWorkflowRequest,
            engineMock.Object,
            TimeProvider.System,
            CancellationToken.None
        );

        // Assert
        var problem = Assert.IsType<ProblemHttpResult>(result.Result);
        Assert.Equal(400, problem.StatusCode);
    }

    [Fact]
    public async Task Enqueue_InvalidGraphCycle_Returns400()
    {
        // Arrange — create a request with a dependency cycle
        var request = new WorkflowEnqueueRequest
        {
            CorrelationId = DefaultCorrelationId,
            Org = "ttd",
            App = "test-app",
            InstanceOwnerPartyId = 12345,
            InstanceGuid = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            IdempotencyKey = "cycle-key",
            Workflows =
            [
                new WorkflowRequest
                {
                    Ref = "wf-a",
                    OperationId = "op-a",
                    DependsOn = [WorkflowRef.FromRefString("wf-b")],
                    Steps = [new StepRequest { Command = new Command.Webhook("/test-a") }],
                },
                new WorkflowRequest
                {
                    Ref = "wf-b",
                    OperationId = "op-b",
                    DependsOn = [WorkflowRef.FromRefString("wf-a")],
                    Steps = [new StepRequest { Command = new Command.Webhook("/test-b") }],
                },
            ],
        };

        var engineMock = new Mock<IEngine>();
        engineMock
            .Setup(e =>
                e.EnqueueWorkflow(
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<WorkflowRequestMetadata>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(WorkflowEnqueueResponse.Reject(WorkflowEnqueueResponse.Rejection.Invalid));

        // Act
        var result = await EngineRequestHandlers.EnqueueWorkflows(
            request,
            engineMock.Object,
            TimeProvider.System,
            CancellationToken.None
        );

        // Assert
        var problem = Assert.IsType<ProblemHttpResult>(result.Result);
        Assert.Equal(400, problem.StatusCode);
    }

    [Fact]
    public async Task Enqueue_AppCommandWithoutLockToken_Returns400()
    {
        // Arrange — request contains an AppCommand step but no LockToken
        var request = new WorkflowEnqueueRequest
        {
            CorrelationId = DefaultCorrelationId,
            Org = "ttd",
            App = "test-app",
            InstanceOwnerPartyId = 12345,
            InstanceGuid = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            IdempotencyKey = "lock-test-key",
            LockToken = null,
            Workflows =
            [
                new WorkflowRequest
                {
                    Ref = "wf-1",
                    OperationId = "op-1",
                    Steps = [new StepRequest { Command = new Command.AppCommand("do-something") }],
                },
            ],
        };

        var engineMock = new Mock<IEngine>();

        // Act
        var result = await EngineRequestHandlers.EnqueueWorkflows(
            request,
            engineMock.Object,
            TimeProvider.System,
            CancellationToken.None
        );

        // Assert — rejected before the engine is even called
        var problem = Assert.IsType<ProblemHttpResult>(result.Result);
        Assert.Equal(400, problem.StatusCode);
        engineMock.Verify(
            e =>
                e.EnqueueWorkflow(
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<WorkflowRequestMetadata>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task Enqueue_AppCommandWithLockToken_ProceedsToEngine()
    {
        // Arrange — AppCommand step with a LockToken present should reach the engine
        var request = new WorkflowEnqueueRequest
        {
            CorrelationId = DefaultCorrelationId,
            Org = "ttd",
            App = "test-app",
            InstanceOwnerPartyId = 12345,
            InstanceGuid = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            IdempotencyKey = "lock-test-key",
            LockToken = "some-lock-token",
            Workflows =
            [
                new WorkflowRequest
                {
                    Ref = "wf-1",
                    OperationId = "op-1",
                    Steps = [new StepRequest { Command = new Command.AppCommand("do-something") }],
                },
            ],
        };

        var engineMock = new Mock<IEngine>();
        engineMock
            .Setup(e =>
                e.EnqueueWorkflow(
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<WorkflowRequestMetadata>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                WorkflowEnqueueResponse.Accept([
                    new WorkflowEnqueueResponse.WorkflowResult { Ref = "wf-1", DatabaseId = Guid.NewGuid() },
                ])
            );

        // Act
        var result = await EngineRequestHandlers.EnqueueWorkflows(
            request,
            engineMock.Object,
            TimeProvider.System,
            CancellationToken.None
        );

        // Assert — engine was called and returned 200
        engineMock.Verify(
            e =>
                e.EnqueueWorkflow(
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<WorkflowRequestMetadata>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        Assert.IsType<Ok<WorkflowEnqueueResponse.Accepted>>(result.Result);
    }

    [Fact]
    public async Task Enqueue_MetadataIsBuiltFromRequestBody()
    {
        // Arrange — capture the metadata passed to the engine to verify it was built correctly
        WorkflowRequestMetadata? capturedMetadata = null;
        var engineMock = new Mock<IEngine>();
        engineMock
            .Setup(e =>
                e.EnqueueWorkflow(
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<WorkflowRequestMetadata>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<WorkflowEnqueueRequest, WorkflowRequestMetadata, CancellationToken>(
                (_, meta, _) => capturedMetadata = meta
            )
            .ReturnsAsync(
                WorkflowEnqueueResponse.Accept([
                    new WorkflowEnqueueResponse.WorkflowResult { Ref = "wf-1", DatabaseId = Guid.NewGuid() },
                ])
            );

        // Act
        await EngineRequestHandlers.EnqueueWorkflows(
            _defaultWorkflowRequest,
            engineMock.Object,
            TimeProvider.System,
            CancellationToken.None
        );

        // Assert
        Assert.NotNull(capturedMetadata);
        Assert.Equal(_defaultWorkflowRequest.CorrelationId, capturedMetadata.CorrelationId);
        Assert.Equal(_defaultWorkflowRequest.Org, capturedMetadata.InstanceInformation.Org);
        Assert.Equal(_defaultWorkflowRequest.App, capturedMetadata.InstanceInformation.App);
        Assert.Equal(
            _defaultWorkflowRequest.InstanceOwnerPartyId,
            capturedMetadata.InstanceInformation.InstanceOwnerPartyId
        );
        Assert.Equal(_defaultWorkflowRequest.InstanceGuid, capturedMetadata.InstanceInformation.InstanceGuid);
        Assert.Equal(_defaultWorkflowRequest.Actor.UserIdOrOrgNumber, capturedMetadata.Actor.UserIdOrOrgNumber);
        Assert.Equal(_defaultWorkflowRequest.LockToken, capturedMetadata.InstanceLockKey);
    }

    // === ListActiveWorkflows Handler Tests ===

    [Fact]
    public async Task ListWorkflows_HasActiveWorkflows_ReturnsOk()
    {
        // Arrange
        var step = WorkflowEngineTestFixture.CreateStep(new Command.Debug.Noop());
        var workflow = WorkflowEngineTestFixture.CreateWorkflow(step);

        var repositoryMock = new Mock<IEngineRepository>();
        repositoryMock
            .Setup(r =>
                r.GetActiveWorkflowsByCorrelationId(
                    It.IsAny<Guid?>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([workflow]);

        // Act
        var result = await EngineRequestHandlers.ListActiveWorkflows(
            DefaultCorrelationId,
            null,
            repositoryMock.Object,
            CancellationToken.None
        );

        // Assert
        var ok = Assert.IsType<Ok<IEnumerable<WorkflowStatusResponse>>>(result.Result);
        Assert.NotNull(ok.Value);
        var workflows = ok.Value.ToList();
        Assert.Single(workflows);
        Assert.Equal(PersistentItemStatus.Enqueued, workflows[0].OverallStatus);
    }

    [Fact]
    public async Task ListWorkflows_NoWorkflows_ReturnsNoContent()
    {
        // Arrange
        var repositoryMock = new Mock<IEngineRepository>();
        repositoryMock
            .Setup(r =>
                r.GetActiveWorkflowsByCorrelationId(
                    It.IsAny<Guid?>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([]);

        // Act
        var result = await EngineRequestHandlers.ListActiveWorkflows(
            DefaultCorrelationId,
            null,
            repositoryMock.Object,
            CancellationToken.None
        );

        // Assert
        Assert.IsType<NoContent>(result.Result);
    }

    [Fact]
    public async Task ListWorkflows_UsesCorrelationId()
    {
        // Arrange
        Guid? capturedGuid = null;
        var repositoryMock = new Mock<IEngineRepository>();
        repositoryMock
            .Setup(r =>
                r.GetActiveWorkflowsByCorrelationId(
                    It.IsAny<Guid?>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<Guid?, string?, CancellationToken>((guid, _, _) => capturedGuid = guid)
            .ReturnsAsync([]);

        // Act
        await EngineRequestHandlers.ListActiveWorkflows(
            DefaultCorrelationId,
            null,
            repositoryMock.Object,
            CancellationToken.None
        );

        // Assert
        Assert.Equal(DefaultCorrelationId, capturedGuid);
    }

    // === GetWorkflow Handler Tests ===

    [Fact]
    public async Task GetWorkflow_Found_ReturnsOk()
    {
        // Arrange
        var step = WorkflowEngineTestFixture.CreateStep(new Command.Debug.Noop());
        var workflow = new Workflow
        {
            CorrelationId = DefaultCorrelationId,
            OperationId = "test-op",
            IdempotencyKey = "wf-key",
            Namespace = "default",
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            InstanceInformation = new InstanceInformation
            {
                Org = "ttd",
                App = "test-app",
                InstanceOwnerPartyId = 12345,
                InstanceGuid = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            },
            Steps = [step],
        };

        var workflowGuid = Guid.NewGuid();
        var repositoryMock = new Mock<IEngineRepository>();
        repositoryMock.Setup(r => r.GetWorkflow(workflowGuid, It.IsAny<CancellationToken>())).ReturnsAsync(workflow);

        // Act
        var result = await EngineRequestHandlers.GetWorkflow(
            workflowGuid,
            repositoryMock.Object,
            CancellationToken.None
        );

        // Assert
        var ok = Assert.IsType<Ok<WorkflowStatusResponse>>(result.Result);
        Assert.NotNull(ok.Value);
        Assert.Equal(PersistentItemStatus.Enqueued, ok.Value.OverallStatus);
        Assert.Single(ok.Value.Steps);
    }

    [Fact]
    public async Task GetWorkflow_NotFound_Returns404()
    {
        // Arrange
        var repositoryMock = new Mock<IEngineRepository>();
        repositoryMock
            .Setup(r => r.GetWorkflow(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Workflow?)null);

        // Act
        var result = await EngineRequestHandlers.GetWorkflow(
            Guid.NewGuid(),
            repositoryMock.Object,
            CancellationToken.None
        );

        // Assert
        Assert.IsType<NotFound>(result.Result);
    }
}
