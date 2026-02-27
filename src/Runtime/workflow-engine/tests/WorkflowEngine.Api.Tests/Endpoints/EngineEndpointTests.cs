using Microsoft.AspNetCore.Http.HttpResults;
using Moq;
using WorkflowEngine.Api.Endpoints;
using WorkflowEngine.Api.Tests.Fixtures;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;

namespace WorkflowEngine.Api.Tests.Endpoints;

public class EngineEndpointTests
{
    private static InstanceRouteParams _defaultRouteParams =>
        new()
        {
            Org = "ttd",
            App = "test-app",
            InstanceOwnerPartyId = 12345,
            InstanceGuid = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
        };

    private static WorkflowEnqueueRequest _defaultWorkflowRequest =>
        new()
        {
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            Workflows =
            [
                new WorkflowRequest
                {
                    Ref = "wf-1",
                    OperationId = "op-1",
                    IdempotencyKey = "wf-1-key",
                    Type = WorkflowType.Generic,
                    Steps = [new StepRequest { Command = new Command.Debug.Noop() }],
                },
            ],
        };

    // === EnqueueWorkflows Handler Tests ===

    [Fact]
    public async Task Enqueue_Accepted_ReturnsOkWithRefMap()
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
            .ReturnsAsync(WorkflowEnqueueResponse.Accept(new Dictionary<string, long> { ["wf-1"] = 42L }));

        // Act
        var result = await EngineRequestHandlers.EnqueueWorkflows(
            _defaultRouteParams,
            _defaultWorkflowRequest,
            engineMock.Object,
            TimeProvider.System,
            CancellationToken.None
        );

