using Microsoft.AspNetCore.Http.HttpResults;
using Moq;
using WorkflowEngine.Api.Endpoints;
using WorkflowEngine.Api.Tests.Fixtures;
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
            .Setup(e => e.EnqueueWorkflow(It.IsAny<EngineRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(EngineResponse.Accept());

        // Act
        var result = await EngineRequestHandlers.Next(
            _defaultRouteParams,
            _defaultProcessNextRequest,
            engineMock.Object,
            TimeProvider.System,
            CancellationToken.None
        );

        // Assert
        Assert.IsType<Ok>(result.Result);
    }

    [Fact]
    public async Task Next_RejectedDuplicate_ReturnsNoContent()
    {
        // Arrange
        var engineMock = new Mock<IEngine>();
        engineMock
            .Setup(e => e.EnqueueWorkflow(It.IsAny<EngineRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(EngineResponse.Reject(EngineResponse.Rejection.Duplicate, "Duplicate workflow"));

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
            .Setup(e => e.EnqueueWorkflow(It.IsAny<EngineRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(EngineResponse.Reject(EngineResponse.Rejection.AtCapacity, "Queue full"));

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
            .Setup(e => e.EnqueueWorkflow(It.IsAny<EngineRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(EngineResponse.Reject(EngineResponse.Rejection.Unavailable, "Engine unavailable"));

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
            .Setup(e => e.EnqueueWorkflow(It.IsAny<EngineRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(EngineResponse.Reject(EngineResponse.Rejection.Invalid, "Invalid request"));

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
            IdempotencyKey = "test-key",
            OperationId = "test-op",
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            InstanceInformation = WorkflowEngineTestFixture.DefaultInstanceInformation,
            Steps =
            [
                new Step
                {
                    IdempotencyKey = "step-1",
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
        Assert.Equal("step-1", ok.Value.Steps[0].Identifier);
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
