using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Moq;
using WorkflowEngine.Commands.Webhook;
using WorkflowEngine.Core.Endpoints;
using WorkflowEngine.Core.Tests.Fixtures;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using Inserted = Microsoft.AspNetCore.Http.HttpResults.Created<WorkflowEngine.Models.WorkflowEnqueueResponse.Accepted.Created>;
using Matched = Microsoft.AspNetCore.Http.HttpResults.Ok<WorkflowEngine.Models.WorkflowEnqueueResponse.Accepted.Existing>;

namespace WorkflowEngine.Core.Tests.Endpoints;

public class EngineEndpointTests
{
    private const string DefaultNamespace = "test-namespace";

    private static CommandDefinition CreateWebhookCommand(string uri) =>
        WebhookCommand.Create(new WebhookCommandData { Uri = uri });

    private static WorkflowEnqueueRequest _defaultWorkflowRequest =>
        new()
        {
            Namespace = DefaultNamespace,
            IdempotencyKey = "default-idempotency-key",
            Workflows =
            [
                new WorkflowRequest
                {
                    OperationId = "op-1",
                    Steps = [new StepRequest { OperationId = "webhook", Command = CreateWebhookCommand("/test") }],
                },
            ],
        };

    // === EnqueueWorkflows Handler Tests ===

