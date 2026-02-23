using Microsoft.AspNetCore.Http.HttpResults;
using Moq;
using WorkflowEngine.Api.Endpoints;
using WorkflowEngine.Api.Tests.Fixtures;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;

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

    private static ProcessNextRequest _defaultProcessNextRequest =>
        new()
        {
            CurrentElementId = "Task_1",
            DesiredElementId = "Task_2",
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            LockToken = "test-lock",
            Steps = [new StepRequest { Command = new Command.Debug.Noop() }],
        };

    // === Next Handler Tests ===

    [Fact]
    public async Task Next_Accepted_ReturnsOk()
    {
        // Arrange
        var engineMock = new Mock<IEngine>();
        engineMock
            .Setup(e => e.EnqueueWorkflowOld(It.IsAny<WorkflowEnqueueRequestOld>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(WorkflowEnqueueResponse.Accept(123));

        // Act
        var result = await EngineRequestHandlers.Next(
            _defaultRouteParams,
            _defaultProcessNextRequest,
            engineMock.Object,
            TimeProvider.System,
            CancellationToken.None
        );

        // Assert
        var ok = Assert.IsType<Ok<WorkflowAcceptedResponseDeleteMe>>(result.Result);
        Assert.NotNull(ok.Value);
        Assert.Equal(123, ok.Value.WorkflowId);
    }

    [Fact]
    public async Task Next_RejectedDuplicate_ReturnsNoContent()
    {
        // Arrange
        var engineMock = new Mock<IEngine>();
        engineMock
            .Setup(e => e.EnqueueWorkflowOld(It.IsAny<WorkflowEnqueueRequestOld>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                WorkflowEnqueueResponse.Reject(WorkflowEnqueueResponse.Rejection.Duplicate, "Duplicate workflow")
            );

        // Act
        var result = await EngineRequestHandlers.Next(
            _defaultRouteParams,
            _defaultProcessNextRequest,
            engineMock.Object,
            TimeProvider.System,
            CancellationToken.None
        );

        // Assert
        Assert.IsType<NoContent>(result.Result);
    }

    [Fact]
    public async Task Next_RejectedAtCapacity_Returns429()
    {
        // Arrange
        var engineMock = new Mock<IEngine>();
        engineMock
            .Setup(e => e.EnqueueWorkflowOld(It.IsAny<WorkflowEnqueueRequestOld>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(WorkflowEnqueueResponse.Reject(WorkflowEnqueueResponse.Rejection.AtCapacity, "Queue full"));

        // Act
        var result = await EngineRequestHandlers.Next(
            _defaultRouteParams,
            _defaultProcessNextRequest,
            engineMock.Object,
            TimeProvider.System,
            CancellationToken.None
        );

        // Assert
        var problem = Assert.IsType<ProblemHttpResult>(result.Result);
        Assert.Equal(429, problem.StatusCode);
    }

    [Fact]
    public async Task Next_RejectedUnavailable_Returns503()
    {
        // Arrange
        var engineMock = new Mock<IEngine>();
        engineMock
            .Setup(e => e.EnqueueWorkflowOld(It.IsAny<WorkflowEnqueueRequestOld>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                WorkflowEnqueueResponse.Reject(WorkflowEnqueueResponse.Rejection.Unavailable, "Engine unavailable")
            );

        // Act
        var result = await EngineRequestHandlers.Next(
            _defaultRouteParams,
            _defaultProcessNextRequest,
            engineMock.Object,
            TimeProvider.System,
            CancellationToken.None
        );

        // Assert
        var problem = Assert.IsType<ProblemHttpResult>(result.Result);
        Assert.Equal(503, problem.StatusCode);
    }

    [Fact]
    public async Task Next_RejectedInvalid_Returns400()
    {
        // Arrange
        var engineMock = new Mock<IEngine>();
        engineMock
            .Setup(e => e.EnqueueWorkflowOld(It.IsAny<WorkflowEnqueueRequestOld>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(WorkflowEnqueueResponse.Reject(WorkflowEnqueueResponse.Rejection.Invalid, "Invalid request"));

        // Act
        var result = await EngineRequestHandlers.Next(
            _defaultRouteParams,
            _defaultProcessNextRequest,
            engineMock.Object,
            TimeProvider.System,
            CancellationToken.None
        );

        // Assert
        var problem = Assert.IsType<ProblemHttpResult>(result.Result);
        Assert.Equal(400, problem.StatusCode);
    }

    // === Status Handler Tests ===

    [Fact]
    public void Status_NoActiveWorkflow_ReturnsNoContent()
    {
        // Arrange
        var engineMock = new Mock<IEngine>();
        engineMock.Setup(e => e.GetWorkflowForInstance(It.IsAny<InstanceInformation>())).Returns((Workflow?)null);

        // Act
        var result = EngineRequestHandlers.Status(_defaultRouteParams, engineMock.Object);

        // Assert
        Assert.IsType<NoContent>(result.Result);
    }

    [Fact]
    public void Status_ActiveWorkflow_ReturnsOkWithStatus()
    {
        // Arrange
        var workflow = new Workflow
        {
            OperationId = "test-op",
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            InstanceInformation = WorkflowEngineTestFixture.DefaultInstanceInformation,
            Steps =
            [
                new Step
                {
                    OperationId = "step-op",
                    ProcessingOrder = 0,
                    Command = new Command.Debug.Noop(),
                    Actor = new Actor { UserIdOrOrgNumber = "test-user" },
                },
            ],
        };

        var engineMock = new Mock<IEngine>();
        engineMock.Setup(e => e.GetWorkflowForInstance(It.IsAny<InstanceInformation>())).Returns(workflow);

        // Act
        var result = EngineRequestHandlers.Status(_defaultRouteParams, engineMock.Object);

        // Assert
        var ok = Assert.IsType<Ok<WorkflowStatusResponse>>(result.Result);
        Assert.NotNull(ok.Value);
        Assert.Equal(PersistentItemStatus.Enqueued, ok.Value.OverallStatus);
        Assert.Single(ok.Value.Steps);
        Assert.Equal("step-op", ok.Value.Steps[0].Identifier);
    }

    // === Enqueue Handler Tests ===

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
                    Type = WorkflowType.Generic,
                    Steps = [new StepRequest { Command = new Command.Debug.Noop() }],
                },
            ],
        };

    [Fact]
    public async Task Enqueue_Accepted_ReturnsOkWithRefMap()
    {
        // Arrange
        var engineMock = new Mock<IEngine>();
        engineMock
            .Setup(e =>
                e.EnqueueWorkflow(
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<InstanceInformation>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new WorkflowEnqueueResponseDeleteMe { Workflows = [new BatchWorkflowResult("wf-1", 42L)] });

        // Act
        var result = await EngineRequestHandlers.EnqueueWorkflows(
            _defaultRouteParams,
            _defaultWorkflowRequest,
            engineMock.Object,
            CancellationToken.None
        );

        // Assert
        var ok = Assert.IsType<Ok<WorkflowEnqueueResponseDeleteMe>>(result.Result);
        Assert.NotNull(ok.Value);
        Assert.Single(ok.Value.Workflows);
        Assert.Equal("wf-1", ok.Value.Workflows[0].Ref);
        Assert.Equal(42L, ok.Value.Workflows[0].DatabaseId);
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
                    It.IsAny<InstanceInformation>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new EngineAtCapacityException("Queue full"));

        // Act
        var result = await EngineRequestHandlers.EnqueueWorkflows(
            _defaultRouteParams,
            _defaultWorkflowRequest,
            engineMock.Object,
            CancellationToken.None
        );

        // Assert
        var problem = Assert.IsType<ProblemHttpResult>(result.Result);
        Assert.Equal(429, problem.StatusCode);
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
                    It.IsAny<InstanceInformation>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new ArgumentException("Cycle detected"));

        // Act
        var result = await EngineRequestHandlers.EnqueueWorkflows(
            _defaultRouteParams,
            _defaultWorkflowRequest,
            engineMock.Object,
            CancellationToken.None
        );

        // Assert
        var problem = Assert.IsType<ProblemHttpResult>(result.Result);
        Assert.Equal(400, problem.StatusCode);
    }

    // === ListWorkflows Handler Tests ===

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
        var result = await EngineRequestHandlers.ListWorkflows(
            _defaultRouteParams,
            repositoryMock.Object,
            CancellationToken.None
        );

        // Assert
        var ok = Assert.IsType<Ok<WorkflowListResponse>>(result.Result);
        Assert.NotNull(ok.Value);
        Assert.Single(ok.Value.Workflows);
        Assert.Equal(PersistentItemStatus.Enqueued, ok.Value.Workflows[0].OverallStatus);
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
        var result = await EngineRequestHandlers.ListWorkflows(
            _defaultRouteParams,
            repositoryMock.Object,
            CancellationToken.None
        );

        // Assert
        Assert.IsType<NoContent>(result.Result);
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
