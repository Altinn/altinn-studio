using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using WorkflowEngine.Api.Endpoints;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;

namespace WorkflowEngine.Api.Tests.Endpoints;

public class ReplyEndpointTests
{
    private static readonly ReplyRequest DefaultReplyRequest = new() { Payload = """{"signed": true}""" };

    private static Workflow CreateSuspendedWorkflow(Step step)
    {
        var workflow = new Workflow
        {
            DatabaseId = 1,
            IdempotencyKey = Guid.NewGuid().ToString(),
            OperationId = "test-operation",
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            InstanceInformation = new InstanceInformation
            {
                Org = "ttd",
                App = "test-app",
                InstanceOwnerPartyId = 12345,
                InstanceGuid = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            },
            Status = PersistentItemStatus.Suspended,
            Steps = [step],
        };
        return workflow;
    }

    private static Step CreateReplyAppCommandStep(
        long databaseId = 42,
        PersistentItemStatus status = PersistentItemStatus.Suspended,
        Guid? correlationId = null
    )
    {
        return new Step
        {
            DatabaseId = databaseId,
            IdempotencyKey = Guid.NewGuid().ToString(),
            OperationId = "step-operation",
            ProcessingOrder = 0,
            Command = new Command.ReplyAppCommand("test-command"),
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            Status = status,
            CorrelationId = correlationId,
        };
    }

    private static WorkflowReplies CreateWorkflowReplies(Mock<IEngineRepository> repoMock)
    {
        var scopeMock = new Mock<IServiceScope>();
        scopeMock.Setup(s => s.ServiceProvider.GetService(typeof(IEngineRepository))).Returns(repoMock.Object);

        var scopeFactoryMock = new Mock<IServiceScopeFactory>();
        scopeFactoryMock.Setup(f => f.CreateScope()).Returns(scopeMock.Object);

        return new WorkflowReplies(scopeFactoryMock.Object, TimeProvider.System);
    }