        // Assert
        var ok = Assert.IsType<Ok<WorkflowEnqueueResponse.Accepted>>(result.Result);
        Assert.NotNull(ok.Value);
        Assert.Single(ok.Value.Workflows);
        Assert.Equal(42L, ok.Value.Workflows["wf-1"]);
    }

    [Fact]
    public async Task Enqueue_RejectedAtCapacity_Returns429()
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
            .ReturnsAsync(WorkflowEnqueueResponse.Reject(WorkflowEnqueueResponse.Rejection.AtCapacity, "Queue full"));

        // Act
        var result = await EngineRequestHandlers.EnqueueWorkflows(
            _defaultRouteParams,
            _defaultWorkflowRequest,
            engineMock.Object,
            TimeProvider.System,
            CancellationToken.None
        );

        // Assert
        var problem = Assert.IsType<ProblemHttpResult>(result.Result);
        Assert.Equal(429, problem.StatusCode);
    }

    [Fact]
    public async Task Enqueue_RejectedUnavailable_Returns503()
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
            .ReturnsAsync(
                WorkflowEnqueueResponse.Reject(WorkflowEnqueueResponse.Rejection.Unavailable, "Engine unavailable")
            );

        // Act
        var result = await EngineRequestHandlers.EnqueueWorkflows(
            _defaultRouteParams,
            _defaultWorkflowRequest,
            engineMock.Object,
            TimeProvider.System,
            CancellationToken.None
        );

        // Assert
        var problem = Assert.IsType<ProblemHttpResult>(result.Result);
        Assert.Equal(503, problem.StatusCode);
    }

    [Fact]
    public async Task Enqueue_RejectedDuplicate_Returns409()
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
            .ReturnsAsync(
                WorkflowEnqueueResponse.Reject(WorkflowEnqueueResponse.Rejection.Duplicate, "Duplicate workflow")
            );

        // Act
        var result = await EngineRequestHandlers.EnqueueWorkflows(
            _defaultRouteParams,
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
    public async Task Enqueue_RejectedConcurrencyViolation_Returns409()
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
            .ReturnsAsync(
                WorkflowEnqueueResponse.Reject(
                    WorkflowEnqueueResponse.Rejection.ConcurrencyViolation,
                    "Concurrency violation"
                )
            );

        // Act
        var result = await EngineRequestHandlers.EnqueueWorkflows(
            _defaultRouteParams,
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
    public async Task Enqueue_RejectedInvalid_Returns400()
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
            .ReturnsAsync(WorkflowEnqueueResponse.Reject(WorkflowEnqueueResponse.Rejection.Invalid, "Invalid request"));

        // Act
        var result = await EngineRequestHandlers.EnqueueWorkflows(
            _defaultRouteParams,
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
    public async Task Enqueue_AppCommandWithoutLockToken_Returns400()
    {
        // Arrange — request contains an AppCommand step but no LockToken
        var request = new WorkflowEnqueueRequest
        {
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            LockToken = null,
            Workflows =
            [
                new WorkflowRequest
                {
                    Ref = "wf-1",
                    OperationId = "op-1",
                    IdempotencyKey = "wf-1-key",
                    Type = WorkflowType.AppProcessChange,
                    Steps = [new StepRequest { Command = new Command.AppCommand("do-something") }],
                },
            ],
        };

        var engineMock = new Mock<IEngine>();

        // Act
        var result = await EngineRequestHandlers.EnqueueWorkflows(
            _defaultRouteParams,
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
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            LockToken = "some-lock-token",
            Workflows =
            [
                new WorkflowRequest
                {
                    Ref = "wf-1",
                    OperationId = "op-1",
                    IdempotencyKey = "wf-1-key",
                    Type = WorkflowType.AppProcessChange,
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
            .ReturnsAsync(WorkflowEnqueueResponse.Accept(new Dictionary<string, long> { ["wf-1"] = 1L }));

        // Act
        var result = await EngineRequestHandlers.EnqueueWorkflows(
            _defaultRouteParams,
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
    public async Task Enqueue_MetadataIsBuiltFromRequestAndRouteParams()
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
            .ReturnsAsync(WorkflowEnqueueResponse.Accept(new Dictionary<string, long> { ["wf-1"] = 1L }));

        // Act
        await EngineRequestHandlers.EnqueueWorkflows(
            _defaultRouteParams,
            _defaultWorkflowRequest,
            engineMock.Object,
            TimeProvider.System,
            CancellationToken.None
        );

        // Assert
        Assert.NotNull(capturedMetadata);
        Assert.Equal(_defaultRouteParams.Org, capturedMetadata.InstanceInformation.Org);
        Assert.Equal(_defaultRouteParams.App, capturedMetadata.InstanceInformation.App);
        Assert.Equal(
            _defaultRouteParams.InstanceOwnerPartyId,
            capturedMetadata.InstanceInformation.InstanceOwnerPartyId
        );
        Assert.Equal(_defaultRouteParams.InstanceGuid, capturedMetadata.InstanceInformation.InstanceGuid);
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
            .Setup(r => r.GetActiveWorkflowsForInstance(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([workflow]);

        // Act
        var result = await EngineRequestHandlers.ListActiveWorkflows(
            _defaultRouteParams,
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
            .Setup(r => r.GetActiveWorkflowsForInstance(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        // Act
        var result = await EngineRequestHandlers.ListActiveWorkflows(
            _defaultRouteParams,
            repositoryMock.Object,
            CancellationToken.None
        );

        // Assert
        Assert.IsType<NoContent>(result.Result);
    }

    [Fact]
    public async Task ListWorkflows_UsesInstanceGuidFromRouteParams()
    {
        // Arrange
        Guid? capturedGuid = null;
        var repositoryMock = new Mock<IEngineRepository>();
        repositoryMock
            .Setup(r => r.GetActiveWorkflowsForInstance(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .Callback<Guid, CancellationToken>((guid, _) => capturedGuid = guid)
            .ReturnsAsync([]);

        // Act
        await EngineRequestHandlers.ListActiveWorkflows(
            _defaultRouteParams,
            repositoryMock.Object,
            CancellationToken.None
        );

        // Assert
        Assert.Equal(_defaultRouteParams.InstanceGuid, capturedGuid);
    }

    // === GetWorkflow Handler Tests ===

    [Fact]
    public async Task GetWorkflow_Found_ReturnsOk()
    {
        // Arrange
        var step = WorkflowEngineTestFixture.CreateStep(new Command.Debug.Noop());
        var workflow = new Workflow
        {
            OperationId = "test-op",
            IdempotencyKey = "wf-key",
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            InstanceInformation = new InstanceInformation
            {
                Org = _defaultRouteParams.Org,
                App = _defaultRouteParams.App,
                InstanceOwnerPartyId = _defaultRouteParams.InstanceOwnerPartyId,
                InstanceGuid = _defaultRouteParams.InstanceGuid,
            },
            Steps = [step],
        };

        var repositoryMock = new Mock<IEngineRepository>();
        repositoryMock.Setup(r => r.GetWorkflow(99L, It.IsAny<CancellationToken>())).ReturnsAsync(workflow);

        // Act
        var result = await EngineRequestHandlers.GetWorkflow(
            _defaultRouteParams,
            99L,
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
            .Setup(r => r.GetWorkflow(It.IsAny<long>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Workflow?)null);

        // Act
        var result = await EngineRequestHandlers.GetWorkflow(
            _defaultRouteParams,
            999L,
            repositoryMock.Object,
            CancellationToken.None
        );

        // Assert
        Assert.IsType<NotFound>(result.Result);
    }

    [Fact]
    public async Task GetWorkflow_WrongInstance_Returns404()
    {
        // Arrange — workflow belongs to a different instance
        var step = WorkflowEngineTestFixture.CreateStep(new Command.Debug.Noop());
        var workflow = new Workflow
        {
            OperationId = "test-op",
            IdempotencyKey = "wf-key",
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            InstanceInformation = new InstanceInformation
            {
                Org = "other-org",
                App = "other-app",
                InstanceOwnerPartyId = 99999,
                InstanceGuid = Guid.NewGuid(), // Different from _defaultRouteParams
            },
            Steps = [step],
        };

        var repositoryMock = new Mock<IEngineRepository>();
        repositoryMock.Setup(r => r.GetWorkflow(99L, It.IsAny<CancellationToken>())).ReturnsAsync(workflow);

        // Act
        var result = await EngineRequestHandlers.GetWorkflow(
            _defaultRouteParams,
            99L,
            repositoryMock.Object,
            CancellationToken.None
        );

        // Assert — cross-instance disclosure prevention
        Assert.IsType<NotFound>(result.Result);
    }

    // === InstanceRouteParams Conversion Tests ===

    [Fact]
    public void InstanceRouteParams_ImplicitConversion_MapsAllFields()
    {
        // Arrange
        var routeParams = new InstanceRouteParams
        {
            Org = "ttd",
            App = "my-app",
            InstanceOwnerPartyId = 99999,
            InstanceGuid = Guid.Parse("11111111-2222-3333-4444-555555555555"),
        };

        // Act
        InstanceInformation info = routeParams;

        // Assert
        Assert.Equal("ttd", info.Org);
        Assert.Equal("my-app", info.App);
        Assert.Equal(99999, info.InstanceOwnerPartyId);
        Assert.Equal(Guid.Parse("11111111-2222-3333-4444-555555555555"), info.InstanceGuid);
    }
}
