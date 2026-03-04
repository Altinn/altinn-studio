using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using WorkflowEngine.Api.Endpoints;
using WorkflowEngine.Api.Tests.Fixtures;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;
using JsonOptions = Microsoft.AspNetCore.Http.Json.JsonOptions;

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
            IdempotencyKey = "default-idempotency-key",
            Workflows =
            [
                new WorkflowRequest
                {
                    OperationId = "op-1",
                    Type = WorkflowType.Generic,
                    Steps = [new StepRequest { Command = new Command.Webhook("/test") }],
                },
            ],
        };

    private static readonly IOptions<JsonOptions> _jsonOptions = CreateJsonOptions();

    private static IOptions<JsonOptions> CreateJsonOptions()
    {
        var options = new JsonOptions();
        options.SerializerOptions.PropertyNameCaseInsensitive = true;
        options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        return Options.Create(options);
    }

    /// <summary>
    /// Creates a fake <see cref="HttpRequest"/> with the given request body serialized as JSON.
    /// </summary>
    private static HttpRequest CreateHttpRequest(WorkflowEnqueueRequest request)
    {
        var json = JsonSerializer.Serialize(request, _jsonOptions.Value.SerializerOptions);
        var bytes = Encoding.UTF8.GetBytes(json);
        var stream = new MemoryStream(bytes);

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Body = stream;
        httpContext.Request.ContentType = "application/json";
        httpContext.Request.ContentLength = bytes.Length;

        return httpContext.Request;
    }

    // === EnqueueWorkflows Handler Tests ===

    [Fact]
    public async Task Enqueue_Accepted_ReturnsOkWithRefMap()
    {
        // Arrange
        var workflowId = Guid.NewGuid();
        var writeBufferMock = new Mock<WorkflowWriteBuffer>(
            Mock.Of<IServiceScopeFactory>(),
            Mock.Of<ILogger<WorkflowWriteBuffer>>(),
            Options.Create(new WorkflowWriteBufferOptions()),
            new AsyncSignal()
        );
        writeBufferMock
            .Setup(wb =>
                wb.EnqueueAsync(
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<WorkflowRequestMetadata>(),
                    It.IsAny<byte[]>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([workflowId]);

        // Act
        var result = await EngineRequestHandlers.EnqueueWorkflows(
            _defaultRouteParams,
            CreateHttpRequest(_defaultWorkflowRequest),
            writeBufferMock.Object,
            TimeProvider.System,
            _jsonOptions,
            CancellationToken.None
        );

        // Assert
        var ok = Assert.IsType<Ok<WorkflowEnqueueResponse.Accepted>>(result.Result);
        Assert.NotNull(ok.Value);
        Assert.Single(ok.Value.Workflows);
        Assert.Equal(workflowId, ok.Value.Workflows[0].DatabaseId);
    }

    [Fact]
    public async Task Enqueue_IdempotencyConflict_Returns409()
    {
        // Arrange
        var writeBufferMock = new Mock<WorkflowWriteBuffer>(
            Mock.Of<IServiceScopeFactory>(),
            Mock.Of<ILogger<WorkflowWriteBuffer>>(),
            Options.Create(new WorkflowWriteBufferOptions()),
            new AsyncSignal()
        );
        writeBufferMock
            .Setup(wb =>
                wb.EnqueueAsync(
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<WorkflowRequestMetadata>(),
                    It.IsAny<byte[]>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new IdempotencyConflictException("default-idempotency-key"));

        // Act
        var result = await EngineRequestHandlers.EnqueueWorkflows(
            _defaultRouteParams,
            CreateHttpRequest(_defaultWorkflowRequest),
            writeBufferMock.Object,
            TimeProvider.System,
            _jsonOptions,
            CancellationToken.None
        );

        // Assert
        var problem = Assert.IsType<ProblemHttpResult>(result.Result);
        Assert.Equal(409, problem.StatusCode);
    }

    [Fact]
    public async Task Enqueue_InvalidReference_Returns400()
    {
        // Arrange
        var writeBufferMock = new Mock<WorkflowWriteBuffer>(
            Mock.Of<IServiceScopeFactory>(),
            Mock.Of<ILogger<WorkflowWriteBuffer>>(),
            Options.Create(new WorkflowWriteBufferOptions()),
            new AsyncSignal()
        );
        writeBufferMock
            .Setup(wb =>
                wb.EnqueueAsync(
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<WorkflowRequestMetadata>(),
                    It.IsAny<byte[]>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new InvalidWorkflowReferenceException("Unknown workflow reference 'wf-missing'"));

        // Act
        var result = await EngineRequestHandlers.EnqueueWorkflows(
            _defaultRouteParams,
            CreateHttpRequest(_defaultWorkflowRequest),
            writeBufferMock.Object,
            TimeProvider.System,
            _jsonOptions,
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
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            IdempotencyKey = "cycle-key",
            Workflows =
            [
                new WorkflowRequest
                {
                    Ref = "wf-a",
                    OperationId = "op-a",
                    Type = WorkflowType.Generic,
                    DependsOn = [WorkflowRef.FromRefString("wf-b")],
                    Steps = [new StepRequest { Command = new Command.Webhook("/test-a") }],
                },
                new WorkflowRequest
                {
                    Ref = "wf-b",
                    OperationId = "op-b",
                    Type = WorkflowType.Generic,
                    DependsOn = [WorkflowRef.FromRefString("wf-a")],
                    Steps = [new StepRequest { Command = new Command.Webhook("/test-b") }],
                },
            ],
        };

        var writeBufferMock = new Mock<WorkflowWriteBuffer>(
            Mock.Of<IServiceScopeFactory>(),
            Mock.Of<ILogger<WorkflowWriteBuffer>>(),
            Options.Create(new WorkflowWriteBufferOptions()),
            new AsyncSignal()
        );

        // Act
        var result = await EngineRequestHandlers.EnqueueWorkflows(
            _defaultRouteParams,
            CreateHttpRequest(request),
            writeBufferMock.Object,
            TimeProvider.System,
            _jsonOptions,
            CancellationToken.None
        );

        // Assert — rejected before the write buffer is called
        var problem = Assert.IsType<ProblemHttpResult>(result.Result);
        Assert.Equal(400, problem.StatusCode);
        writeBufferMock.Verify(
            wb =>
                wb.EnqueueAsync(
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<WorkflowRequestMetadata>(),
                    It.IsAny<byte[]>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task Enqueue_AppCommandWithoutLockToken_Returns400()
    {
        // Arrange — request contains an AppCommand step but no LockToken
        var request = new WorkflowEnqueueRequest
        {
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            IdempotencyKey = "lock-test-key",
            LockToken = null,
            Workflows =
            [
                new WorkflowRequest
                {
                    Ref = "wf-1",
                    OperationId = "op-1",
                    Type = WorkflowType.AppProcessChange,
                    Steps = [new StepRequest { Command = new Command.AppCommand("do-something") }],
                },
            ],
        };

        var writeBufferMock = new Mock<WorkflowWriteBuffer>(
            Mock.Of<IServiceScopeFactory>(),
            Mock.Of<ILogger<WorkflowWriteBuffer>>(),
            Options.Create(new WorkflowWriteBufferOptions()),
            new AsyncSignal()
        );

        // Act
        var result = await EngineRequestHandlers.EnqueueWorkflows(
            _defaultRouteParams,
            CreateHttpRequest(request),
            writeBufferMock.Object,
            TimeProvider.System,
            _jsonOptions,
            CancellationToken.None
        );

        // Assert — rejected before the write buffer is even called
        var problem = Assert.IsType<ProblemHttpResult>(result.Result);
        Assert.Equal(400, problem.StatusCode);
        writeBufferMock.Verify(
            wb =>
                wb.EnqueueAsync(
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<WorkflowRequestMetadata>(),
                    It.IsAny<byte[]>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task Enqueue_AppCommandWithLockToken_ProceedsToWriteBuffer()
    {
        // Arrange — AppCommand step with a LockToken present should reach the write buffer
        var request = new WorkflowEnqueueRequest
        {
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            IdempotencyKey = "lock-test-key",
            LockToken = "some-lock-token",
            Workflows =
            [
                new WorkflowRequest
                {
                    Ref = "wf-1",
                    OperationId = "op-1",
                    Type = WorkflowType.AppProcessChange,
                    Steps = [new StepRequest { Command = new Command.AppCommand("do-something") }],
                },
            ],
        };

        var writeBufferMock = new Mock<WorkflowWriteBuffer>(
            Mock.Of<IServiceScopeFactory>(),
            Mock.Of<ILogger<WorkflowWriteBuffer>>(),
            Options.Create(new WorkflowWriteBufferOptions()),
            new AsyncSignal()
        );
        writeBufferMock
            .Setup(wb =>
                wb.EnqueueAsync(
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<WorkflowRequestMetadata>(),
                    It.IsAny<byte[]>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([Guid.NewGuid()]);

        // Act
        var result = await EngineRequestHandlers.EnqueueWorkflows(
            _defaultRouteParams,
            CreateHttpRequest(request),
            writeBufferMock.Object,
            TimeProvider.System,
            _jsonOptions,
            CancellationToken.None
        );

        // Assert — write buffer was called and returned 200
        writeBufferMock.Verify(
            wb =>
                wb.EnqueueAsync(
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<WorkflowRequestMetadata>(),
                    It.IsAny<byte[]>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        Assert.IsType<Ok<WorkflowEnqueueResponse.Accepted>>(result.Result);
    }

    [Fact]
    public async Task Enqueue_MetadataIsBuiltFromRequestAndRouteParams()
    {
        // Arrange — capture the metadata passed to the write buffer to verify it was built correctly
        WorkflowRequestMetadata? capturedMetadata = null;
        var writeBufferMock = new Mock<WorkflowWriteBuffer>(
            Mock.Of<IServiceScopeFactory>(),
            Mock.Of<ILogger<WorkflowWriteBuffer>>(),
            Options.Create(new WorkflowWriteBufferOptions()),
            new AsyncSignal()
        );
        writeBufferMock
            .Setup(wb =>
                wb.EnqueueAsync(
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<WorkflowRequestMetadata>(),
                    It.IsAny<byte[]>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<WorkflowEnqueueRequest, WorkflowRequestMetadata, byte[], CancellationToken>(
                (_, meta, _, _) => capturedMetadata = meta
            )
            .ReturnsAsync([Guid.NewGuid()]);

        // Act
        await EngineRequestHandlers.EnqueueWorkflows(
            _defaultRouteParams,
            CreateHttpRequest(_defaultWorkflowRequest),
            writeBufferMock.Object,
            TimeProvider.System,
            _jsonOptions,
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

    [Fact]
    public async Task Enqueue_InvalidJsonBody_Returns400()
    {
        // Arrange — provide an invalid JSON body
        var bytes = Encoding.UTF8.GetBytes("not valid json {{{");
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Body = new MemoryStream(bytes);
        httpContext.Request.ContentType = "application/json";
        httpContext.Request.ContentLength = bytes.Length;

        var writeBufferMock = new Mock<WorkflowWriteBuffer>(
            Mock.Of<IServiceScopeFactory>(),
            Mock.Of<ILogger<WorkflowWriteBuffer>>(),
            Options.Create(new WorkflowWriteBufferOptions()),
            new AsyncSignal()
        );

        // Act
        var result = await EngineRequestHandlers.EnqueueWorkflows(
            _defaultRouteParams,
            httpContext.Request,
            writeBufferMock.Object,
            TimeProvider.System,
            _jsonOptions,
            CancellationToken.None
        );

        // Assert
        var problem = Assert.IsType<ProblemHttpResult>(result.Result);
        Assert.Equal(400, problem.StatusCode);
    }

    [Fact]
    public async Task Enqueue_EmptyBody_Returns400()
    {
        // Arrange — provide an empty body
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Body = new MemoryStream([]);
        httpContext.Request.ContentType = "application/json";
        httpContext.Request.ContentLength = 0;

        var writeBufferMock = new Mock<WorkflowWriteBuffer>(
            Mock.Of<IServiceScopeFactory>(),
            Mock.Of<ILogger<WorkflowWriteBuffer>>(),
            Options.Create(new WorkflowWriteBufferOptions()),
            new AsyncSignal()
        );

        // Act
        var result = await EngineRequestHandlers.EnqueueWorkflows(
            _defaultRouteParams,
            httpContext.Request,
            writeBufferMock.Object,
            TimeProvider.System,
            _jsonOptions,
            CancellationToken.None
        );

        // Assert
        var problem = Assert.IsType<ProblemHttpResult>(result.Result);
        Assert.Equal(400, problem.StatusCode);
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

        var workflowGuid = Guid.NewGuid();
        var repositoryMock = new Mock<IEngineRepository>();
        repositoryMock.Setup(r => r.GetWorkflow(workflowGuid, It.IsAny<CancellationToken>())).ReturnsAsync(workflow);

        // Act
        var result = await EngineRequestHandlers.GetWorkflow(
            _defaultRouteParams,
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
            _defaultRouteParams,
            Guid.NewGuid(),
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

        var workflowGuid = Guid.NewGuid();
        var repositoryMock = new Mock<IEngineRepository>();
        repositoryMock.Setup(r => r.GetWorkflow(workflowGuid, It.IsAny<CancellationToken>())).ReturnsAsync(workflow);

        // Act
        var result = await EngineRequestHandlers.GetWorkflow(
            _defaultRouteParams,
            workflowGuid,
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