    [Fact]
    public async Task SubmitReply_StepSuspended_StoresReplyAndReturnsOk()
    {
        // Arrange
        var correlationId = Guid.NewGuid();
        var step = CreateReplyAppCommandStep(
            databaseId: 42,
            status: PersistentItemStatus.Suspended,
            correlationId: correlationId
        );
        var workflow = CreateSuspendedWorkflow(step);

        var repoMock = new Mock<IEngineRepository>();
        repoMock
            .Setup(r => r.GetWorkflowByCorrelationId(correlationId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(workflow);

        var workflowReplies = CreateWorkflowReplies(repoMock);

        // Act
        var result = await ReplyRequestHandlers.SubmitReply(
            correlationId,
            DefaultReplyRequest,
            workflowReplies,
            CancellationToken.None
        );

        // Assert
        Assert.IsType<Ok>(result.Result);

        // Verify reply was stored
        repoMock.Verify(r => r.AddReply(It.IsAny<Reply>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SubmitReply_StepStillProcessing_StoresReplyAndReturnsOk()
    {
        // Arrange — the step hasn't been suspended yet (reply arrived before suspension)
        var correlationId = Guid.NewGuid();
        var step = CreateReplyAppCommandStep(
            databaseId: 42,
            status: PersistentItemStatus.Processing,
            correlationId: correlationId
        );
        var workflow = new Workflow
        {
            DatabaseId = 1,
            IdempotencyKey = Guid.NewGuid().ToString(),
            OperationId = "test-operation",
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            InstanceInformation = new InstanceInformation
            {
                Org = "ttd",
                App = "test-app",
                InstanceOwnerPartyId = 12345,
                InstanceGuid = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            },
            Status = PersistentItemStatus.Processing,
            Steps = [step],
        };

        var repoMock = new Mock<IEngineRepository>();
        repoMock
            .Setup(r => r.GetWorkflowByCorrelationId(correlationId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(workflow);

        var workflowReplies = CreateWorkflowReplies(repoMock);

        // Act
        var result = await ReplyRequestHandlers.SubmitReply(
            correlationId,
            DefaultReplyRequest,
            workflowReplies,
            CancellationToken.None
        );

        // Assert — reply accepted
        Assert.IsType<Ok>(result.Result);

        // Verify reply was stored
        repoMock.Verify(r => r.AddReply(It.IsAny<Reply>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SubmitReply_NotReplyAppCommand_Returns400()
    {
        // Arrange — step uses a Noop command instead of ReplyAppCommand
        var correlationId = Guid.NewGuid();
        var step = new Step
        {
            DatabaseId = 42,
            IdempotencyKey = Guid.NewGuid().ToString(),
            OperationId = "step-operation",
            ProcessingOrder = 0,
            Command = new Command.Debug.Noop(),
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            Status = PersistentItemStatus.Suspended,
            CorrelationId = correlationId,
        };
        var workflow = CreateSuspendedWorkflow(step);

        var repoMock = new Mock<IEngineRepository>();
        repoMock
            .Setup(r => r.GetWorkflowByCorrelationId(correlationId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(workflow);

        var workflowReplies = CreateWorkflowReplies(repoMock);

        // Act
        var result = await ReplyRequestHandlers.SubmitReply(
            correlationId,
            DefaultReplyRequest,
            workflowReplies,
            CancellationToken.None
        );

        // Assert — StepNotFound because the step with matching correlationId is not a ReplyAppCommand
        var problem = Assert.IsType<ProblemHttpResult>(result.Result);
        Assert.Equal(404, problem.StatusCode);

        // Verify no reply was stored
        repoMock.Verify(r => r.AddReply(It.IsAny<Reply>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SubmitReply_WorkflowNotFound_Returns404()
    {
        // Arrange
        var correlationId = Guid.NewGuid();
        var repoMock = new Mock<IEngineRepository>();
        repoMock
            .Setup(r => r.GetWorkflowByCorrelationId(correlationId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Workflow?)null);

        var workflowReplies = CreateWorkflowReplies(repoMock);

        // Act
        var result = await ReplyRequestHandlers.SubmitReply(
            correlationId,
            DefaultReplyRequest,
            workflowReplies,
            CancellationToken.None
        );

        // Assert
        var problem = Assert.IsType<ProblemHttpResult>(result.Result);
        Assert.Equal(404, problem.StatusCode);
    }

    [Fact]
    public async Task SubmitReply_StepEnqueued_StoresReplyAndReturnsOk()
    {
        // Arrange — step is Enqueued (hasn't started processing yet)
        var correlationId = Guid.NewGuid();
        var step = CreateReplyAppCommandStep(
            databaseId: 42,
            status: PersistentItemStatus.Enqueued,
            correlationId: correlationId
        );
        var workflow = new Workflow
        {
            DatabaseId = 1,
            IdempotencyKey = Guid.NewGuid().ToString(),
            OperationId = "test-operation",
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            InstanceInformation = new InstanceInformation
            {
                Org = "ttd",
                App = "test-app",
                InstanceOwnerPartyId = 12345,
                InstanceGuid = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            },
            Status = PersistentItemStatus.Enqueued,
            Steps = [step],
        };

        var repoMock = new Mock<IEngineRepository>();
        repoMock
            .Setup(r => r.GetWorkflowByCorrelationId(correlationId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(workflow);

        var workflowReplies = CreateWorkflowReplies(repoMock);

        // Act
        var result = await ReplyRequestHandlers.SubmitReply(
            correlationId,
            DefaultReplyRequest,
            workflowReplies,
            CancellationToken.None
        );

        // Assert — reply accepted
        Assert.IsType<Ok>(result.Result);
        repoMock.Verify(r => r.AddReply(It.IsAny<Reply>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SubmitReply_DuplicateReplyWithSamePayload_ReturnsOk()
    {
        // Arrange
        var correlationId = Guid.NewGuid();
        var step = CreateReplyAppCommandStep(
            databaseId: 42,
            status: PersistentItemStatus.Suspended,
            correlationId: correlationId
        );
        var workflow = CreateSuspendedWorkflow(step);

        var repoMock = new Mock<IEngineRepository>();
        repoMock
            .Setup(r => r.GetWorkflowByCorrelationId(correlationId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(workflow);

        var workflowReplies = CreateWorkflowReplies(repoMock);

        // Act — submit the same reply twice
        var result1 = await ReplyRequestHandlers.SubmitReply(
            correlationId,
            DefaultReplyRequest,
            workflowReplies,
            CancellationToken.None
        );
        var result2 = await ReplyRequestHandlers.SubmitReply(
            correlationId,
            DefaultReplyRequest,
            workflowReplies,
            CancellationToken.None
        );

        // Assert — both succeed
        Assert.IsType<Ok>(result1.Result);
        Assert.IsType<Ok>(result2.Result);

        // Verify reply was stored only once (second call sees in-memory cache)
        repoMock.Verify(r => r.AddReply(It.IsAny<Reply>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SubmitReply_DuplicateReplyWithDifferentPayload_Returns400()
    {
        // Arrange
        var correlationId = Guid.NewGuid();
        var step = CreateReplyAppCommandStep(
            databaseId: 42,
            status: PersistentItemStatus.Suspended,
            correlationId: correlationId
        );
        var workflow = CreateSuspendedWorkflow(step);

        var repoMock = new Mock<IEngineRepository>();
        repoMock
            .Setup(r => r.GetWorkflowByCorrelationId(correlationId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(workflow);

        var workflowReplies = CreateWorkflowReplies(repoMock);

        var firstRequest = new ReplyRequest { Payload = """{"signed": true}""" };
        var conflictingRequest = new ReplyRequest { Payload = """{"signed": false}""" };

        // Act — submit two different replies for the same step
        var result1 = await ReplyRequestHandlers.SubmitReply(
            correlationId,
            firstRequest,
            workflowReplies,
            CancellationToken.None
        );
        var result2 = await ReplyRequestHandlers.SubmitReply(
            correlationId,
            conflictingRequest,
            workflowReplies,
            CancellationToken.None
        );

        // Assert
        Assert.IsType<Ok>(result1.Result);
        var problem = Assert.IsType<ProblemHttpResult>(result2.Result);
        Assert.Equal(400, problem.StatusCode);
    }
}