    [Fact]
    public async Task Enqueue_Created_Returns201WithRefMap()
    {
        // Arrange
        var workflowRef = "wf-1";
        var workflowId = Guid.NewGuid();
        var workflowNs = "the-org:the-app";
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
                new WorkflowEnqueueResponse.Accepted.Created([
                    new WorkflowEnqueueResponse.WorkflowResult
                    {
                        Ref = workflowRef,
                        DatabaseId = workflowId,
                        Namespace = workflowNs,
                    },
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
        var created = Assert.IsType<Inserted>(result.Result);
        Assert.NotNull(created.Value);
        Assert.Single(created.Value.Workflows);
        Assert.Equal(workflowId, created.Value.Workflows[0].DatabaseId);
        Assert.Equal(workflowRef, created.Value.Workflows[0].Ref);
        Assert.Equal(workflowNs, created.Value.Workflows[0].Namespace);
    }

    [Fact]
    public async Task Enqueue_Existing_Returns200WithRefMap()
    {
        // Arrange
        var workflowRef = "wf-1";
        var workflowId = Guid.NewGuid();
        var workflowNs = "the-org:the-app";
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
                new WorkflowEnqueueResponse.Accepted.Existing([
                    new WorkflowEnqueueResponse.WorkflowResult
                    {
                        Ref = workflowRef,
                        DatabaseId = workflowId,
                        Namespace = workflowNs,
                    },
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
        var ok = Assert.IsType<Matched>(result.Result);
        Assert.NotNull(ok.Value);
        Assert.Single(ok.Value.Workflows);
        Assert.Equal(workflowId, ok.Value.Workflows[0].DatabaseId);
        Assert.Equal(workflowRef, ok.Value.Workflows[0].Ref);
        Assert.Equal(workflowNs, ok.Value.Workflows[0].Namespace);
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
            .ReturnsAsync(new WorkflowEnqueueResponse.Rejected.Duplicate("..."));

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
            .ReturnsAsync(new WorkflowEnqueueResponse.Rejected.Invalid("..."));

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
            Namespace = DefaultNamespace,
            IdempotencyKey = "cycle-key",
            Workflows =
            [
                new WorkflowRequest
                {
                    Ref = "wf-a",
                    OperationId = "op-a",
                    DependsOn = [WorkflowRef.FromRefString("wf-b")],
                    Steps = [new StepRequest { OperationId = "webhook-a", Command = CreateWebhookCommand("/test-a") }],
                },
                new WorkflowRequest
                {
                    Ref = "wf-b",
                    OperationId = "op-b",
                    DependsOn = [WorkflowRef.FromRefString("wf-a")],
                    Steps = [new StepRequest { OperationId = "webhook-b", Command = CreateWebhookCommand("/test-b") }],
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
            .ReturnsAsync(new WorkflowEnqueueResponse.Rejected.Invalid("..."));

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
    public async Task Enqueue_MetadataIsBuiltFromRequest()
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
                new WorkflowEnqueueResponse.Accepted.Created([
                    new WorkflowEnqueueResponse.WorkflowResult
                    {
                        Ref = "wf-1",
                        DatabaseId = Guid.NewGuid(),
                        Namespace = WorkflowNamespace.Default,
                    },
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
        Assert.True(capturedMetadata.CreatedAt > DateTimeOffset.MinValue);
    }

    // === ListActiveWorkflows Handler Tests ===

    [Fact]
    public async Task ListWorkflows_HasActiveWorkflows_ReturnsOk()
    {
        // Arrange
        var step = WorkflowEngineTestFixture.CreateStep(new CommandDefinition { Type = "noop" });
        var workflow = WorkflowEngineTestFixture.CreateWorkflow(step);

        var repositoryMock = new Mock<IEngineRepository>();
        repositoryMock
            .Setup(r =>
                r.GetActiveWorkflowsByCorrelationId(
                    It.IsAny<Guid?>(),
                    It.IsAny<string?>(),
                    It.IsAny<IReadOnlyDictionary<string, string>?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([workflow]);

        // Act
        var result = await EngineRequestHandlers.ListActiveWorkflows(
            DefaultNamespace,
            null,
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
                    It.IsAny<IReadOnlyDictionary<string, string>?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([]);

        // Act
        var result = await EngineRequestHandlers.ListActiveWorkflows(
            DefaultNamespace,
            null,
            null,
            repositoryMock.Object,
            CancellationToken.None
        );

        // Assert
        Assert.IsType<NoContent>(result.Result);
    }

    [Fact]
    public async Task ListWorkflows_UsesNamespaceFromQueryParams()
    {
        // Arrange
        string? capturedNamespace = null;
        var repositoryMock = new Mock<IEngineRepository>();
        repositoryMock
            .Setup(r =>
                r.GetActiveWorkflowsByCorrelationId(
                    It.IsAny<Guid?>(),
                    It.IsAny<string?>(),
                    It.IsAny<IReadOnlyDictionary<string, string>?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<Guid?, string?, IReadOnlyDictionary<string, string>?, CancellationToken>(
                (_, ns, _, _) => capturedNamespace = ns
            )
            .ReturnsAsync([]);

        // Act
        await EngineRequestHandlers.ListActiveWorkflows(
            DefaultNamespace,
            null,
            null,
            repositoryMock.Object,
            CancellationToken.None
        );

        // Assert — handler passes namespace from query to repository
        Assert.Equal(DefaultNamespace, capturedNamespace);
    }

    // === GetWorkflow Handler Tests ===

    [Fact]
    public async Task GetWorkflow_Found_ReturnsOk()
    {
        // Arrange
        var step = WorkflowEngineTestFixture.CreateStep(new CommandDefinition { Type = "noop" });
        var workflow = new Workflow
        {
            OperationId = "test-op",
            IdempotencyKey = "wf-key",
            Namespace = DefaultNamespace,
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

    // === CancelWorkflow Handler Tests ===

    [Fact]
    public async Task CancelWorkflow_ActiveWorkflow_Returns200()
    {
        // Arrange
        var workflowId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;
        var engine = new Mock<IEngine>();
        engine
            .Setup(e => e.CancelWorkflow(workflowId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CancelWorkflowResult.Requested(workflowId, now, CanceledImmediately: true));

        // Act
        var result = await EngineRequestHandlers.CancelWorkflow(workflowId, engine.Object, CancellationToken.None);

        // Assert
        var ok = Assert.IsType<Ok<CancelWorkflowResponse>>(result.Result);
        Assert.NotNull(ok.Value);
        Assert.Equal(workflowId, ok.Value.WorkflowId);
        Assert.True(ok.Value.CanceledImmediately);
    }

    [Fact]
    public async Task CancelWorkflow_NotInTracker_Returns200WithCanceledImmediatelyFalse()
    {
        // Arrange
        var workflowId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;
        var engine = new Mock<IEngine>();
        engine
            .Setup(e => e.CancelWorkflow(workflowId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CancelWorkflowResult.Requested(workflowId, now, CanceledImmediately: false));

        // Act
        var result = await EngineRequestHandlers.CancelWorkflow(workflowId, engine.Object, CancellationToken.None);

        // Assert
        var ok = Assert.IsType<Ok<CancelWorkflowResponse>>(result.Result);
        Assert.NotNull(ok.Value);
        Assert.False(ok.Value.CanceledImmediately);
    }

    [Fact]
    public async Task CancelWorkflow_TerminalWorkflow_Returns409()
    {
        // Arrange
        var workflowId = Guid.NewGuid();
        var engine = new Mock<IEngine>();
        engine
            .Setup(e => e.CancelWorkflow(workflowId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CancelWorkflowResult.TerminalState());

        // Act
        var result = await EngineRequestHandlers.CancelWorkflow(workflowId, engine.Object, CancellationToken.None);

        // Assert
        var conflict = Assert.IsType<Conflict<ProblemDetails>>(result.Result);
        Assert.NotNull(conflict.Value);
        Assert.Equal(StatusCodes.Status409Conflict, conflict.Value.Status);
    }

    [Fact]
    public async Task CancelWorkflow_NotFound_Returns404()
    {
        // Arrange
        var workflowId = Guid.NewGuid();
        var engine = new Mock<IEngine>();
        engine
            .Setup(e => e.CancelWorkflow(workflowId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CancelWorkflowResult.NotFound());

        // Act
        var result = await EngineRequestHandlers.CancelWorkflow(workflowId, engine.Object, CancellationToken.None);

        // Assert
        Assert.IsType<NotFound>(result.Result);
    }

    [Fact]
    public async Task CancelWorkflow_AlreadyCancelling_ReturnsAcceptedWithOriginalTimestamp()
    {
        // Arrange
        var workflowId = Guid.NewGuid();
        var originalTimestamp = DateTimeOffset.UtcNow.AddMinutes(-1);
        var engine = new Mock<IEngine>();
        engine
            .Setup(e => e.CancelWorkflow(workflowId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CancelWorkflowResult.AlreadyRequested(workflowId, originalTimestamp));

        // Act
        var result = await EngineRequestHandlers.CancelWorkflow(workflowId, engine.Object, CancellationToken.None);

        // Assert
        var accepted = Assert.IsType<Accepted<CancelWorkflowResponse>>(result.Result);
        Assert.NotNull(accepted.Value);
        Assert.Equal(workflowId, accepted.Value.WorkflowId);
        Assert.Equal(originalTimestamp, accepted.Value.CancellationRequestedAt);
        Assert.False(accepted.Value.CanceledImmediately);
    }

    // -- Resume Workflow --

    [Fact]
    public async Task ResumeWorkflow_Succeeded_Returns200()
    {
        // Arrange
        var workflowId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;
        var engine = new Mock<IEngine>();
        engine
            .Setup(e => e.ResumeWorkflow(workflowId, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResumeWorkflowResult.Resumed(workflowId, now, []));

        // Act
        var result = await EngineRequestHandlers.ResumeWorkflow(
            workflowId,
            cascade: false,
            engine.Object,
            TestContext.Current.CancellationToken
        );

        // Assert
        var ok = Assert.IsType<Ok<ResumeWorkflowResponse>>(result.Result);
        Assert.NotNull(ok.Value);
        Assert.Equal(workflowId, ok.Value.WorkflowId);
        Assert.Equal(now, ok.Value.ResumedAt);
        Assert.Empty(ok.Value.CascadeResumed);
    }

    [Fact]
    public async Task ResumeWorkflow_WithCascade_Returns200WithCascadeIds()
    {
        // Arrange
        var workflowId = Guid.NewGuid();
        var cascadeId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;
        var engine = new Mock<IEngine>();
        engine
            .Setup(e => e.ResumeWorkflow(workflowId, true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResumeWorkflowResult.Resumed(workflowId, now, [cascadeId]));

        // Act
        var result = await EngineRequestHandlers.ResumeWorkflow(
            workflowId,
            cascade: true,
            engine.Object,
            TestContext.Current.CancellationToken
        );

        // Assert
        var ok = Assert.IsType<Ok<ResumeWorkflowResponse>>(result.Result);
        Assert.NotNull(ok.Value);
        Assert.Single(ok.Value.CascadeResumed);
        Assert.Equal(cascadeId, ok.Value.CascadeResumed[0]);
    }

    [Fact]
    public async Task ResumeWorkflow_NotFound_Returns404()
    {
        // Arrange
        var workflowId = Guid.NewGuid();
        var engine = new Mock<IEngine>();
        engine
            .Setup(e => e.ResumeWorkflow(workflowId, It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResumeWorkflowResult.NotFound());

        // Act
        var result = await EngineRequestHandlers.ResumeWorkflow(
            workflowId,
            cascade: false,
            engine.Object,
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.IsType<NotFound>(result.Result);
    }

    [Fact]
    public async Task ResumeWorkflow_NotResumable_Returns409()
    {
        // Arrange
        var workflowId = Guid.NewGuid();
        var engine = new Mock<IEngine>();
        engine
            .Setup(e => e.ResumeWorkflow(workflowId, It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResumeWorkflowResult.NotResumable(PersistentItemStatus.Completed));

        // Act
        var result = await EngineRequestHandlers.ResumeWorkflow(
            workflowId,
            cascade: false,
            engine.Object,
            TestContext.Current.CancellationToken
        );

        // Assert
        var conflict = Assert.IsType<Conflict<ProblemDetails>>(result.Result);
        Assert.NotNull(conflict.Value);
        Assert.Equal(StatusCodes.Status409Conflict, conflict.Value.Status);
    }
}
